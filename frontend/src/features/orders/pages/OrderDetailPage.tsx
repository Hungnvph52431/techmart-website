// frontend/src/features/orders/pages/OrderDetailPage.tsx

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  RefreshCcw,
  Package,
  MapPin,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  Star,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { orderService } from "@/services/order.service";
import {
  reviewService,
  type OrderReviewSummary,
} from "@/services/review.service";
import type { OrderReturnView } from "@/types/order";
import { RepayButton } from "../components/RepayButton";
import { ReviewModal } from "../components/ReviewModal";
import { ReturnModal } from "../components/ReturnModal";
import {
  formatCurrency,
  formatDateTime,
  formatOrderItemVariantSummary,
  getImageUrl,
} from "../lib/orderFormatters";
import {
  ORDER_EVENT_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_BADGE_STYLES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_STYLES,
} from "../lib/orderLabels";

// ─── Main ─────────────────────────────────────────────────────────────────────
export const OrderDetailPage = () => {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);

  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [cancellingReturnId, setCancellingReturnId] = useState<number | null>(null);
  const [reviewSummary, setReviewSummary] = useState<OrderReviewSummary | null>(
    null,
  );

  const loadData = async () => {
    if (!Number.isFinite(orderId)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [data, summary] = await Promise.all([
        orderService.getById(orderId),
        reviewService.getOrderSummary(orderId).catch(() => null),
      ]);
      setDetail(data);
      setReviewSummary(summary);
    } catch {
      toast.error("Không thể tải chi tiết đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy đơn");
      return;
    }
    try {
      setSubmitting("cancel");
      const oid = detail?.orderId ?? detail?.order?.orderId;
      await orderService.cancel(oid, { reason: cancelReason.trim() });
      toast.success("Đã gửi yêu cầu hủy đơn");
      setShowCancelForm(false);
      setCancelReason("");
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể hủy đơn hàng");
      setShowCancelForm(false);
      setCancelReason("");
      await loadData();
    } finally {
      setSubmitting(null);
    }
  };

  const handleCancelReturn = async (returnId: number) => {
    if (!detail) return;
    try {
      setSubmitting(`cancel-return-${returnId}`);
      const oid = detail?.orderId ?? detail?.order?.orderId;
      await orderService.cancelReturn(oid, returnId);
      toast.success("Đã hủy yêu cầu trả hàng");
      setCancellingReturnId(null);
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Không thể hủy yêu cầu trả hàng",
      );
    } finally {
      setSubmitting(null);
    }
  };

  // ✅ Xác nhận đã nhận → mở modal đánh giá ngay
  const handleConfirmDelivered = async () => {
    if (!detail) return;
    try {
      setSubmitting("confirm-delivered");
      const oid = detail?.orderId ?? detail?.order?.orderId;
      await orderService.confirmDelivered(oid);
      toast.success("🎉 Đã xác nhận nhận hàng!");
      await loadData();
      setShowReviewModal(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Không thể xác nhận đã nhận hàng",
      );
    } finally {
      setSubmitting(null);
    }
  };

  if (loading && !detail) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Đang tải chi tiết đơn hàng...
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900">
            Không tìm thấy đơn hàng
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Đơn hàng không tồn tại hoặc bạn không có quyền.
          </p>
          <Link
            to="/orders"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
          >
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const order = detail.order ?? detail;
  const items = detail.items ?? detail.orderDetails ?? [];
  const timeline = detail.timeline ?? detail.events ?? [];
  const returns: OrderReturnView[] = detail.returns ?? [];
  const returnedOrderDetailIds = new Set(
    returns
      .filter((r) => r.status !== "rejected" && r.status !== "cancelled")
      .flatMap((r) => r.items.map((i) => i.orderDetailId)),
  );
  const refundedOrderDetailIds = new Set(
    returns
      .filter((r) => r.status === "refunded" || r.status === "closed")
      .flatMap((r) => r.items.map((i) => i.orderDetailId)),
  );
  const rejectedOrderDetailIds = new Set(
    returns
      .filter((r) => r.status === "rejected")
      .flatMap((r) => r.items.map((i) => i.orderDetailId)),
  );

  const orderCode = order.orderCode ?? order.order_code ?? `#${orderId}`;
  const status = order.status ?? "pending";
  const payMethod = order.paymentMethod ?? order.payment_method ?? "cod";
  const payStatus = order.paymentStatus ?? order.payment_status ?? "pending";
  const total = Number(order.total ?? 0);
  const subtotal = Number(order.subtotal ?? 0);
  const shippingFee = Number(order.shippingFee ?? order.shipping_fee ?? 0);
  const discount = Number(order.discountAmount ?? order.discount_amount ?? 0);
  const orderDate =
    order.orderDate ?? order.created_at ?? order.createdAt ?? "";
  const shipping = order.shipping ?? {};
  const customerNote = order.customerNote ?? order.customer_note ?? "";
  const cancelReason_ = order.cancelReason ?? order.cancel_reason ?? "";
  const reviewItems = reviewSummary?.items ?? [];
  const actionableReviewItems = reviewItems.filter(
    (item) => item.canCreateReview || item.canEditReview,
  );
  const reviewedItemsCount = reviewItems.filter((item) =>
    Boolean(item.review),
  ).length;

  // ✅ Chỉ hủy được khi pending/confirmed — khóa từ shipping trở đi
  const canCancel = ["pending", "confirmed"].includes(status);
  // ✅ FIX: Chỉ hiện nút "Đã nhận hàng" khi đơn ở trạng thái 'delivered' (đã giao đến nơi)
  //         KHÔNG hiện khi 'shipping' (đang trên đường giao)
  const canConfirmReceived = status === "delivered";
  // ✅ Chỉ hiện badge "Đã nhận hàng" khi user đã xác nhận (completed)
  const alreadyReceived = status === "completed";
  // ✅ Đánh giá/sửa đánh giá dựa trên summary item-level từ backend
  const canReview = actionableReviewItems.length > 0;
  const allReviewed =
    reviewItems.length > 0 &&
    reviewedItemsCount === reviewItems.length &&
    !reviewSummary?.hasPendingReviewActions;
  // ✅ Hoàn hàng: dùng metadata window từ server
  const hasUnreturnedItems = items.some(
    (item: any) => !returnedOrderDetailIds.has(item.orderDetailId),
  );
  const canRequestReturn = Boolean(order.canRequestReturn) && hasUnreturnedItems;
  const returnDeadlineAt = order.returnDeadlineAt;
  const returnWindowExpired = Boolean(order.returnWindowExpired);
  const returnWindowDays = Number(order.returnWindowDays ?? 7);
  const editableReviewCount = actionableReviewItems.filter(
    (item) => item.canEditReview,
  ).length;
  const creatableReviewCount = actionableReviewItems.filter(
    (item) => item.canCreateReview,
  ).length;

  return (
    <>
      {showReviewModal && (
        <ReviewModal
          items={reviewItems}
          orderId={orderId}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={() => {
            setShowReviewModal(false);
            void loadData();
          }}
        />
      )}

      {cancellingReturnId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-black text-gray-900 mb-2">
              Hủy yêu cầu trả hàng?
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              Yêu cầu sẽ bị hủy và không thể khôi phục. Bạn có thể tạo yêu cầu
              mới sau nếu cần.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancellingReturnId(null)}
                disabled={submitting?.startsWith("cancel-return-")}
                className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Không
              </button>
              <button
                type="button"
                onClick={() => handleCancelReturn(cancellingReturnId)}
                disabled={submitting?.startsWith("cancel-return-")}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting?.startsWith("cancel-return-")
                  ? "Đang hủy..."
                  : "Hủy yêu cầu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && (
        <ReturnModal
          items={items}
          order={order}
          orderId={orderId}
          returnedOrderDetailIds={returnedOrderDetailIds}
          refundedOrderDetailIds={refundedOrderDetailIds}
          rejectedOrderDetailIds={rejectedOrderDetailIds}
          onClose={() => setShowReturnModal(false)}
          onSubmitted={() => {
            setShowReturnModal(false);
            void loadData();
          }}
        />
      )}

      <div className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-3"
            >
              <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black text-gray-900 uppercase italic">
                {orderCode}
              </h2>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${ORDER_STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}
              >
                {ORDER_STATUS_LABELS[status] ?? status}
              </span>
              {returns.length > 0 &&
                returns.some((r) => r.status === "requested") && (
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase bg-orange-100 text-orange-700 animate-pulse">
                    Đang chờ xét duyệt trả hàng
                  </span>
                )}
              {returns.length > 0 &&
                returns.some((r) =>
                  ["approved", "received"].includes(r.status),
                ) && (
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase bg-violet-100 text-violet-700">
                    Đang xử lý hoàn trả
                  </span>
                )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Đặt lúc {orderDate ? formatDateTime(orderDate) : "—"} ·{" "}
              {PAYMENT_METHOD_LABELS[payMethod] ?? payMethod} /{" "}
              <span className={PAYMENT_STATUS_STYLES[payStatus] ?? ""}>
                {PAYMENT_STATUS_LABELS[payStatus] ?? payStatus}
              </span>
            </p>
            {["delivered", "completed"].includes(status) &&
              returnDeadlineAt && (
                <p
                  className={`mt-1 text-xs font-semibold ${returnWindowExpired ? "text-rose-600" : "text-orange-600"}`}
                >
                  {returnWindowExpired
                    ? `Đã hết hạn yêu cầu hoàn hàng sau ${returnWindowDays} ngày`
                    : `Có thể yêu cầu hoàn hàng đến ${formatDateTime(returnDeadlineAt)}`}
                </p>
              )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void loadData()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCcw size={14} /> Tải lại
            </button>

            {/* Hủy đơn — chỉ pending/confirmed */}
            {canCancel && (
              <button
                onClick={() => setShowCancelForm((p) => !p)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 transition-colors"
              >
                Hủy đơn
              </button>
            )}

            <RepayButton
              orderId={order.orderId}
              paymentMethod={order.paymentMethod}
              paymentStatus={order.paymentStatus}
              orderStatus={order.status}
            />

            {/* Thông báo khóa hủy khi đang giao */}
            {status === "shipping" && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                <AlertCircle size={14} /> Đơn đang giao, không thể hủy
              </div>
            )}

            {/* Nút "Đã nhận hàng" — CHỈ khi status = 'delivered' */}
            {canConfirmReceived && (
              <button
                onClick={handleConfirmDelivered}
                disabled={submitting === "confirm-delivered"}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm shadow-emerald-200"
              >
                <CheckCircle2 size={16} />
                {submitting === "confirm-delivered"
                  ? "Đang xác nhận..."
                  : "Đã nhận hàng"}
              </button>
            )}

            {/* Đã nhận — badge */}
            {alreadyReceived && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} /> Đã nhận hàng
              </div>
            )}

            {/* Nút yêu cầu hoàn/trả hàng */}
            {canRequestReturn && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
              >
                <RotateCcw size={15} /> Yêu cầu hoàn hàng
              </button>
            )}

            {/* Nút đánh giá */}
            {canReview && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-yellow-500 transition-colors"
              >
                <Star size={15} className="fill-current" /> Đánh giá
              </button>
            )}
          </div>
        </div>

        {/* ── Cancel Form ── */}
        {showCancelForm && canCancel && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <h3 className="text-base font-black text-rose-900 uppercase">
              Yêu cầu hủy đơn
            </h3>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Nhập lý do hủy đơn..."
              className="mt-3 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm focus:border-rose-400 focus:outline-none"
            />
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleCancelOrder}
                disabled={submitting === "cancel"}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Xác nhận hủy
              </button>
              <button
                onClick={() => setShowCancelForm(false)}
                className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-900"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {/* ── Sản phẩm ── */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black text-gray-900 uppercase italic flex items-center gap-2">
                  <Package size={18} className="text-blue-600" /> Sản phẩm trong
                  đơn
                </h3>
                <p className="text-sm font-black text-gray-900">
                  {formatCurrency(total)}
                </p>
              </div>
              <div className="space-y-3">
                {items.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    Không có sản phẩm
                  </p>
                ) : (
                  items.map((item: any, idx: number) => {
                    const name =
                      item.productName ??
                      item.product_name ??
                      `Sản phẩm #${idx + 1}`;
                    const variant = formatOrderItemVariantSummary(item);
                    const qty = item.quantity ?? 1;
                    const price = Number(item.price ?? 0);
                    const sub = Number(item.subtotal ?? price * qty);
                    const img =
                      getImageUrl(
                        item.productImage ?? item.product_image ?? item.image,
                      ) || "/placeholder.jpg";
                    const isItemReturned = returnedOrderDetailIds.has(item.orderDetailId);
                    const isItemRefunded = refundedOrderDetailIds.has(item.orderDetailId);
                    const isItemRejected = rejectedOrderDetailIds.has(item.orderDetailId);
                    return (
                      <div
                        key={item.orderDetailId ?? idx}
                        className={`flex gap-4 rounded-2xl border p-4 ${isItemReturned ? "border-gray-100 bg-gray-50 opacity-50" : "border-gray-100"}`}
                      >
                        <img
                          src={img}
                          alt={name}
                          className="h-16 w-16 rounded-xl object-cover flex-shrink-0 bg-gray-50"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.onerror = null;
                            el.src = "/placeholder.jpg";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 truncate">
                              {name}
                            </p>
                            {isItemReturned && !isItemRefunded && (
                              <span className="inline-flex rounded-full bg-gray-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 flex-shrink-0">
                                Đang hoàn hàng
                              </span>
                            )}
                            {isItemRefunded && (
                              <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700 flex-shrink-0">
                                Đã hoàn hàng
                              </span>
                            )}
                            {isItemRejected && !isItemReturned && (
                              <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600 flex-shrink-0">
                                Từ chối hoàn hàng
                              </span>
                            )}
                          </div>
                          {variant && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {variant}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Số lượng: {qty}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-gray-900">
                            {formatCurrency(sub)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatCurrency(price)}/sp
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* ── Đánh giá sản phẩm ── */}
            {canReview && (
              <section className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-gray-900 uppercase italic flex items-center gap-2">
                    <Star
                      size={18}
                      className="text-yellow-500 fill-yellow-500"
                    />{" "}
                    Đánh giá sản phẩm
                  </h3>
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-yellow-500 transition-colors shadow-sm"
                  >
                    <Star size={15} className="fill-current" /> Viết đánh giá
                    ngay
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {creatableReviewCount > 0 &&
                    `Còn ${creatableReviewCount} sản phẩm chưa được đánh giá. `}
                  {editableReviewCount > 0 &&
                    `${editableReviewCount} sản phẩm đã gửi yêu cầu hoàn hàng có thể sửa đánh giá 1 lần.`}
                </p>
              </section>
            )}

            {allReviewed && ["delivered", "completed"].includes(status) && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-700">
                    Bạn đã đánh giá tất cả sản phẩm trong đơn hàng này. Cảm ơn
                    bạn!
                  </p>
                </div>
              </section>
            )}

            {/* ── Timeline ── */}
            {timeline.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-black text-gray-900 uppercase italic flex items-center gap-2 mb-5">
                  <Clock size={18} className="text-blue-600" /> Lịch sử xử lý
                </h3>
                <div className="space-y-4">
                  {timeline.map((event: any, idx: number) => (
                    <div key={event.orderEventId ?? idx} className="flex gap-3">
                      <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {ORDER_EVENT_LABELS[event.eventType ?? event.type] ??
                            event.eventType ??
                            event.type ??
                            "Cập nhật trạng thái"}
                        </p>
                        {(event.fromStatus || event.toStatus) && (
                          <p className="mt-1 flex items-center gap-1 flex-wrap">
                            {event.fromStatus && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${ORDER_STATUS_STYLES[event.fromStatus] ?? RETURN_STATUS_STYLES[event.fromStatus] ?? PAYMENT_BADGE_STYLES[event.fromStatus] ?? "bg-gray-100 text-gray-700"}`}>
                                {ORDER_STATUS_LABELS[event.fromStatus] ?? RETURN_STATUS_LABELS[event.fromStatus] ?? PAYMENT_STATUS_LABELS[event.fromStatus] ?? event.fromStatus}
                              </span>
                            )}
                            {event.fromStatus && event.toStatus && (
                              <svg className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                            )}
                            {event.toStatus && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${ORDER_STATUS_STYLES[event.toStatus] ?? RETURN_STATUS_STYLES[event.toStatus] ?? PAYMENT_BADGE_STYLES[event.toStatus] ?? "bg-gray-100 text-gray-700"}`}>
                                {ORDER_STATUS_LABELS[event.toStatus] ?? RETURN_STATUS_LABELS[event.toStatus] ?? PAYMENT_STATUS_LABELS[event.toStatus] ?? event.toStatus}
                              </span>
                            )}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {event.createdAt
                            ? formatDateTime(event.createdAt)
                            : ""}
                        </p>
                        {event.note && (
                          <p className="text-xs text-gray-600 mt-1">
                            {event.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Trạng thái hoàn trả (cho khách hàng) ── */}
            {returns.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-black text-gray-900 uppercase italic flex items-center gap-2 mb-5">
                  <RotateCcw size={18} className="text-orange-500" /> Yêu cầu
                  hoàn/trả hàng
                </h3>
                <div className="space-y-4">
                  {returns.map((ret) => {
                    const RSTATUS: Record<
                      string,
                      { label: string; style: string }
                    > = {
                      requested: {
                        label: "Chờ duyệt",
                        style: "bg-amber-100 text-amber-800",
                      },
                      approved: {
                        label: "Đã duyệt",
                        style: "bg-sky-100 text-sky-800",
                      },
                      rejected: {
                        label: "Từ chối",
                        style: "bg-rose-100 text-rose-800",
                      },
                      received: {
                        label: "Đã nhận hàng",
                        style: "bg-violet-100 text-violet-800",
                      },
                      refunded: {
                        label: "Đã hoàn tiền",
                        style: "bg-emerald-100 text-emerald-800",
                      },
                      closed: {
                        label: "Đã đóng",
                        style: "bg-gray-100 text-gray-600",
                      },
                      cancelled: {
                        label: "Đã hủy",
                        style: "bg-gray-200 text-gray-700",
                      },
                    };
                    const cfg = RSTATUS[ret.status] ?? RSTATUS.requested;
                    return (
                      <div
                        key={ret.orderReturnId}
                        className="rounded-xl border border-gray-100 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-gray-800 text-sm">
                              {ret.requestCode}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Yêu cầu lúc{" "}
                              {ret.requestedAt
                                ? formatDateTime(ret.requestedAt)
                                : "—"}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase ${cfg.style}`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-bold text-gray-800">
                            Lý do:
                          </span>{" "}
                          {ret.reason}
                        </p>
                        {ret.customerNote && (
                          <p className="text-xs text-gray-500 italic">
                            "{ret.customerNote}"
                          </p>
                        )}
                        {/* Ảnh bằng chứng */}
                        {ret.evidenceImages &&
                          ret.evidenceImages.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-gray-500 mb-1.5">
                                Ảnh bằng chứng:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {ret.evidenceImages.map((img, idx) => (
                                  <a
                                    key={idx}
                                    href={getImageUrl(img)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:border-orange-400 transition-colors"
                                  >
                                    <img
                                      src={getImageUrl(img)}
                                      alt={`evidence-${idx}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        {/* Sản phẩm trong phiếu trả */}
                        {ret.items?.length > 0 && (
                          <div className="space-y-1.5">
                            {ret.items.map((item) => {
                              const variantSummary =
                                formatOrderItemVariantSummary(item);
                              return (
                                <div
                                  key={item.orderReturnItemId}
                                  className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2"
                                >
                                  <span className="font-bold">
                                    {item.productName ||
                                      `SP #${item.productId}`}
                                  </span>
                                  {variantSummary && (
                                    <span className="text-gray-500">
                                      {" "}
                                      • {variantSummary}
                                    </span>
                                  )}{" "}
                                  — SL: {item.quantity}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Timeline nhỏ */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 font-bold pt-1 border-t border-gray-50">
                          {ret.approvedAt && (
                            <span>Duyệt: {formatDateTime(ret.approvedAt)}</span>
                          )}
                          {ret.rejectedAt && (
                            <span className="text-rose-400">
                              Từ chối: {formatDateTime(ret.rejectedAt)}
                            </span>
                          )}
                          {ret.receivedAt && (
                            <span>
                              Nhận hàng: {formatDateTime(ret.receivedAt)}
                            </span>
                          )}
                          {ret.refundedAt && (
                            <span className="text-emerald-500">
                              Hoàn tiền: {formatDateTime(ret.refundedAt)}
                            </span>
                          )}
                          {ret.closedAt && (
                            <span>Đóng: {formatDateTime(ret.closedAt)}</span>
                          )}
                          {ret.cancelledAt && (
                            <span className="text-gray-500">
                              Hủy: {formatDateTime(ret.cancelledAt)}
                            </span>
                          )}
                        </div>
                        {ret.status === "requested" && (
                          <div className="pt-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() =>
                                setCancellingReturnId(ret.orderReturnId)
                              }
                              disabled={
                                submitting === `cancel-return-${ret.orderReturnId}`
                              }
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Hủy yêu cầu
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* ── Aside ── */}
          <aside className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-2 mb-4">
                <MapPin size={16} className="text-blue-600" /> Thông tin giao
                hàng
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-bold text-gray-900">Người nhận:</span>{" "}
                  {shipping.name ?? shipping.receiverName ?? "—"}
                </p>
                <p>
                  <span className="font-bold text-gray-900">SĐT:</span>{" "}
                  {shipping.phone ?? shipping.receiverPhone ?? "—"}
                </p>
                <p>
                  <span className="font-bold text-gray-900">Địa chỉ:</span>{" "}
                  {shipping.fullAddress ?? shipping.address ?? "—"}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-2 mb-4">
                <CreditCard size={16} className="text-blue-600" /> Tổng kết
                thanh toán
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển</span>
                  <span>{formatCurrency(shippingFee)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Giảm giá</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-2 flex justify-between font-black text-gray-900 text-base">
                  <span>Tổng cộng</span>
                  <span className="text-blue-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </section>

            {(customerNote || cancelReason_) && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-2 mb-4">
                  <FileText size={16} className="text-blue-600" /> Ghi chú
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  {customerNote && (
                    <p>
                      <span className="font-bold text-gray-900">Ghi chú:</span>{" "}
                      {customerNote}
                    </p>
                  )}
                  {cancelReason_ && (
                    <p>
                      <span className="font-bold text-rose-700">
                        Lý do hủy:
                      </span>{" "}
                      {cancelReason_}
                    </p>
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
};
