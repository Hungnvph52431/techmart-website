export const ORDER_EVENT_LABELS: Record<string, string> = {
  order_created: "Đơn hàng đã được tạo",
  status_changed: "Cập nhật trạng thái",
  payment_status_changed: "Cập nhật thanh toán",
  order_cancelled: "Đơn hàng bị hủy",
  return_requested: "Yêu cầu hoàn/trả hàng",
  return_approved: "Yêu cầu hoàn/trả được duyệt",
  return_rejected: "Yêu cầu hoàn/trả bị từ chối",
  return_received: "Đã nhận hàng hoàn trả",
  return_refunded: "Đã hoàn tiền",
  return_closed: "Đơn hoàn/trả đã đóng",
  return_cancelled: "Khách hủy yêu cầu hoàn/trả",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Đã hoàn/trả",
};

export const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipping: "bg-purple-100 text-purple-800",
  delivered: "bg-emerald-100 text-emerald-800",
  completed: "bg-lime-100 text-lime-800",
  cancelled: "bg-red-100 text-red-600",
  returned: "bg-orange-100 text-orange-600",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "COD (Thanh toán khi nhận)",
  vnpay: "VNPay",
  online: "Thanh toán online",
  bank_transfer: "Chuyển khoản",
  momo: "MoMo",
  wallet: "Ví TechMart",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
};

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending: "text-amber-600",
  paid: "text-emerald-600 font-semibold",
  failed: "text-rose-600 font-semibold",
  refunded: "text-violet-600 font-semibold",
};

export const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  received: "Đã nhận hàng",
  refunded: "Đã hoàn tiền",
  closed: "Đã đóng",
  cancelled: "Đã hủy",
};

export const RETURN_STATUS_STYLES: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  approved: "bg-sky-100 text-sky-800",
  rejected: "bg-rose-100 text-rose-800",
  received: "bg-violet-100 text-violet-800",
  refunded: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-100 text-slate-600",
  cancelled: "bg-gray-200 text-gray-700",
};

export const PAYMENT_BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
  refunded: "bg-violet-100 text-violet-800",
};

export const RATING_LABELS = [
  "",
  "Tệ",
  "Không tốt",
  "Bình thường",
  "Tốt",
  "Xuất sắc",
];

export const RETURN_REASONS = [
  "Sản phẩm bị lỗi / hư hỏng",
  "Sản phẩm không đúng mô tả",
  "Giao sai sản phẩm / màu sắc / dung lượng",
  "Sản phẩm không như mong đợi",
  "Khác",
];
