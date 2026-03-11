import { Brand, CreateBrandDTO, UpdateBrandDTO } from '../entities/Brand';

export interface IBrandRepository {
  findAll(): Promise<Brand[]>;
  findById(brandId: number): Promise<Brand | null>;
  findBySlug(slug: string): Promise<Brand | null>;
  create(brand: CreateBrandDTO): Promise<Brand>;
  update(brand: UpdateBrandDTO): Promise<Brand | null>;
  delete(brandId: number): Promise<boolean>;
}
