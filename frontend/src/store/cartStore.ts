import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem } from '@/types';
import {
  clampCartItemQuantity,
  getCartItemStockLimit,
  getCartSelectionKey,
  matchesCartSelection,
} from '@/features/cart/lib/cartQuantity';

interface CartState {
  items: CartItem[];
  /** Danh sách composite key (productId-variantId) đang được chọn để thanh toán */
  selectedProductIds: string[];
  hasInitializedSelection: boolean;
  addItem: (product: Product, quantity?: number, selectedVariantId?: number) => void;
  removeItem: (productId: number, selectedVariantId?: number) => void;
  removeSelectedItems: () => void;
  updateQuantity: (productId: number, quantity: number, selectedVariantId?: number) => void;
  clearCart: () => void;
  // Chọn/bỏ chọn sản phẩm (variant-aware)
  toggleSelect: (productId: number, variantId?: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  // Đã đổi tên hàm để khớp với Header.tsx
  getTotalItems: () => number;
  getTotalPrice: () => number;
  // Tổng tiền & danh sách chỉ tính theo item đã chọn
  getSelectedItems: () => CartItem[];
  getSelectedTotalPrice: () => number;
}

// Helper: tính giá thực tế của item (ưu tiên giá variant đã lưu)
const getItemPrice = (item: CartItem): number => {
  if (item.selectedVariantPrice != null) return item.selectedVariantPrice;
  const basePrice = Number(item.product.salePrice || item.product.price);
  if (!item.selectedVariantId || !item.product.variants) return basePrice;
  const variant = item.product.variants.find(
    v => v.variantId === item.selectedVariantId || (v as any).id === item.selectedVariantId
  );
  if (!variant) return basePrice;
  // API có thể trả price (giá tuyệt đối) hoặc priceAdjustment (chênh lệch)
  if ((variant as any).price != null) return Number((variant as any).price);
  if (variant.priceAdjustment != null) return basePrice + Number(variant.priceAdjustment);
  return basePrice;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      selectedProductIds: [],
      hasInitializedSelection: false,

      addItem: (product, quantity = 1, selectedVariantId) => {
        if (quantity <= 0) {
          return;
        }

        const items = get().items;
        const existingItem = items.find(
          (item) => matchesCartSelection(item, product.productId, selectedVariantId)
        );

        // Lấy thông tin variant nếu có
        const variant = selectedVariantId && product.variants
          ? product.variants.find(v => v.variantId === selectedVariantId || (v as any).id === selectedVariantId)
          : undefined;
        const basePrice = Number(product.salePrice || product.price);
        // API trả về field name khác nhau: variantName/name, priceAdjustment/price, stockQuantity/stock
        const vName = variant?.variantName || (variant as any)?.name;
        const vPrice = (variant as any)?.price != null
          ? Number((variant as any).price)
          : (variant?.priceAdjustment != null ? basePrice + Number(variant.priceAdjustment) : basePrice);
        const variantStock = variant ? Number(variant.stockQuantity ?? (variant as any)?.stock ?? 0) : 0;
        if (existingItem) {
          const finalQuantity = clampCartItemQuantity(
            existingItem,
            existingItem.quantity + quantity
          );

          set({
            items: items.map((item) =>
              matchesCartSelection(item, product.productId, selectedVariantId)
                ? { ...item, quantity: finalQuantity }
                : item
            ),
            hasInitializedSelection: true,
          });
        } else {
          const selectedVariantStock =
            variant && variantStock > 0 ? variantStock : undefined;
          const nextCartItem: CartItem = {
            product,
            quantity,
            selectedVariantId,
            selectedVariantName: vName,
            selectedVariantPrice: variant ? vPrice : undefined,
            selectedVariantStock,
          };
          const finalQuantity = clampCartItemQuantity(nextCartItem, quantity);
          if (finalQuantity <= 0) {
            return;
          }
          const newCartItem = {
            product,
            quantity: finalQuantity,
            selectedVariantId,
            selectedVariantName: vName,
            selectedVariantPrice: variant ? vPrice : undefined,
            selectedVariantStock,
          };
          const newItems = [...items, newCartItem];
          const selectionKey = getCartSelectionKey(product.productId, selectedVariantId);
          set({
            items: newItems,
            // Tự động chọn sản phẩm mới thêm (với variant key)
            selectedProductIds: [...get().selectedProductIds, selectionKey],
            hasInitializedSelection: true,
          });
        }
      },

      removeItem: (productId, selectedVariantId) => {
        set((state) => {
          const filtered = state.items.filter(
            (item) => !matchesCartSelection(item, productId, selectedVariantId)
          );
          const remainingSelectionKeys = new Set(
            filtered.map((item) =>
              getCartSelectionKey(item.product.productId, item.selectedVariantId)
            )
          );

          return {
            items: filtered,
            selectedProductIds: state.selectedProductIds.filter((key) =>
              remainingSelectionKeys.has(key)
            ),
            hasInitializedSelection: true,
          };
        });
      },

      removeSelectedItems: () => {
        set((state) => {
          if (state.selectedProductIds.length === 0) {
            return {};
          }

          const selectedKeySet = new Set(state.selectedProductIds);
          const filtered = state.items.filter((item) => {
            const selectionKey = getCartSelectionKey(
              item.product.productId,
              item.selectedVariantId
            );
            return !selectedKeySet.has(selectionKey);
          });

          return {
            items: filtered,
            selectedProductIds: [],
            hasInitializedSelection: true,
          };
        });
      },

      updateQuantity: (productId, quantity, selectedVariantId) => {
        const item = get().items.find(
          (i) => matchesCartSelection(i, productId, selectedVariantId)
        );
        if (!item) return;

        if (quantity <= 0) {
          get().removeItem(productId, selectedVariantId);
        } else {
          const finalQuantity = clampCartItemQuantity(item, quantity);
          set({
            items: get().items.map((item) =>
              matchesCartSelection(item, productId, selectedVariantId)
                ? { ...item, quantity: finalQuantity }
                : item
            ),
            hasInitializedSelection: true,
          });
        }
      },

      clearCart: () => {
        set({ items: [], selectedProductIds: [], hasInitializedSelection: false });
      },

      toggleSelect: (productId, variantId) => {
        set((state) => {
          const selectionKey = getCartSelectionKey(productId, variantId);
          const isSelected = state.selectedProductIds.includes(selectionKey);
          return {
            selectedProductIds: isSelected
              ? state.selectedProductIds.filter((id) => id !== selectionKey)
              : [...state.selectedProductIds, selectionKey],
            hasInitializedSelection: true,
          };
        });
      },

      selectAll: () => {
        const allKeys = get().items.map((item) =>
          getCartSelectionKey(item.product.productId, item.selectedVariantId)
        );
        set({ selectedProductIds: allKeys, hasInitializedSelection: true });
      },

      clearSelection: () => {
        set({ selectedProductIds: [], hasInitializedSelection: true });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          return total + getItemPrice(item) * item.quantity;
        }, 0);
      },

      getSelectedItems: () => {
        const { items, selectedProductIds } = get();
        return items.filter((item) => {
          const selectionKey = getCartSelectionKey(
            item.product.productId,
            item.selectedVariantId
          );
          return selectedProductIds.includes(selectionKey);
        });
      },

      getSelectedTotalPrice: () => {
        const selectedItems = get().getSelectedItems();
        return selectedItems.reduce((total, item) => {
          return total + getItemPrice(item) * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'cart-storage',
      // Khi load từ localStorage: migrate data cũ & auto-select nếu rỗng
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Migration 1: chuyển selectedProductIds từ number[] sang string[]
        if (state.selectedProductIds.length > 0 && typeof state.selectedProductIds[0] === 'number') {
          const oldIds = state.selectedProductIds as any as number[];
          state.selectedProductIds = state.items
            .filter((item) => oldIds.includes(item.product.productId))
            .map((item) =>
              getCartSelectionKey(item.product.productId, item.selectedVariantId)
            );
          state.hasInitializedSelection = true;
        }

        if (state.selectedProductIds.length > 0 && !state.hasInitializedSelection) {
          state.hasInitializedSelection = true;
        }

        // Migration 2: backfill variant info cho cart items cũ chưa có selectedVariantName
        state.items = state.items.map((item) => {
          if (item.selectedVariantId && !item.selectedVariantName && item.product.variants) {
            const variant = item.product.variants.find(
              v => v.variantId === item.selectedVariantId || (v as any).id === item.selectedVariantId
            );
            if (variant) {
              const basePrice = Number(item.product.salePrice || item.product.price);
              const vName = variant.variantName || (variant as any).name;
              const vPrice = (variant as any).price != null
                ? Number((variant as any).price)
                : (variant.priceAdjustment != null ? basePrice + Number(variant.priceAdjustment) : basePrice);
              const vStock = Number(variant.stockQuantity ?? (variant as any).stock ?? 0);
              return {
                ...item,
                selectedVariantName: vName,
                selectedVariantPrice: vPrice,
                selectedVariantStock: vStock > 0 ? vStock : getCartItemStockLimit(item),
              };
            }
          }
          return item;
        });

        // Auto-select nếu rỗng
        if (state.items.length > 0 && !state.hasInitializedSelection) {
          state.selectedProductIds = state.items.map((i) =>
            getCartSelectionKey(i.product.productId, i.selectedVariantId)
          );
          state.hasInitializedSelection = true;
        }
      },
    }
  )
);
