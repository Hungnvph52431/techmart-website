import { Request, Response } from 'express';
import { ProductUseCase } from '../../application/use-cases/ProductUseCase';
import { toStorefrontProduct } from '../../application/mappers/ProductPresenter';

export class ProductController {
  constructor(private productUseCase: ProductUseCase) { }

  // --- 1. LẤY DANH SÁCH SẢN PHẨM (KẾT HỢP PHÂN TRANG) ---
// backend/src/presentation/controllers/ProductController.ts

getAll = async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 12;

    // TỪ ĐIỂN THÔNG DỊCH category slug
    const categorySlugMap: Record<string, string> = {
      'iphone': 'iphone',
      'laptop': 'laptop',
      'tablet': 'tablet',
      'phu-kien': 'phu-kien',
      'smartwatch': 'dong-ho-thong-minh',
      'tai-nghe': 'tai-nghe',
    };

    // TỪ ĐIỂN THÔNG DỊCH brand slug
    const brandSlugMap: Record<string, string> = {
      'apple': 'apple',
      'samsung': 'samsung',
      'xiaomi': 'xiaomi',
      'oppo': 'oppo',
      'vivo': 'vivo',
      'realme': 'realme',
    };

    const rawCategory = (req.query.categorySlug || req.query.category) as string;
    const rawBrand = (req.query.brandSlug || req.query.brand) as string;

    // Phân biệt: nếu là brand thì dùng brandSlug, nếu là category thì dùng categorySlug
    const categoryKey = rawCategory?.toLowerCase();
    const brandKey = rawBrand?.toLowerCase();

    const resolvedCategorySlug = categoryKey
      ? (categorySlugMap[categoryKey] || categoryKey)
      : undefined;

    const resolvedBrandSlug = brandKey
      ? (brandSlugMap[brandKey] || brandKey)
      : undefined;

    const filters = {
      categorySlug: resolvedCategorySlug,
      brandSlug: resolvedBrandSlug,
      search: req.query.search as string || undefined,
      isFeatured: req.query.featured === 'true' || req.query.isFeatured === 'true',
      isNew: req.query.isNew === 'true',
      isBestseller: req.query.isBestseller === 'true',
      onSale: req.query.onSale === 'true',
      status: req.query.status as string || undefined,
      ram:      req.query.ram      as string || undefined,
      storage:  req.query.storage  as string || undefined,
      chip:     req.query.chip     as string || undefined,
      need:     req.query.need     as string || undefined,
      feature:  req.query.feature  as string || undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    };

    if (page) {
      const result = await this.productUseCase.getAllProductsPaginated(filters, page, limit);
      return res.json(result);
    }
    const products = await this.productUseCase.getAllProducts(filters);
    res.json(products);
  } catch (error: any) {
    console.error("LỖI 500 TẠI CONTROLLER:", error.message);
    res.status(500).json({ message: "Lỗi hệ thống khi tải sản phẩm" });
  }
};
  // --- 2. TÌM CHI TIẾT (ID & SLUG) ---

  getById = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.getProductById(Number(req.params.id));
      if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

      res.json(toStorefrontProduct(product));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getBySlug = async (req: Request, res: Response) => {
    try {
      // Giữ lại log để Khanh dễ debug lỗi 404
      console.log(">>> Backend đang tìm sản phẩm với Slug:", req.params.slug);
      const product = await this.productUseCase.getProductBySlug(req.params.slug);

      if (!product) {
        console.log("!!! KHÔNG TÌM THẤY sản phẩm trong DB với slug này");
        return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      }

      res.json(toStorefrontProduct(product));
    } catch (error: any) {
      console.error("LỖI TẠI CONTROLLER getBySlug:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // --- 3. CÁC THAO TÁC QUẢN TRỊ (ADMIN) ---

  getStats = async (_req: Request, res: Response) => {
    try {
      const stats = await this.productUseCase.getProductStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

 create = async (req: Request, res: Response) => {
  try {
    const { name, slug, sku, categoryId, price } = req.body;

    // SỬA: Kiểm tra undefined/null thay vì dùng ! để cho phép giá trị 0
    if (!name || !slug || !sku || categoryId === undefined || price === undefined) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (Tên, Slug, SKU, Category, Giá)' });
    }

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
      const result = await this.productUseCase.deleteProduct(Number(req.params.id));
      if (result.action === 'deactivated') {
        return res.json({ message: 'Sản phẩm đã chuyển sang Ngừng bán', action: 'deactivated' });
      }
      res.json({ message: 'Đã xóa sản phẩm vĩnh viễn', action: 'deleted' });
    } catch (error: any) {
      if (error.message.includes('Không tìm thấy')) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('Không thể xóa sản phẩm')) {
        return res.status(409).json({ message: error.message, code: 'PRODUCT_IN_USE' });
      }
      res.status(500).json({ message: error.message });
    }
  };

  // Validate giỏ hàng: nhận danh sách productIds, trả về status & stock
  validateCart = async (req: Request, res: Response) => {
    try {
      const { productIds } = req.body;
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.json([]);
      }
      const results = await Promise.all(
        productIds.map(async (id: number) => {
          const product = await this.productUseCase.getProductById(id);
          if (!product) return { productId: id, available: false, reason: 'not_found' };
          if (product.status === 'inactive') return { productId: id, available: false, reason: 'inactive', name: product.name };
          if (product.stockQuantity <= 0) return { productId: id, available: false, reason: 'out_of_stock', name: product.name };
          return { productId: id, available: true, status: product.status, stockQuantity: product.stockQuantity, price: product.price, salePrice: product.salePrice };
        })
      );
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // --- 4. QUẢN LÝ ẢNH SẢN PHẨM (TỪ BẢN TUẤN ANH) ---

  getImages = async (req: Request, res: Response) => {
    try {
      const images = await this.productUseCase.getProductImages(Number(req.params.id));
      res.json(images);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  addImage = async (req: Request, res: Response) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) return res.status(400).json({ message: 'Đường dẫn ảnh là bắt buộc' });

      const image = await this.productUseCase.addProductImage({
        productId: Number(req.params.id),
        ...req.body,
      });
      res.status(201).json(image);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  deleteImage = async (req: Request, res: Response) => {
    try {
      const success = await this.productUseCase.deleteProductImage(Number(req.params.imageId));
      if (!success) return res.status(404).json({ message: 'Không tìm thấy ảnh' });
      res.json({ message: 'Xóa ảnh thành công' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // --- 5. QUẢN LÝ BIẾN THỂ - RAM/MÀU SẮC (TỪ BẢN TUẤN ANH) ---

  getVariants = async (req: Request, res: Response) => {
    try {
      const variants = await this.productUseCase.getProductVariants(Number(req.params.id));
      res.json(variants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  addVariant = async (req: Request, res: Response) => {
    try {
      const { variantName } = req.body;
      if (!variantName) return res.status(400).json({ message: 'Tên biến thể là bắt buộc' });

      const variant = await this.productUseCase.addProductVariant({
        productId: Number(req.params.id),
        ...req.body,
      });
      res.status(201).json(variant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  updateVariant = async (req: Request, res: Response) => {
    try {
      const variant = await this.productUseCase.updateProductVariant({
        variantId: Number(req.params.variantId),
        ...req.body,
      });
      if (!variant) return res.status(404).json({ message: 'Không tìm thấy biến thể' });
      res.json(variant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  deleteVariant = async (req: Request, res: Response) => {
    try {
      const success = await this.productUseCase.deleteProductVariant(Number(req.params.variantId));
      if (!success) return res.status(404).json({ message: 'Không tìm thấy biến thể' });
      res.json({ message: 'Xóa biến thể thành công' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}
