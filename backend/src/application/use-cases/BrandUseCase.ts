import { IBrandRepository } from '../../domain/repositories/IBrandRepository';
import { CreateBrandDTO, UpdateBrandDTO } from '../../domain/entities/Brand';

export class BrandUseCase {
    constructor(private brandRepository: IBrandRepository) { }

    async getAllBrands() {
        return this.brandRepository.findAll();
    }

    async getBrandById(id: number) {
        return this.brandRepository.findById(id);
    }

    async getBrandBySlug(slug: string) {
        return this.brandRepository.findBySlug(slug);
    }

    async createBrand(data: CreateBrandDTO) {
        return this.brandRepository.create(data);
    }

    async updateBrand(data: UpdateBrandDTO) {
        return this.brandRepository.update(data);
    }

    async deleteBrand(id: number) {
        return this.brandRepository.delete(id);
    }
}
