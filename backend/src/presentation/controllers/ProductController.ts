import { Request, Response } from 'express';
import { ProductUseCase } from '../../application/use-cases/ProductUseCase';
import { toStorefrontProduct } from '../../application/mappers/ProductPresenter';

export class ProductController {
  constructor(private productUseCase: ProductUseCase) {}

  // 1. LẤY TẤT CẢ SẢN PHẨM (Kết hợp Phân trang & Bộ lọc mở rộng)
  getAll = async (req: Request, res: Response) => {
    try {
      // Logic phân trang từ bản HEAD
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const offset = (page - 1) * limit;

      // Bộ lọc kết hợp từ cả 2 bản
      const filters = {
        // Lọc theo ID hoặc Slug
        categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
        categorySlug: req.query.categorySlug as string,
        brandId: req.query.brandId ? Number(req.query.brandId) : undefined,
        brandSlug: req.query.brandSlug as string,
        
        // Lọc theo khoảng giá
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        
        // Lọc theo trạng thái đặc biệt
        search: req.query.search as string,
        isFeatured: req.query.featured === 'true' || req.query.isFeatured === 'true' ? true : undefined,
        isNew: req.query.isNew === 'true' ? true : undefined,
        isBestseller: req.query.isBestseller === 'true' ? true : undefined,
        
        status: req.query.status as string,
        limit: limit,
        offset: offset,
      };

      const products = await this.productUseCase.getAllProducts(filters);
      
      // Sử dụng Mapper để định dạng lại dữ liệu cho Storefront
      res.json(products.map(toStorefrontProduct));
    } catch (error: any) {
      console.error("LỖI TẠI PRODUCT CONTROLLER:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // 2. LẤY THEO ID
  getById = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.getProductById(Number(req.params.id));
      if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      
      res.json(toStorefrontProduct(product));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // 3. LẤY THEO SLUG (Cho trang chi tiết sản phẩm)
  getBySlug = async (req: Request, res: Response) => {
  try {
    console.log(">>> Backend đang tìm sản phẩm với Slug:", req.params.slug); // Thêm dòng này
    const product = await this.productUseCase.getProductBySlug(req.params.slug);
    
    if (!product) {
      console.log("!!! KHÔNG TÌM THẤY sản phẩm trong DB với slug này"); // Thêm dòng này
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    res.json(toStorefrontProduct(product));
  } catch (error: any) {
    console.error("LỖI TẠI CONTROLLER getBySlug:", error);
    res.status(500).json({ message: error.message });
  }
};

  // 4. LẤY THỐNG KÊ (Stats)
  getStats = async (_req: Request, res: Response) => {
    try {
      const stats = await this.productUseCase.getProductStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  // 5. CÁC THAO TÁC QUẢN TRỊ (Giữ lại từ bản HEAD)
  create = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.createProduct(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

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