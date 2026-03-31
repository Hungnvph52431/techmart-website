import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  /** Danh sách composite key (productId-variantId) đang được chọn để thanh toán */
  selectedProductIds: string[];
  addItem: (product: Product, quantity?: number, selectedVariantId?: number) => void;
  removeItem: (productId: number, selectedVariantId?: number) => void;
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

// Helper: tạo composite key từ productId + variantId
const getSelectionKey = (productId: number, variantId?: number): string => {
  return variantId ? `${productId}-${variantId}` : `${productId}`;
};

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

      addItem: (product, quantity = 1, selectedVariantId) => {
        const items = get().items;
        const existingItem = items.find(
          (item) =>
            item.product.productId === product.productId &&
            item.selectedVariantId === selectedVariantId
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
        const stockLimit = variant ? (variantStock > 0 ? variantStock : product.stockQuantity) : product.stockQuantity;

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          const finalQuantity = newQuantity > stockLimit ? stockLimit : newQuantity;

          set({
            items: items.map((item) =>
              item.product.productId === product.productId &&
              item.selectedVariantId === selectedVariantId
                ? { ...item, quantity: finalQuantity }
                : item
            ),
          });
        } else {
          const finalQuantity = quantity > stockLimit ? stockLimit : quantity;
          const newCartItem = {
            product,
            quantity: finalQuantity,
            selectedVariantId,
            selectedVariantName: vName,
            selectedVariantPrice: variant ? vPrice : undefined,
            selectedVariantStock: variant ? stockLimit : undefined,
          };
          const newItems = [...items, newCartItem];
          const selectionKey = getSelectionKey(product.productId, selectedVariantId);
          set({
            items: newItems,
            // Tự động chọn sản phẩm mới thêm (với variant key)
            selectedProductIds: [...get().selectedProductIds, selectionKey],
          });
        }
      },

      removeItem: (productId, selectedVariantId) => {
        set((state) => {
          const filtered = state.items.filter(
            (item) =>
              !(item.product.productId === productId &&
              item.selectedVariantId === selectedVariantId)
          );
          // Nếu xóa hết items của product này (tất cả variants), xóa khỏi selectedProductIds
          const hasProductLeft = filtered.some((item) => item.product.productId === productId);
          return {
            items: filtered,
            selectedProductIds: hasProductLeft
              ? state.selectedProductIds
              : state.selectedProductIds.filter((key) => {
                  // Xóa selection keys cho product này (ví dụ: "123" hoặc "123-456")
                  const keyProductId = parseInt(key.split('-')[0]);
                  return keyProductId !== productId;
                }),
          };
        });
      },

      updateQuantity: (productId, quantity, selectedVariantId) => {
        const item = get().items.find(
          (i) =>
            i.product.productId === productId &&
            i.selectedVariantId === selectedVariantId
        );
        if (!item) return;

        if (quantity <= 0) {
          get().removeItem(productId, selectedVariantId);
        } else {
          const finalQuantity =
            quantity > item.product.stockQuantity
              ? item.product.stockQuantity
              : quantity;
          set({
            items: get().items.map((item) =>
              item.product.productId === productId &&
              item.selectedVariantId === selectedVariantId
                ? { ...item, quantity: finalQuantity }
                : item
            ),
          });
        }
      },

      clearCart: () => {
        set({ items: [], selectedProductIds: [] });
      },

      toggleSelect: (productId, variantId) => {
        set((state) => {
          const selectionKey = getSelectionKey(productId, variantId);
          const isSelected = state.selectedProductIds.includes(selectionKey);
          return {
            selectedProductIds: isSelected
              ? state.selectedProductIds.filter((id) => id !== selectionKey)
              : [...state.selectedProductIds, selectionKey],
          };
        });
      },

      selectAll: () => {
        const allKeys = get().items.map((item) =>
          getSelectionKey(item.product.productId, item.selectedVariantId)
        );
        set({ selectedProductIds: allKeys });
      },

      clearSelection: () => {
        set({ selectedProductIds: [] });
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
          const selectionKey = getSelectionKey(item.product.productId, item.selectedVariantId);
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
            .map((item) => getSelectionKey(item.product.productId, item.selectedVariantId));
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
                selectedVariantStock: vStock > 0 ? vStock : item.product.stockQuantity,
              };
            }
          }
          return item;
        });

        // Auto-select nếu rỗng
        if (state.items.length > 0 && state.selectedProductIds.length === 0) {
          state.selectedProductIds = state.items.map((i) =>
            getSelectionKey(i.product.productId, i.selectedVariantId)
          );
        }
      },
    }
  )
);