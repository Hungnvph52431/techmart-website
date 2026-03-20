import { IProductRepository, ProductFilters } from '../../domain/repositories/IProductRepository';
import {
  CreateProductDTO,
  ProductStatus,
  SaveProductPayload,
  UpdateProductDTO,
} from '../../domain/entities/Product';
import { CreateProductImageDTO } from '../../domain/entities/ProductImage';
import { CreateProductVariantDTO, UpdateProductVariantDTO } from '../../domain/entities/ProductVariant';

export class ProductUseCase {
  constructor(private productRepository: IProductRepository) { }

  // --- 1. CÁC PHƯƠNG THỨC CHO CLIENT (NGƯỜI MUA HÀNG) ---

  // Sử dụng ProductFilters để hỗ trợ lọc và hiển thị ảnh chuẩn hơn
  async getAllProducts(filters?: ProductFilters) {
    return this.productRepository.findAll(filters);
  }

  // Thêm phân trang để trang chủ load ảnh nhanh hơn
  async getAllProductsPaginated(filters: ProductFilters, page: number, limit: number) {
    return this.productRepository.findAllPaginated(filters, page, limit);
  }

  async getProductById(id: number) {
    return this.productRepository.findById(id);
  }

  async getProductBySlug(slug: string) {
    return this.productRepository.findBySlug(slug);
  }

  // --- 2. CÁC PHƯƠNG THỨC QUẢN TRỊ (ADMIN) ---

  async getAdminProducts(filters?: {
    search?: string;
    categoryId?: number;
    status?: ProductStatus | 'all';
  }) {
    return this.productRepository.findAdminList(filters);
  }

  async getAdminProductById(id: number) {
    return this.productRepository.findAdminById(id);
  }

  async getProductStats() {
    return this.productRepository.getStats();
  }

  // --- 3. THAO TÁC DỮ LIỆU TỔNG QUÁT ---

  async saveProduct(payload: SaveProductPayload, productId?: number) {
    // Giữ lại hàm save gộp của Khanh để tiện dụng
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
    return this.productRepository.archive(id);
  }

  async updateStock(id: number, quantity: number) {
    return this.productRepository.updateStock(id, quantity);
  }

  // --- 4. QUẢN LÝ ẢNH SẢN PHẨM (GIÚP HIỂN THỊ ẢNH) ---

  async getProductImages(productId: number) {
    return this.productRepository.findImages(productId);
  }

  async addProductImage(imageData: CreateProductImageDTO) {
    return this.productRepository.addImage(imageData);
  }

  async deleteProductImage(imageId: number) {
    return this.productRepository.deleteImage(imageId);
  }

  // --- 5. QUẢN LÝ BIẾN THỂ (MÀU SẮC, DUNG LƯỢNG) ---

  async getVariantById(id: number) {
    // Giữ lại để phục vụ trang chi tiết của Khanh
    return this.productRepository.findVariantById(id);
  }

  async getProductVariants(productId: number) {
    return this.productRepository.findVariants(productId);
  }

  async addProductVariant(variantData: CreateProductVariantDTO) {
    return this.productRepository.addVariant(variantData);
  }

  async updateProductVariant(variantData: UpdateProductVariantDTO) {
    return this.productRepository.updateVariant(variantData);
  }

  async deleteProductVariant(variantId: number) {
    return this.productRepository.deleteVariant(variantId);
  }
}
