// backend/src/application/use-cases/BannerUseCase.ts

import { IBannerRepository } from '../../domain/repositories/IBannerRepository';
import { Banner, CreateBannerDTO, UpdateBannerDTO } from '../../domain/entities/Banner';

export class BannerUseCase {
  constructor(private bannerRepository: IBannerRepository) {}

  async getAllBanners(position?: string): Promise<Banner[]> {
    return this.bannerRepository.findAll(position);
  }

  async getActiveBanners(position?: string): Promise<Banner[]> {
    return this.bannerRepository.findActive(position);
  }

  async getBannerById(id: number): Promise<Banner | null> {
    return this.bannerRepository.findById(id);
  }

  async createBanner(data: CreateBannerDTO): Promise<Banner> {
    if (!data.title || !data.imageUrl || !data.position) {
      throw new Error('Thiếu thông tin bắt buộc (Tiêu đề, Ảnh, Vị trí)');
    }
    return this.bannerRepository.create(data);
  }

  async updateBanner(data: UpdateBannerDTO): Promise<Banner | null> {
    const exists = await this.bannerRepository.findById(data.bannerId);
    if (!exists) throw new Error('Không tìm thấy banner');
    return this.bannerRepository.update(data);
  }

  async deleteBanner(id: number): Promise<boolean> {
    return this.bannerRepository.delete(id);
  }

  async updateBannerOrder(id: number, displayOrder: number): Promise<void> {
    return this.bannerRepository.updateOrder(id, displayOrder);
  }
}
