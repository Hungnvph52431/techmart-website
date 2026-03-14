import { Request, Response } from 'express';
import { ProductUseCase } from '../../application/use-cases/ProductUseCase';

export class ProductController {
  constructor(private productUseCase: ProductUseCase) {}

  // 1. LẤY TẤT CẢ SẢN PHẨM (Đã thông mạch lọc Hãng/Danh mục)
getAll = async (req: Request, res: Response) => {
  try {
    // 1. Phải ép kiểu Number tuyệt đối cho phân trang
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const offset = (page - 1) * limit;

    const filters = {
      categorySlug: req.query.categorySlug as string,
      brandSlug: req.query.brandSlug as string,
      search: req.query.search as string,
      isFeatured: req.query.isFeatured === 'true' ? true : undefined,
      status: req.query.status as string,
      limit: limit,   // Chắc chắn là kiểu số (Number)
      offset: offset, // Chắc chắn là kiểu số (Number)
    };

    // 2. Gọi UseCase
    const products = await this.productUseCase.getAllProducts(filters);
    
    // Gửi về Frontend (Frontend của Khanh đã có code xử lý Array nên cứ gửi thẳng products)
    res.json(products);
    
  } catch (error: any) {
    console.error("LỖI TẠI CONTROLLER:", error); // In ra Docker để mình còn soi
    res.status(500).json({ message: error.message });
  }
};

  // 2. LẤY THEO ID
  getById = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.getProductById(Number(req.params.id));
      if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // 3. LẤY THEO SLUG (Cho trang chi tiết)
  getBySlug = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.getProductBySlug(req.params.slug);
      if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // 4. TẠO MỚI
  create = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.createProduct(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  // 5. CẬP NHẬT
  update = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.updateProduct({
        productId: Number(req.params.id),
        ...req.body,
      });
      if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  // 6. XÓA
  delete = async (req: Request, res: Response) => {
    try {
      const success = await this.productUseCase.deleteProduct(Number(req.params.id));
      if (!success) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      res.json({ message: 'Xóa thành công' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}