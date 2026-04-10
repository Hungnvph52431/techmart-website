import { create } from 'zustand';
import { wishlistService } from '@/services/wishlist.service';
import type { Product } from '@/types';

interface WishlistState {
  productIds: number[];
  products: Product[];
  initializedUserId: number | null;
  isHydrating: boolean;
  pendingProductIds: number[];
  hydrateWishlist: (userId: number, force?: boolean) => Promise<void>;
  clearWishlist: () => void;
  toggleWishlist: (productId: number, product?: Product) => Promise<boolean>;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  productIds: [],
  products: [],
  initializedUserId: null,
  isHydrating: false,
  pendingProductIds: [],

  hydrateWishlist: async (userId, force = false) => {
    if (!force && get().initializedUserId === userId) {
      return;
    }

    set({ isHydrating: true });

    try {
      const wishlist = await wishlistService.getMyWishlist();
      set({
        productIds: wishlist.productIds,
        products: wishlist.products,
        initializedUserId: userId,
        isHydrating: false,
      });
    } catch (error) {
      set({ isHydrating: false });
      throw error;
    }
  },

  clearWishlist: () => {
    set({
      productIds: [],
      products: [],
      initializedUserId: null,
      isHydrating: false,
      pendingProductIds: [],
    });
  },

  toggleWishlist: async (productId, product) => {
    const { productIds, pendingProductIds } = get();
    const currentlyFavorite = productIds.includes(productId);

    if (pendingProductIds.includes(productId)) {
      return currentlyFavorite;
    }

    set((state) => ({
      pendingProductIds: [...state.pendingProductIds, productId],
    }));

    try {
      if (currentlyFavorite) {
        await wishlistService.removeFromWishlist(productId);
        set((state) => ({
          productIds: state.productIds.filter((id) => id !== productId),
          products: state.products.filter((item) => item.productId !== productId),
        }));
        return false;
      }

      await wishlistService.addToWishlist(productId);
      if (product) {
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds
            : [productId, ...state.productIds],
          products: state.products.some((item) => item.productId === productId)
            ? state.products
            : [product, ...state.products],
        }));
      } else {
        const wishlist = await wishlistService.getMyWishlist();
        set({
          productIds: wishlist.productIds,
          products: wishlist.products,
        });
      }
      return true;
    } finally {
      set((state) => ({
        pendingProductIds: state.pendingProductIds.filter((id) => id !== productId),
      }));
    }
  },
}));
