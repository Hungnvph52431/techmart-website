import { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../entities/Category';

export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  findById(categoryId: number): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  findByParentId(parentId: number | null): Promise<Category[]>;
  create(category: CreateCategoryDTO): Promise<Category>;
  update(category: UpdateCategoryDTO): Promise<Category | null>;
  delete(categoryId: number): Promise<boolean>;
}
