import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { CreateProductDTO, UpdateProductDTO } from '../../domain/entities/Product';

export class ProductUseCase {
  constructor(private productRepository: IProductRepository) {}

  async getAllProducts(filters?: any) {
    return await this.productRepository.findAll(filters);
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
}
