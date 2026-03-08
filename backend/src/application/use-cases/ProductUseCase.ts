import { IProductRepository } from '../../domain/repositories/IProductRepository';
import {
  CreateProductDTO,
  ProductStatus,
  SaveProductPayload,
  UpdateProductDTO,
} from '../../domain/entities/Product';

export class ProductUseCase {
  constructor(private productRepository: IProductRepository) {}

  async getAllProducts(filters?: any) {
    return this.productRepository.findAll(filters);
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

  async saveProduct(payload: SaveProductPayload, productId?: number) {
    return this.productRepository.save(payload, productId);
  }

  async archiveProduct(id: number) {
    return this.productRepository.archive(id);
  }

  async getVariantById(id: number) {
    return this.productRepository.findVariantById(id);
  }
}
