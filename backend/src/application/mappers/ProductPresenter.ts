import { Product } from '../../domain/entities/Product';

const toValueMap = (input?: Record<string, any>) => {
  if (!input) {
    return {};
  }

  return Object.entries(input).reduce<Record<string, string>>((acc, [key, value]) => {
    if (Array.isArray(value)) {
      acc[key] = value.join(', ');
    } else if (value === null || value === undefined) {
      acc[key] = '';
    } else {
      acc[key] = String(value);
    }

    return acc;
  }, {});
};

export const toStorefrontProduct = (product: Product) => {
  const images =
    product.images?.map((image) => image.imageUrl) ||
    (product.mainImage ? [product.mainImage] : []);

  return {
    id: product.productId,
    productId: product.productId,
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    price: product.salePrice ?? product.price,
    originalPrice: product.price,
    salePrice: product.salePrice,          // ✅ thêm
    mainImage: product.mainImage || '',    // ✅ thêm
    brand: product.brandName || '',
    brandName: product.brandName || '',    // ✅ thêm
    category: product.categoryName || '',
    stock: product.stockQuantity,
    stockQuantity: product.stockQuantity,  // ✅ thêm
    ratingAvg: product.ratingAvg,          // ✅ thêm
    reviewCount: product.reviewCount,      // ✅ thêm
    images,
    specifications: toValueMap(product.specifications),
    featured: product.isFeatured,
    rating: product.ratingAvg,
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    variants: (product.variants || [])
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        id: variant.variantId,
        variantId: variant.variantId,
        name: variant.variantName,
        sku: variant.sku,
        attributes: toValueMap(variant.attributes),
        price: (product.salePrice ?? product.price) + variant.priceAdjustment,
        stock: variant.stockQuantity,
        image: variant.imageUrl,
      })),
  };
};
