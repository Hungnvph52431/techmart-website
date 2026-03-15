import { Request, Response } from 'express';
import { CategoryUseCase } from '../../application/use-cases/CategoryUseCase';

export class CategoryController {
  constructor(private categoryUseCase: CategoryUseCase) {}

  getAll = async (_req: Request, res: Response) => {
    try {
      const categories = await this.categoryUseCase.getAllCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getTree = async (_req: Request, res: Response) => {
    try {
      const categories = await this.categoryUseCase.getCategoryTree();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const category = await this.categoryUseCase.createCategory(req.body);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const category = await this.categoryUseCase.updateCategory({
        categoryId: Number(req.params.id),
        ...req.body,
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const success = await this.categoryUseCase.deleteCategory(Number(req.params.id));

      if (!success) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json({ message: 'Category deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}
