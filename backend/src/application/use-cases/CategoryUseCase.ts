import {
  Category,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '../../domain/entities/Category';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';

// Định nghĩa kiểu dữ liệu cho cây danh mục (Giữ lại từ bản của Khanh)
interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export class CategoryUseCase {
  constructor(private categoryRepository: ICategoryRepository) {}

  // --- 1. CÁC HÀM LẤY DỮ LIỆU ---

  async getAllCategories() {
    return this.categoryRepository.findAll();
  }

  // Lấy danh mục theo ID (Thêm từ bản của Tuấn Anh)
  async getCategoryById(id: number) {
    return this.categoryRepository.findById(id);
  }

  // Lấy danh mục theo Slug (Thêm từ bản của Tuấn Anh)
  async getCategoryBySlug(slug: string) {
    return this.categoryRepository.findBySlug(slug);
  }

  // Lấy danh mục con theo ParentID (Thêm từ bản của Tuấn Anh)
  async getCategoriesByParentId(parentId: number | null) {
    return this.categoryRepository.findByParentId(parentId);
  }

  // Logic tạo cây thư mục (Giữ lại từ bản của Khanh)
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    const categories = await this.categoryRepository.findAll();
    const nodeMap = new Map<number, CategoryTreeNode>();

    categories.forEach((category) => {
      nodeMap.set(category.categoryId, { ...category, children: [] });
    });

    const roots: CategoryTreeNode[] = [];

    nodeMap.forEach((node) => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  // --- 2. CÁC HÀM THAO TÁC DỮ LIỆU (Ưu tiên logic an toàn của Khanh) ---

  async createCategory(data: CreateCategoryDTO) {
    // Khanh đã thêm validation rất tốt, nên giữ lại
    await this.validateCategoryPayload(data);
    return this.categoryRepository.create(data);
  }

  async updateCategory(data: UpdateCategoryDTO) {
    // Kiểm tra logic trước khi cập nhật
    await this.validateCategoryPayload(data, data.categoryId);
    return this.categoryRepository.update(data);
  }

  async deleteCategory(categoryId: number) {
    // Không cho xóa nếu còn danh mục con
    const hasChildren = await this.categoryRepository.hasChildren(categoryId);
    if (hasChildren) {
      throw new Error('Category still has child categories');
    }

    // Nếu còn sản phẩm → chuyển sang danh mục "Không xác định" thay vì chặn
    const hasProducts = await this.categoryRepository.hasProducts(categoryId);
    if (hasProducts) {
      const uncategorized = await this.categoryRepository.findOrCreateUncategorized();
      await this.categoryRepository.moveProductsToCategory(categoryId, uncategorized.categoryId);
    }

    return this.categoryRepository.delete(categoryId);
  }

  // --- 3. LOGIC KIỂM TRA RÀNG BUỘC (PRIVATE) ---

  private async validateCategoryPayload(
    data: Partial<CreateCategoryDTO>,
    currentCategoryId?: number
  ) {
    // Kiểm tra trùng Slug
    if (data.slug) {
      const categoryBySlug = await this.categoryRepository.findBySlug(data.slug);
      if (categoryBySlug && categoryBySlug.categoryId !== currentCategoryId) {
        throw new Error('Category slug already exists');
      }
    }

    // Kiểm tra cha-con để tránh vòng lặp vô tận
    if (data.parentId !== undefined && data.parentId !== null) {
      if (data.parentId === currentCategoryId) {
        throw new Error('Category cannot be its own parent');
      }

      const parent = await this.categoryRepository.findById(data.parentId);
      if (!parent) {
        throw new Error('Parent category not found');
      }

      if (currentCategoryId) {
        const categories = await this.categoryRepository.findAll();
        const descendants = this.collectDescendantIds(categories, currentCategoryId);
        if (descendants.has(data.parentId)) {
          throw new Error('Category parent cannot be a descendant');
        }
      }
    }
  }

  private collectDescendantIds(categories: Category[], rootId: number): Set<number> {
    const descendants = new Set<number>();
    const stack = categories
      .filter((category) => category.parentId === rootId)
      .map((category) => category.categoryId);

    while (stack.length > 0) {
      const current = stack.pop()!;
      descendants.add(current);

      categories
        .filter((category) => category.parentId === current)
        .forEach((child) => stack.push(child.categoryId));
    }

    return descendants;
  }
}