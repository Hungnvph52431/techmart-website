// backend/src/domain/repositories/ICategoryRepository.ts

import { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../entities/Category';

export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  findById(categoryId: number): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  findByParentId(parentId: number | null): Promise<Category[]>;
  findDeleted(): Promise<Category[]>; 
  hasChildren(categoryId: number): Promise<boolean>;
  hasProducts(categoryId: number): Promise<boolean>;

  create(category: CreateCategoryDTO): Promise<Category>;
  update(category: UpdateCategoryDTO): Promise<Category | null>;
  delete(categoryId: number): Promise<boolean>;

  // ✅ THÊM 2 method còn thiếu
  isDeleted(categoryId: number): Promise<boolean>;
  softDelete(categoryId: number): Promise<boolean>;
  restore(categoryId: number): Promise<boolean>;

  moveProductsToCategory(fromCategoryId: number, toCategoryId: number): Promise<number>;
  moveChildrenToCategory(fromParentId: number, toParentId: number | null): Promise<number>;
  findOrCreateUncategorized(): Promise<Category>;
}