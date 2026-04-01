import api from './api';

export interface Review {
  reviewId: number;
  productId: number;
  productName?: string;  // ✅ Thêm để Admin có thể hiển thị tên sản phẩm
  userId: number;
  userName: string;
  userAvatar?: string;
  orderId?: number;
  orderDetailId?: number;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface ReviewStats {
  average: number;
  total: number;
  distribution: Record<number, number>; // { 1: 5, 2: 3, 3: 10, 4: 25, 5: 57 }
}

export type ReviewSource = 'product' | 'system_fallback' | 'empty';

export interface ProductReviewResponse {
  reviewSource: ReviewSource;
  hasOwnReviews: boolean;
  productStats: ReviewStats;
  stats: ReviewStats;
  reviews: Review[];
  total: number;
  page: number;
  totalPages: number;
  fallbackLabel?: string;
  fallbackDescription?: string;
}

export interface CreateReviewPayload {
  productId: number;
  orderId?: number;
  orderDetailId?: number;
  rating: number;
  title?: string;
  comment?: string;
}

export const reviewService = {
  // ── CUSTOMER ──────────────────────────────────────────────────────────────

  // Lấy danh sách review theo sản phẩm (chỉ approved)
  getByProduct: async (
    productId: number,
    params?: { rating?: number; page?: number; limit?: number }
  ): Promise<ProductReviewResponse> => {
    const query = new URLSearchParams();
    if (params?.rating) query.append('rating', String(params.rating));
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const res = await api.get(`/reviews/product/${productId}?${query}`);
    return res.data;
  },

  // Tạo review mới
  create: async (payload: CreateReviewPayload): Promise<Review> => {
    const res = await api.post('/reviews', payload);
    return res.data;
  },

  // Đánh dấu review hữu ích
  markHelpful: async (reviewId: number): Promise<void> => {
    await api.post(`/reviews/${reviewId}/helpful`);
  },
  checkCanReview: async (productId: number): Promise<{ canReview: boolean; reason?: string; orderId?: number; orderDetailId?: number }> => {
    const res = await api.get(`/reviews/can-review/${productId}`);
    return res.data;
  },
  // ── ADMIN ──────────────────────────────────────────────────────────────────

  // Lấy tất cả review (có filter)
  adminGetAll: async (params?: {
    status?: 'pending' | 'approved' | 'rejected' | 'all';
    rating?: number;
    search?: string;
    suspicious?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ reviews: Review[]; total: number; page: number; totalPages: number }> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.rating) query.append('rating', String(params.rating));
    if (params?.search) query.append('search', params.search);
    if (params?.suspicious) query.append('suspicious', 'true');
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const res = await api.get(`/admin/reviews?${query}`);
    return res.data;
  },

  // Ẩn/Hiện review (approved ↔ rejected)
  updateStatus: async (reviewId: number, status: 'approved' | 'rejected'): Promise<void> => {
    await api.patch(`/admin/reviews/${reviewId}/status`, { status });
  },
};
