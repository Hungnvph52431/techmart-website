import {
  Category,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '../../domain/entities/Category';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';

interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export class CategoryUseCase {
  constructor(private categoryRepository: ICategoryRepository) {}

  async getAllCategories() {
    return this.categoryRepository.findAll();
  }

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

  async createCategory(data: CreateCategoryDTO) {
    await this.validateCategoryPayload(data);
    return this.categoryRepository.create(data);
  }

  async updateCategory(data: UpdateCategoryDTO) {
    await this.validateCategoryPayload(data, data.categoryId);
    return this.categoryRepository.update(data);
  }

  async deleteCategory(categoryId: number) {
    const hasChildren = await this.categoryRepository.hasChildren(categoryId);
    if (hasChildren) {
      throw new Error('Category still has child categories');
    }

    const hasProducts = await this.categoryRepository.hasProducts(categoryId);
    if (hasProducts) {
      throw new Error('Category still has products');
    }

    return this.categoryRepository.delete(categoryId);
  }

  private async validateCategoryPayload(
    data: Partial<CreateCategoryDTO>,
    currentCategoryId?: number
  ) {
    if (data.slug) {
      const categoryBySlug = await this.categoryRepository.findBySlug(data.slug);
      if (categoryBySlug && categoryBySlug.categoryId !== currentCategoryId) {
        throw new Error('Category slug already exists');
      }
    }

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
