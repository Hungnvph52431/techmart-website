import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  // Đã đổi tên hàm để khớp với Header.tsx
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        const items = get().items;
        // Sử dụng productId để đồng bộ với Database và Interface mới
        const existingItem = items.find((item) => item.product.productId === product.productId);

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          // Logic kiểm tra tồn kho từ bản Tuấn Anh
          const finalQuantity = newQuantity > product.stockQuantity ? product.stockQuantity : newQuantity;

          set({
            items: items.map((item) =>
              item.product.productId === product.productId
                ? { ...item, quantity: finalQuantity }
                : item
            ),
          });
        } else {
          // Kiểm tra tồn kho cho sản phẩm mới thêm
          const finalQuantity = quantity > product.stockQuantity ? product.stockQuantity : quantity;
          set({ items: [...items, { product, quantity: finalQuantity }] });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.product.productId !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        const item = get().items.find(i => i.product.productId === productId);
        if (!item) return;

        if (quantity <= 0) {
          get().removeItem(productId);
        } else {
          // Đảm bảo không cập nhật quá số lượng tồn kho
          const finalQuantity = quantity > item.product.stockQuantity ? item.product.stockQuantity : quantity;
          set({
            items: get().items.map((item) =>
              item.product.productId === productId ? { ...item, quantity: finalQuantity } : item
            ),
          });
        }
      },

      clearCart: () => {
        set({ items: [] });
      },

      // Tên hàm đã được chuẩn hóa để dập lỗi gạch đỏ ở Header
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => {
            // Ưu tiên sử dụng salePrice nếu có, nếu không thì dùng price gốc
            const activePrice = item.product.salePrice || item.product.price;
            return total + activePrice * item.quantity;
          },
          0
        );
      },
    }),
    {
      name: 'cart-storage', // Lưu giỏ hàng vào LocalStorage để khách F5 không bị mất
    }
  )
);