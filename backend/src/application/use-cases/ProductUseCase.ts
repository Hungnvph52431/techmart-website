import { IProductRepository } from '../../domain/repositories/IProductRepository';
import {
  CreateProductDTO,
  ProductStatus,
  SaveProductPayload,
  UpdateProductDTO,
} from '../../domain/entities/Product';

export class ProductUseCase {
  constructor(private productRepository: IProductRepository) {}

  // --- CÁC PHƯƠNG THỨC CHO CLIENT (NGƯỜI MUA HÀNG) ---
  async getAllProducts(filters?: any) {
    // Trả về danh sách sản phẩm hiển thị trên trang chủ hoặc danh sách sản phẩm
    return this.productRepository.findAll(filters);
  }

  async getProductById(id: number) {
    return this.productRepository.findById(id);
  }

  async getProductBySlug(slug: string) {
    return this.productRepository.findBySlug(slug);
  }

  // --- CÁC PHƯƠNG THỨC QUẢN TRỊ (ADMIN) ---
  async getAdminProducts(filters?: {
    search?: string;
    categoryId?: number;
    status?: ProductStatus | 'all';
  }) {
    // Phục vụ danh sách có phân trang và lọc trạng thái trong Admin
    return this.productRepository.findAdminList(filters);
  }

  async getAdminProductById(id: number) {
    return this.productRepository.findAdminById(id);
  }

  async getProductStats() {
    // Cung cấp dữ liệu cho biểu đồ kho hàng trên Dashboard
    return this.productRepository.getStats();
  }

  // --- THAO TÁC DỮ LIỆU ---
  async saveProduct(payload: SaveProductPayload, productId?: number) {
    // Phương thức gộp thông minh: Tự động nhận diện Thêm mới hoặc Cập nhật
    return this.productRepository.save(payload, productId);
  }

  async createProduct(productData: CreateProductDTO) {
    return this.productRepository.create(productData);
  }

  async updateProduct(productData: UpdateProductDTO) {
    return this.productRepository.update(productData);
  }

  async deleteProduct(id: number) {
    return this.productRepository.delete(id);
  }

  async archiveProduct(id: number) {
    // Chuyển sản phẩm vào kho lưu trữ thay vì xóa vĩnh viễn
    return this.productRepository.archive(id);
  }

  async updateStock(id: number, quantity: number) {
    return this.productRepository.updateStock(id, quantity);
  }

  async getVariantById(id: number) {
    // Lấy thông tin biến thể (RAM, Màu sắc) cho trang chi tiết
    return this.productRepository.findVariantById(id);
  }
}