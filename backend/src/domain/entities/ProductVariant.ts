export interface ProductVariant {
    variantId: number;
    productId: number;
    variantName: string;
    sku?: string;
    attributes?: Record<string, any>;
    priceAdjustment: number;
    stockQuantity: number;
    imageUrl?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateProductVariantDTO {
    productId: number;
    variantName: string;
    sku?: string;
    attributes?: Record<string, any>;
    priceAdjustment?: number;
    stockQuantity?: number;
    imageUrl?: string;
    isActive?: boolean;
}

export interface UpdateProductVariantDTO extends Partial<Omit<CreateProductVariantDTO, 'productId'>> {
    variantId: number;
}
