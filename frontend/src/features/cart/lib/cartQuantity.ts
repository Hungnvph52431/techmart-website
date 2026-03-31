import type { CartItem, Product, ProductVariant } from '@/types';

type VariantLike = Partial<ProductVariant> & {
  id?: number;
  stock?: number;
};

export const CART_QUANTITY_EXCEEDED_MESSAGE =
  'Đã vượt quá số lượng sản phẩm có trong giỏ hàng!';

export const getCartSelectionKey = (
  productId: number,
  selectedVariantId?: number | null
) => {
  return selectedVariantId != null ? `${productId}-${selectedVariantId}` : `${productId}`;
};

export const matchesCartSelection = (
  item: Pick<CartItem, 'product' | 'selectedVariantId'>,
  productId: number,
  selectedVariantId?: number | null
) => {
  return (
    item.product.productId === productId &&
    (item.selectedVariantId ?? undefined) === (selectedVariantId ?? undefined)
  );
};

export const getCartItemStockLimit = (item: CartItem) => {
  if (item.selectedVariantStock != null && item.selectedVariantStock > 0) {
    return item.selectedVariantStock;
  }

  return item.product.stockQuantity;
};

const getVariantId = (selectedVariant?: VariantLike | null) => {
  if (!selectedVariant) {
    return undefined;
  }

  return selectedVariant.variantId ?? selectedVariant.id;
};

export const getProductPurchaseStockLimit = (
  product: Pick<Product, 'stockQuantity'>,
  selectedVariant?: VariantLike | null
) => {
  const variantStock = selectedVariant
    ? Number(selectedVariant.stockQuantity ?? selectedVariant.stock ?? 0)
    : 0;
  const productStock = Number(product.stockQuantity ?? 0);

  return selectedVariant ? (variantStock > 0 ? variantStock : productStock) : productStock;
};

export const getCartSelectionQuantity = (
  items: CartItem[],
  productId: number,
  selectedVariantId?: number | null
) => {
  const cartItem = items.find((item) =>
    matchesCartSelection(item, productId, selectedVariantId)
  );

  return cartItem ? cartItem.quantity : 0;
};

export const getRemainingProductQuantity = (
  items: CartItem[],
  product: Pick<Product, 'productId' | 'stockQuantity'>,
  selectedVariant?: VariantLike | null
) => {
  const stockLimit = getProductPurchaseStockLimit(product, selectedVariant);
  const cartQuantity = getCartSelectionQuantity(
    items,
    product.productId,
    getVariantId(selectedVariant)
  );

  return Math.max(0, stockLimit - cartQuantity);
};

export const clampCartItemQuantity = (item: CartItem, quantity: number) => {
  const stockLimit = getCartItemStockLimit(item);

  if (quantity <= 0) {
    return 0;
  }

  return quantity > stockLimit ? stockLimit : quantity;
};
