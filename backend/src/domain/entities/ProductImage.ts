export interface ProductImage {
    imageId: number;
    productId: number;
    imageUrl: string;
    altText?: string;
    displayOrder: number;
    isPrimary: boolean;
    createdAt: Date;
}

export interface CreateProductImageDTO {
    productId: number;
    imageUrl: string;
    altText?: string;
    displayOrder?: number;
    isPrimary?: boolean;
}
