import { Request, Response } from 'express';
import { ProductUseCase } from '../../application/use-cases/ProductUseCase';

export class AdminProductController {
  constructor(private productUseCase: ProductUseCase) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const products = await this.productUseCase.getAdminProducts({
        search: req.query.search as string | undefined,
        categoryId: (req.query.categoryId || req.query.category_id) ? Number(req.query.categoryId || req.query.category_id) : undefined,
        status: (req.query.status as any) || 'all',
      });
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.getAdminProductById(Number(req.params.id));

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
      const product = await this.productUseCase.saveProduct(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.saveProduct(req.body, Number(req.params.id));
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  archive = async (req: Request, res: Response) => {
    try {
      const success = await this.productUseCase.archiveProduct(Number(req.params.id));

      if (!success) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json({ message: 'Product archived successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}
