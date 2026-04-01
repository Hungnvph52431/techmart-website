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

  async getAvailableProductStock(productId: number) {
    return this.productRepository.getAvailableProductStock(productId);
  }

  async getAvailableVariantStock(variantId: number) {
    return this.productRepository.getAvailableVariantStock(variantId);
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
    // Lấy thông tin sản phẩm để kiểm tra trạng thái
    const product = await this.productRepository.findById(id);
    if (!product) throw new Error('Không tìm thấy sản phẩm');

    // Nếu đang active → chuyển sang inactive (ngừng bán)
    if (product.status !== 'inactive') {
      // Kiểm tra sản phẩm đang được sử dụng
      const usage = await this.productRepository.checkProductInUse(id);
      if (usage.inCart > 0 || usage.inPendingOrders > 0) {
        const reasons: string[] = [];
        if (usage.inCart > 0) reasons.push(`đang nằm trong giỏ hàng của ${usage.inCart} khách`);
        if (usage.inPendingOrders > 0) reasons.push(`đang có ${usage.inPendingOrders} đơn hàng chờ xử lý`);
        throw new Error(
          `Không thể xóa sản phẩm vì ${reasons.join(' và ')}. Sản phẩm sẽ được chuyển sang trạng thái "Ngừng bán".`
        );
      }
      await this.productRepository.delete(id);
      return { action: 'deactivated' };
    }

    // Đã inactive → xóa hẳn khỏi database
    await this.productRepository.hardDelete(id);
    return { action: 'deleted' };
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
