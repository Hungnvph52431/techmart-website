// frontend/src/features/orders/pages/OrderDetailPage.tsx

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  RefreshCcw,
  Package,
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
import { OrderItemsList } from "../components/OrderItemsList";
import { OrderTimeline } from "../components/OrderTimeline";
import { OrderReturnsSection } from "../components/OrderReturnsSection";
import { OrderSummaryAside } from "../components/OrderSummaryAside";
import { formatDateTime } from "../lib/orderFormatters";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
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
            <OrderItemsList
              items={items}
              total={total}
              returnedOrderDetailIds={returnedOrderDetailIds}
              refundedOrderDetailIds={refundedOrderDetailIds}
              rejectedOrderDetailIds={rejectedOrderDetailIds}
            />

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

            <OrderTimeline timeline={timeline} />

            <OrderReturnsSection
              returns={returns}
              submitting={submitting}
              onRequestCancel={setCancellingReturnId}
            />
          </div>

          <OrderSummaryAside
            shipping={shipping}
            subtotal={subtotal}
            shippingFee={shippingFee}
            discount={discount}
            total={total}
            customerNote={customerNote}
            cancelReason={cancelReason_}
          />
        </div>
      </div>
    </>
  );
};
