// backend/src/domain/entities/Banner.ts

export type BannerPosition = 'home_slider' | 'home_middle' | 'home_bottom' | 'sidebar';

export interface Banner {
  bannerId: number;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  position: BannerPosition;
  displayOrder: number;
  isActive: boolean;
  validFrom?: Date;
  validTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBannerDTO {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  position: BannerPosition;
  displayOrder?: number;
  isActive?: boolean;
  validFrom?: Date;
  validTo?: Date;
}

export interface UpdateBannerDTO extends Partial<CreateBannerDTO> {
  bannerId: number;
}
