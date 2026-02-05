import { Request, Response } from 'express';
import { ProductUseCase } from '../../application/use-cases/ProductUseCase';

export class ProductController {
  constructor(private productUseCase: ProductUseCase) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const filters = {
        categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
        brandId: req.query.brandId ? Number(req.query.brandId) : undefined,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        search: req.query.search as string,
        isFeatured: req.query.featured === 'true' ? true : req.query.featured === 'false' ? false : undefined,
        isNew: req.query.isNew === 'true' ? true : req.query.isNew === 'false' ? false : undefined,
        isBestseller: req.query.isBestseller === 'true' ? true : req.query.isBestseller === 'false' ? false : undefined,
        status: req.query.status as string,
      };

      const products = await this.productUseCase.getAllProducts(filters);
      res.json(products);
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

      res.json(product);
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

      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

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

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const success = await this.productUseCase.deleteProduct(Number(req.params.id));

      if (!success) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json({ message: 'Product deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}
