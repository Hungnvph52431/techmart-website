import { Request, Response } from 'express';
import { ProductUseCase } from '../../application/use-cases/ProductUseCase';
import { toStorefrontProduct } from '../../application/mappers/ProductPresenter';

export class ProductController {
  constructor(private productUseCase: ProductUseCase) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const filters = {
        categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
        category: req.query.category as string | undefined,
        brandId: req.query.brandId ? Number(req.query.brandId) : undefined,
        brand: req.query.brand as string | undefined,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        search: req.query.search as string,
        isFeatured: req.query.featured === 'true' ? true : req.query.featured === 'false' ? false : undefined,
        isNew: req.query.isNew === 'true' ? true : req.query.isNew === 'false' ? false : undefined,
        isBestseller: req.query.isBestseller === 'true' ? true : req.query.isBestseller === 'false' ? false : undefined,
        status: req.query.status as string,
        sort: req.query.sort as string | undefined,
      };

      const products = await this.productUseCase.getAllProducts(filters);
      res.json(products.map(toStorefrontProduct));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.getProductById(Number(req.params.id));
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(toStorefrontProduct(product));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getBySlug = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.getProductBySlug(req.params.slug);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(toStorefrontProduct(product));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getStats = async (_req: Request, res: Response) => {
    try {
      const stats = await this.productUseCase.getProductStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
