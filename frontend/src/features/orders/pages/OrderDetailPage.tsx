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
  X,
  AlertCircle,
  RotateCcw,
  Camera,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { orderService } from "@/services/order.service";
import {
  reviewService,
  type OrderReviewItemSummary,
  type OrderReviewSummary,
} from "@/services/review.service";
import type { OrderReturnView } from "@/types/order";
import { RepayButton } from "../components/RepayButton";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BACKEND_URL =
  (import.meta.env.VITE_API_URL as string)?.replace("/api", "") ||
  "http://localhost:5001";
const getImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount,
  );

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatOrderItemVariantSummary = (item: {
  variantName?: string;
  variant_name?: string;
  sku?: string;
}) => {
  const variantName = item.variantName ?? item.variant_name ?? "";
  const sku = item.sku ?? "";

  if (variantName && sku) {
    return `${variantName} • SKU: ${sku}`;
  }

  if (variantName) {
    return variantName;
  }

  if (sku) {
    return `SKU: ${sku}`;
  }

  return "";
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Đã hoàn/trả",
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipping: "bg-purple-100 text-purple-800",
  delivered: "bg-emerald-100 text-emerald-800",
  completed: "bg-lime-100 text-lime-800",
  cancelled: "bg-red-100 text-red-600",
  returned: "bg-orange-100 text-orange-600",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "COD (Thanh toán khi nhận)",
  vnpay: "VNPay",
  online: "Thanh toán online",
  bank_transfer: "Chuyển khoản",
  momo: "MoMo",
  wallet: "Ví TechMart",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending: "text-amber-600",
  paid: "text-emerald-600 font-semibold",
  failed: "text-rose-600 font-semibold",
  refunded: "text-violet-600 font-semibold",
};

// ─── Review Modal ─────────────────────────────────────────────────────────────
const RATING_LABELS = ["", "Tệ", "Không tốt", "Bình thường", "Tốt", "Xuất sắc"];

const ReviewModal = ({
  items,
  orderId,
  onClose,
  onSubmitted,
}: {
  items: OrderReviewItemSummary[];
  orderId: number;
  onClose: () => void;
  onSubmitted: () => void;
}) => {
  const actionableItems = items.filter(
    (item) => item.canCreateReview || item.canEditReview,
  );
  const [ratings, setRatings] = useState<Record<number, number>>(() =>
    Object.fromEntries(
      actionableItems.map((item) => [
        item.orderDetailId,
        item.review?.rating ?? 5,
      ]),
    ),
  );
  const [comments, setComments] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      actionableItems.map((item) => [
        item.orderDetailId,
        item.review?.comment ?? "",
      ]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const unratedItem = actionableItems.find(
      (item) => !ratings[item.orderDetailId],
    );
    if (unratedItem) {
      toast.error(`Vui lòng đánh giá sản phẩm ${unratedItem.productName}`);
      return;
    }

    try {
      setSubmitting(true);
      const results = await Promise.allSettled(
        actionableItems.map((item) => {
          const payload = {
            rating: ratings[item.orderDetailId] ?? item.review?.rating ?? 5,
            comment: comments[item.orderDetailId]?.trim() ?? "",
          };

          if (item.canEditReview && item.review?.reviewId) {
            return reviewService.update(item.review.reviewId, payload);
          }

          return reviewService.create({
            productId: item.productId,
            orderId,
            orderDetailId: item.orderDetailId,
            ...payload,
          });
        }),
      );

      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length === results.length) {
        const firstErr = (failed[0] as PromiseRejectedResult).reason;
        const msg =
          firstErr?.response?.data?.message ||
          "Không thể gửi đánh giá, vui lòng thử lại";
        toast.error(msg);
      } else if (failed.length > 0) {
        toast.success(
          `Đã gửi ${results.length - failed.length}/${results.length} đánh giá`,
        );
        onSubmitted();
      } else {
        toast.success("Cảm ơn bạn đã đánh giá!");
        onSubmitted();
      }
    } catch {
      toast.error("Không thể gửi đánh giá, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-3xl z-10">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              ⭐ Đánh giá sản phẩm
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {actionableItems.length} sản phẩm có thể đánh giá hoặc chỉnh sửa
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={17} className="text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-8">
          {actionableItems.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Hiện không có sản phẩm nào đủ điều kiện để đánh giá hoặc sửa
                đánh giá.
              </p>
            </div>
          )}

          {actionableItems.map((item, index) => {
            const name = item.productName ?? `Sản phẩm ${index + 1}`;
            const img = item.productImage ?? "";
            const rating = ratings[item.orderDetailId] ?? 0;
            const variantSummary = formatOrderItemVariantSummary(item);
            return (
              <div key={item.orderDetailId} className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                  <img
                    src={img || "/placeholder.jpg"}
                    alt={name}
                    className="w-14 h-14 rounded-xl object-cover bg-white flex-shrink-0"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.onerror = null;
                      el.src = "/placeholder.jpg";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">
                      {name}
                    </p>
                    {variantSummary && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {variantSummary}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.canCreateReview && (
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-700">
                          Chưa đánh giá
                        </span>
                      )}
                      {item.canEditReview && (
                        <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                          Sửa 1 lần sau hoàn hàng
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setRatings((prev) => ({
                          ...prev,
                          [item.orderDetailId]: star,
                        }))
                      }
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        size={32}
                        className={
                          star <= rating
                            ? "text-yellow-400 fill-current drop-shadow-sm"
                            : "text-slate-200 hover:text-yellow-200"
                        }
                      />
                    </button>
                  ))}
                  <span
                    className={`ml-2 text-sm font-semibold ${rating ? "text-yellow-600" : "text-slate-300"}`}
                  >
                    {rating ? RATING_LABELS[rating] : "Chưa chọn"}
                  </span>
                </div>

                {item.canEditReview && (
                  <p className="text-xs text-orange-600 font-medium">
                    Bạn chỉ có thể sửa đánh giá này 1 lần sau khi đã gửi yêu cầu
                    hoàn hàng cho sản phẩm.
                  </p>
                )}

                <textarea
                  value={comments[item.orderDetailId] ?? ""}
                  onChange={(e) =>
                    setComments((prev) => ({
                      ...prev,
                      [item.orderDetailId]: e.target.value,
                    }))
                  }
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này... (không bắt buộc)"
                  rows={3}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-yellow-400 focus:outline-none resize-none transition-colors"
                />

                {index < actionableItems.length - 1 && (
                  <hr className="border-slate-100" />
                )}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-white flex gap-3 px-6 pb-6 pt-3 border-t border-slate-100 rounded-b-3xl">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
          >
            Để sau
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || actionableItems.length === 0}
            className="flex-1 py-3 rounded-2xl bg-yellow-400 text-slate-900 font-bold text-sm hover:bg-yellow-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Star size={15} className="fill-current" />
            {submitting ? "Đang gửi..." : "Lưu đánh giá"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Return Modal ─────────────────────────────────────────────────────────────
const RETURN_REASONS = [
  "Sản phẩm bị lỗi / hư hỏng",
  "Sản phẩm không đúng mô tả",
  "Giao sai sản phẩm / màu sắc / dung lượng",
  "Sản phẩm không như mong đợi",
  "Khác",
];

const ReturnModal = ({
  items,
  order, // <-- Thêm prop này
  orderId,
  onClose,
  onSubmitted,
}: {
  items: any[];
  order: any; // <-- Thêm prop này
  orderId: number;
  onClose: () => void;
  onSubmitted: () => void;
}) => {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [selected, setSelected] = useState<
    Record<number, { checked: boolean; quantity: number }>
  >(() =>
    Object.fromEntries(
      items.map((it) => [
        it.orderDetailId,
        { checked: true, quantity: it.quantity ?? 1 },
      ]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);

  // --- LOGIC TÀI CHÍNH ---
  const subtotal = Number(order?.subtotal ?? 0); // Tổng tiền hàng (trước giảm)
  const discountAmount = Number(
    order?.discountAmount ?? order?.discount_amount ?? 0,
  ); // Tổng tiền voucher

  const finalReason = reason === "Khác" ? customReason : reason;

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEvidenceFiles((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = "";
  };

  const removeImage = (idx: number) =>
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx));
  const toggleItem = (id: number) =>
    setSelected((p) => ({ ...p, [id]: { ...p[id], checked: !p[id].checked } }));
  const setQty = (id: number, qty: number) =>
    setSelected((p) => ({ ...p, [id]: { ...p[id], quantity: qty } }));

  const canSubmit =
    finalReason.trim().length > 0 && evidenceFiles.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!finalReason.trim()) {
      toast.error("Vui lòng chọn lý do hoàn hàng");
      return;
    }
    if (evidenceFiles.length === 0) {
      toast.error(
        "Vui lòng upload ít nhất 1 ảnh/video bằng chứng sản phẩm lỗi",
      );
      return;
    }
    const returnItems = items
      .filter((it) => selected[it.orderDetailId]?.checked)
      .map((it) => ({
        orderDetailId: it.orderDetailId,
        quantity: selected[it.orderDetailId].quantity,
      }));
    if (returnItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }
    try {
      setSubmitting(true);
      await orderService.createReturn(orderId, {
        reason: finalReason.trim(),
        customerNote: customerNote.trim() || undefined,
        items: returnItems,
        evidenceImages: evidenceFiles.length > 0 ? evidenceFiles : undefined,
      });
      toast.success("Đã gửi yêu cầu hoàn hàng! Chúng tôi sẽ phản hồi sớm.");
      onSubmitted();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Không thể gửi yêu cầu, vui lòng thử lại",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Tính TỔNG TIỀN HOÀN DỰ KIẾN của cả phiếu trả
  let totalEstimatedRefund = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-3xl z-10">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <RotateCcw size={16} className="text-orange-500" /> Yêu cầu
              hoàn/trả hàng
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chọn sản phẩm và lý do hoàn trả
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={17} className="text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Chọn sản phẩm */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-700">
                Sản phẩm cần hoàn trả
              </p>
              {discountAmount > 0 && (
                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                  Đơn hàng có Voucher
                </span>
              )}
            </div>
            <div className="space-y-3">
              {items.map((item) => {
                const id = item.orderDetailId;
                const name = item.productName ?? `Sản phẩm #${id}`;
                const img = item.productImage ?? "";
                const variantSummary = formatOrderItemVariantSummary(item);
                const maxQty = item.quantity ?? 1;
                const price = Number(item.price ?? 0); // Lấy giá 1 SP
                const sel = selected[id];

                // --- TÍNH TOÁN TIỀN HOÀN CHO SẢN PHẨM NÀY ---
                const selectedQty = sel?.checked ? sel.quantity : 0;
                const itemBaseTotal = price * selectedQty; // Tổng giá trị gốc của SP đang chọn trả

                let itemRefund = itemBaseTotal;
                let itemDiscountShare = 0;

                // Nếu có mã giảm giá -> Bổ đôi giảm giá theo tỷ lệ
                if (subtotal > 0 && discountAmount > 0 && sel?.checked) {
                  const ratio = itemBaseTotal / subtotal;
                  itemDiscountShare = ratio * discountAmount;
                  itemRefund = itemBaseTotal - itemDiscountShare;
                }

                totalEstimatedRefund += itemRefund; // Cộng dồn vào tổng

                return (
                  <label
                    key={id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-colors ${sel?.checked ? "border-orange-400 bg-orange-50" : "border-slate-100 bg-slate-50"}`}
                  >
                    <div className="pt-3">
                      <input
                        type="checkbox"
                        checked={sel?.checked ?? true}
                        onChange={() => toggleItem(id)}
                        className="w-4 h-4 accent-orange-500 flex-shrink-0"
                      />
                    </div>

                    <img
                      src={img || "/placeholder.jpg"}
                      alt={name}
                      className="w-14 h-14 mt-1 rounded-xl object-cover bg-white flex-shrink-0 border border-slate-100"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.onerror = null;
                        el.src = "/placeholder.jpg";
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                        {name}
                      </p>
                      {variantSummary && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {variantSummary}
                        </p>
                      )}

                      {/* Số lượng & Giá tiền */}
                      <div className="mt-2 flex items-end justify-between">
                        {/* Cột Số lượng */}
                        {sel?.checked && maxQty > 1 ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setQty(id, Math.max(1, sel.quantity - 1));
                              }}
                              className="w-6 h-6 rounded border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-slate-800">
                              {sel.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setQty(id, Math.min(maxQty, sel.quantity + 1));
                              }}
                              className="w-6 h-6 rounded border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Số lượng: {maxQty}
                          </p>
                        )}

                        {/* Cột Giá tiền */}
                        {sel?.checked && (
                          <div className="text-right">
                            {itemDiscountShare > 0 && (
                              <p className="text-xs text-slate-400 line-through mb-0.5">
                                {formatCurrency(itemBaseTotal)}
                              </p>
                            )}
                            <p className="text-sm font-black text-orange-600">
                              + {formatCurrency(itemRefund)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Lý do */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">
              Lý do hoàn trả <span className="text-rose-500">*</span>
            </p>
            <div className="space-y-2">
              {RETURN_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-colors ${reason === r ? "border-orange-400 bg-orange-50" : "border-slate-100 hover:border-slate-200"}`}
                >
                  <input
                    type="radio"
                    name="return-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-slate-700">{r}</span>
                </label>
              ))}
            </div>
            {reason === "Khác" && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Nhập lý do cụ thể..."
                rows={2}
                className="mt-2 w-full border-2 border-orange-300 rounded-xl px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none resize-none"
              />
            )}
          </div>

          {/* Ghi chú thêm */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">
              Ghi chú thêm{" "}
              <span className="text-slate-400 font-normal">
                (không bắt buộc)
              </span>
            </p>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Mô tả chi tiết tình trạng sản phẩm..."
              rows={3}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none resize-none transition-colors"
            />
          </div>

          {/* Ảnh bằng chứng */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">
              <Camera size={14} className="inline mr-1 text-orange-500" />
              Ảnh/Video bằng chứng <span className="text-rose-500">*</span>{" "}
              <span className="text-slate-400 font-normal">
                (tối đa 5 file)
              </span>
            </p>
            {evidenceFiles.length === 0 && (
              <p className="text-xs text-rose-500 mb-2 font-medium">
                Bạn cần upload ít nhất 1 ảnh/video chụp sản phẩm lỗi để gửi yêu
                cầu hoàn trả.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {evidenceFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="relative group w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200"
                >
                  {file.type.startsWith("video/") ? (
                    <video
                      src={URL.createObjectURL(file)}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`evidence-${idx}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Trash2 size={16} className="text-white" />
                  </button>
                </div>
              ))}
              {evidenceFiles.length < 5 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <ImageIcon size={20} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                    Thêm ảnh
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleAddImages}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 rounded-b-3xl">
          {/* Box hiển thị Tổng tiền hoàn */}
          <div className="px-6 py-3 bg-slate-50 flex items-center justify-between border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-600">
              Hoàn tiền dự kiến:
            </span>
            <span className="text-lg font-black text-orange-600">
              {formatCurrency(totalEstimatedRefund)}
            </span>
          </div>

          <div className="flex gap-3 px-6 pb-6 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} />
              {submitting
                ? "Đang gửi..."
                : evidenceFiles.length === 0
                  ? "Cần upload ảnh bằng chứng"
                  : "Gửi yêu cầu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const canRequestReturn = Boolean(order.canRequestReturn);
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

      {showReturnModal && (
        <ReturnModal
          items={items}
          order={order}
          orderId={orderId}
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
                    return (
                      <div
                        key={item.orderDetailId ?? idx}
                        className="flex gap-4 rounded-2xl border border-gray-100 p-4"
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
                          <p className="font-bold text-gray-900 truncate">
                            {name}
                          </p>
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
                          {event.eventType ??
                            event.type ??
                            "Cập nhật trạng thái"}
                        </p>
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
                        </div>
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
