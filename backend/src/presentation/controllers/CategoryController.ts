import { Request, Response } from 'express';
import { CategoryUseCase } from '../../application/use-cases/CategoryUseCase';

export class CategoryController {
  constructor(private categoryUseCase: CategoryUseCase) { }

  // --- 1. CÁC PHƯƠNG THỨC CHO CLIENT (STOREFRONT) ---

  // Lấy toàn bộ danh sách phẳng
  getAll = async (req: Request, res: Response) => {
    try {
      const categories = await this.categoryUseCase.getAllCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // Lấy danh mục theo cấu trúc cây (Dùng cho Menu TechMart)
  getTree = async (_req: Request, res: Response) => {
    try {
      const categories = await this.categoryUseCase.getCategoryTree();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // Lấy chi tiết một danh mục theo ID
  getById = async (req: Request, res: Response) => {
    try {
      const category = await this.categoryUseCase.getCategoryById(Number(req.params.id));

      if (!category) {
        return res.status(404).json({ message: 'Không tìm thấy danh mục' });
      }

      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // --- 2. CÁC THAO TÁC QUẢN TRỊ (ADMIN) ---

  create = async (req: Request, res: Response) => {
    try {
      const { name, slug } = req.body;

      // Kiểm tra tính hợp lệ dữ liệu từ bản Tuấn Anh
      if (!name || !slug) {
        return res.status(400).json({ message: 'Tên và Slug là bắt buộc' });
      }

      const newCategory = await this.categoryUseCase.createCategory(req.body);
      res.status(201).json(newCategory);
    } catch (error: any) {
      // Dùng mã lỗi 400 cho các lỗi logic nghiệp vụ của Khanh
      res.status(400).json({ message: error.message });
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
        return res.status(404).json({ message: 'Không tìm thấy danh mục để cập nhật' });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const categoryId = Number(req.params.id);
      const success = await this.categoryUseCase.deleteCategory(categoryId);

      if (!success) {
        return res.status(404).json({ message: 'Không tìm thấy danh mục' });
      }

      res.json({ message: 'Xóa danh mục thành công' });
    } catch (error: any) {
      // Xử lý các lỗi "Category still has products" từ UseCase của Khanh
      res.status(400).json({ message: error.message });
    }
  };
}