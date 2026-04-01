import { create } from 'zustand';
import type { CartItem, Product } from '@/types';
import { clampCartItemQuantity } from '@/features/cart/lib/cartQuantity';

interface CheckoutSessionState {
  directItems: CartItem[];
  startDirectCheckout: (
    product: Product,
    quantity?: number,
    selectedVariantId?: number
  ) => void;
  clearDirectCheckout: () => void;
}

const buildDirectCheckoutItem = (
  product: Product,
  quantity = 1,
  selectedVariantId?: number
): CartItem | null => {
  const variant = selectedVariantId && product.variants
    ? product.variants.find(
        (item) =>
          item.variantId === selectedVariantId || (item as any).id === selectedVariantId
      )
    : undefined;
  const basePrice = Number(product.salePrice || product.price);
  const variantName = variant?.variantName || (variant as any)?.name;
  const variantPrice = (variant as any)?.price != null
    ? Number((variant as any).price)
    : variant?.priceAdjustment != null
      ? basePrice + Number(variant.priceAdjustment)
      : basePrice;
  const variantStock = variant
    ? Number(
        variant.availableStockQuantity ??
          variant.stockQuantity ??
          (variant as any)?.stock ??
          0
      )
    : 0;

  const nextItem: CartItem = {
    product,
    quantity,
    selectedVariantId,
    selectedVariantName: variantName,
    selectedVariantPrice: variant ? variantPrice : undefined,
    selectedVariantStock: variant ? variantStock : undefined,
  };

  const finalQuantity = clampCartItemQuantity(nextItem, quantity);
  if (finalQuantity <= 0) {
    return null;
  }

  return {
    ...nextItem,
    quantity: finalQuantity,
  };
};

export const useCheckoutSessionStore = create<CheckoutSessionState>((set) => ({
  directItems: [],

  startDirectCheckout: (product, quantity = 1, selectedVariantId) => {
    const nextItem = buildDirectCheckoutItem(product, quantity, selectedVariantId);
    set({
      directItems: nextItem ? [nextItem] : [],
    });
  },

  clearDirectCheckout: () => {
    set({ directItems: [] });
  },
}));
