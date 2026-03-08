export interface Voucher {
  coupon_id?: number;
  code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  min_order_value: number;
  usage_limit: number;
  used_count: number;
  per_user_limit: number;
  is_active: number;
  created_at?: Date;
  updated_at?: Date;
}