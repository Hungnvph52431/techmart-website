import { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../entities/Category';

export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  findById(categoryId: number): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  findByParentId(parentId: number | null): Promise<Category[]>;
  
  // --- CÁC PHƯƠNG THỨC KIỂM TRA RÀNG BUỘC ---
  /** Kiểm tra xem danh mục có danh mục con hay không */
  hasChildren(categoryId: number): Promise<boolean>;
  
  /** Kiểm tra xem danh mục có chứa sản phẩm nào không */
  hasProducts(categoryId: number): Promise<boolean>;

  // --- THAO TÁC DỮ LIỆU ---
  create(category: CreateCategoryDTO): Promise<Category>;
  update(category: UpdateCategoryDTO): Promise<Category | null>;
  delete(categoryId: number): Promise<boolean>;

  /** Chuyển tất cả sản phẩm từ danh mục này sang danh mục khác */
  moveProductsToCategory(fromCategoryId: number, toCategoryId: number): Promise<number>;

  /** Tìm hoặc tạo danh mục "Không xác định" */
  findOrCreateUncategorized(): Promise<Category>;
}