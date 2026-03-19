// backend/src/domain/repositories/IBannerRepository.ts

import { Banner, CreateBannerDTO, UpdateBannerDTO } from '../entities/Banner';

export interface IBannerRepository {
  findAll(position?: string): Promise<Banner[]>;
  findActive(position?: string): Promise<Banner[]>;
  findById(id: number): Promise<Banner | null>;
  create(data: CreateBannerDTO): Promise<Banner>;
  update(data: UpdateBannerDTO): Promise<Banner | null>;
  delete(id: number): Promise<boolean>;
  updateOrder(id: number, displayOrder: number): Promise<void>;
}
