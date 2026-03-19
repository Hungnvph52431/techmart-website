// frontend/src/types/banner.ts

export type BannerPosition = 'home_slider' | 'home_middle' | 'home_bottom' | 'sidebar';

export interface Banner {
  bannerId: number;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  position: BannerPosition;
  displayOrder: number;
  isActive: boolean;
  validFrom?: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
}
