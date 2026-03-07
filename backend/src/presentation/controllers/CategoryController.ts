import { Request, Response } from 'express';
import { CategoryUseCase } from '../../application/use-cases/CategoryUseCase';

export class CategoryController {
  constructor(private categoryUseCase: CategoryUseCase) { }

  getAll = async (req: Request, res: Response) => {
    try {
      const categories = await this.categoryUseCase.getAllCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const category = await this.categoryUseCase.getCategoryById(Number(req.params.id));

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { name, slug } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ message: 'Name and slug are required' });
      }

      const newCategory = await this.categoryUseCase.createCategory(req.body);
      res.status(201).json(newCategory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const categoryId = Number(req.params.id);

      const updated = await this.categoryUseCase.updateCategory({
        categoryId,
        ...req.body,
      });

      if (!updated) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const categoryId = Number(req.params.id);
      const success = await this.categoryUseCase.deleteCategory(categoryId);

      if (!success) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json({ message: 'Category deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}
