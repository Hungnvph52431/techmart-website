import { IProductRepository, ProductFilters } from '../../domain/repositories/IProductRepository';
import { CreateProductDTO, UpdateProductDTO } from '../../domain/entities/Product';
import { CreateProductImageDTO } from '../../domain/entities/ProductImage';
import { CreateProductVariantDTO, UpdateProductVariantDTO } from '../../domain/entities/ProductVariant';

export class ProductUseCase {
  constructor(private productRepository: IProductRepository) { }

  async getAllProducts(filters?: ProductFilters) {
    return this.productRepository.findAll(filters);
  }

  async getAllProductsPaginated(filters: ProductFilters, page: number, limit: number) {
    return this.productRepository.findAllPaginated(filters, page, limit);
  }

  async getProductById(id: number) {
    return this.productRepository.findById(id);
  }

  async getProductBySlug(slug: string) {
    return this.productRepository.findBySlug(slug);
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

  async updateStock(id: number, quantity: number) {
    return this.productRepository.updateStock(id, quantity);
  }

  // Product Images
  async getProductImages(productId: number) {
    return this.productRepository.findImages(productId);
  }

  async addProductImage(imageData: CreateProductImageDTO) {
    return this.productRepository.addImage(imageData);
  }

  async deleteProductImage(imageId: number) {
    return this.productRepository.deleteImage(imageId);
  }

  // Product Variants
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
