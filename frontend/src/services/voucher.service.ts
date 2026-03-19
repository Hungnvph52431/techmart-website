import api from './api';

// Định nghĩa đầy đủ các trường theo Database
export interface Voucher {
  coupon_id: number;
  code: string;
  description: string;
  discount_type: 'fixed_amount' | 'percentage';
  discount_value: number;
  min_order_value: number;
  max_discount_amount: number | null;
  usage_limit: number;
  used_count: number;
  per_user_limit: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: number;
}

// Khi tạo mới, bỏ qua ID và used_count vì DB tự sinh
export type CreateVoucherPayload = Omit<Voucher, 'coupon_id' | 'used_count'>;

export const voucherService = {
  getAll: async (): Promise<Voucher[]> => {
    const response = await api.get('/vouchers');
    return response.data;
  },
  create: async (data: CreateVoucherPayload): Promise<Voucher> => {
    const response = await api.post('/vouchers', data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/vouchers/${id}`);
  }
};