import api from './api';
import type { Product } from '@/types';

export interface WishlistResponse {
  productIds: number[];
  products: Product[];
}

interface WishlistToggleResponse {
  productId: number;
  isFavorite: boolean;
}

export const wishlistService = {
  getMyWishlist: async (): Promise<WishlistResponse> => {
    const response = await api.get<WishlistResponse>('/wishlist');
    return {
      productIds: response.data.productIds ?? [],
      products: response.data.products ?? [],
    };
  },

  addToWishlist: async (productId: number): Promise<WishlistToggleResponse> => {
    const response = await api.post<WishlistToggleResponse>('/wishlist', { productId });
    return response.data;
  },

  removeFromWishlist: async (productId: number): Promise<WishlistToggleResponse> => {
    const response = await api.delete<WishlistToggleResponse>(`/wishlist/${productId}`);
    return response.data;
  },
};
