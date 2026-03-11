import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReturnRestockAction,
  ReturnStatus,
} from '@/types/order';
import type { ProductReviewStatus } from '@/types/review';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Cho xu ly',
  confirmed: 'Da xac nhan',
  processing: 'Dang chuan bi',
  shipping: 'Dang giao',
  delivered: 'Da giao',
  cancelled: 'Da huy',
  returned: 'Da hoan/tra',
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  processing: 'bg-blue-100 text-blue-800',
  shipping: 'bg-violet-100 text-violet-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
  returned: 'bg-slate-200 text-slate-800',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Cho thanh toan',
  paid: 'Da thanh toan',
  failed: 'Thanh toan loi',
  refunded: 'Da hoan tien',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'COD',
  bank_transfer: 'Chuyen khoan',
  momo: 'MoMo',
  vnpay: 'VNPay',
  zalopay: 'ZaloPay',
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: 'Da gui yeu cau',
  approved: 'Da duyet',
  rejected: 'Bi tu choi',
  received: 'Da nhan hang hoan',
  refunded: 'Da hoan tien',
  closed: 'Da dong',
};

export const RESTOCK_ACTION_LABELS: Record<ReturnRestockAction, string> = {
  restock: 'Nhap lai kho',
  inspect: 'Cho kiem tra',
  discard: 'Loai bo',
};

export const REVIEW_STATUS_LABELS: Record<ProductReviewStatus, string> = {
  pending: 'Dang cho duyet',
  approved: 'Da ghi nhan',
  rejected: 'Bi tu choi',
};

export const ORDER_EVENT_LABELS: Record<string, string> = {
  order_created: 'Don hang duoc tao',
  status_changed: 'Cap nhat trang thai don',
  payment_status_changed: 'Cap nhat thanh toan',
  order_cancelled: 'Don hang da huy',
  return_requested: 'Da gui yeu cau hoan/tra',
  return_approved: 'Yeu cau hoan/tra duoc duyet',
  return_rejected: 'Yeu cau hoan/tra bi tu choi',
  return_received: 'Shop da nhan hang hoan',
  return_refunded: 'Da hoan tien',
  return_closed: 'Da dong yeu cau hoan/tra',
};

export const formatCurrency = (value: number) =>
  `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

export const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString('vi-VN') : '-';
