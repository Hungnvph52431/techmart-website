import { Brand } from '../../domain/entities/Brand';
import { IBrandRepository } from '../../domain/repositories/IBrandRepository';

export class BrandUseCase {
  constructor(private brandRepository: IBrandRepository) {}

  async getAllActiveBrands(): Promise<Brand[]> {
    const brands = await this.brandRepository.findAll();
    return brands.filter((b) => b.isActive);
  }
}
