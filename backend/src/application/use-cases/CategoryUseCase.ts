import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { CreateCategoryDTO, UpdateCategoryDTO } from '../../domain/entities/Category';

export class CategoryUseCase {
    constructor(private categoryRepository: ICategoryRepository) { }

    async getAllCategories() {
        return this.categoryRepository.findAll();
    }

    async getCategoryById(id: number) {
        return this.categoryRepository.findById(id);
    }

    async getCategoryBySlug(slug: string) {
        return this.categoryRepository.findBySlug(slug);
    }

    async getCategoriesByParent(parentId: number | null) {
        return this.categoryRepository.findByParentId(parentId);
    }

    async createCategory(categoryData: CreateCategoryDTO) {
        return this.categoryRepository.create(categoryData);
    }

    async updateCategory(categoryData: UpdateCategoryDTO) {
        return this.categoryRepository.update(categoryData);
    }

    async deleteCategory(id: number) {
        return this.categoryRepository.delete(id);
    }
}
