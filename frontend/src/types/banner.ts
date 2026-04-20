export interface Banner {
  id: string;
  bannerId?: string;
  title: string;
  imageUrl: string;
  link?: string;
  linkUrl?: string;
  isActive: boolean;
  order?: number;
  type?: string;
}