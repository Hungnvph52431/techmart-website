export interface Brand {
  brandId: number;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandDTO {
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateBrandDTO extends Partial<CreateBrandDTO> {
  brandId: number;
}
