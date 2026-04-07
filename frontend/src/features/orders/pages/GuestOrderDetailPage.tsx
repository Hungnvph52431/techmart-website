import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
  X,
  Camera,
  ImageIcon,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { orderService } from "@/services/order.service";
import {
  reviewService,
  type OrderReviewItemSummary,
  type OrderReviewSummary,
} from "@/services/review.service";
import type { OrderDetailView } from "@/types/order";
import {
  getGuestOrderAccess,
  persistGuestOrderAccess,
} from "@/features/orders/lib/guestOrderAccess";

const BACKEND_URL =
  (import.meta.env.VITE_API_URL as string)?.replace("/api", "") ||
  "http://localhost:5001";

const getImageUrl = (url?: string | null) => {
  if (!url) return "/placeholder.jpg";
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

const formatDateTime = (dateStr?: string) =>
  dateStr
    ? new Date(dateStr).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Đã hoàn/trả",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng",
  vnpay: "VNPay",
  bank_transfer: "Chuyển khoản",
  momo: "MoMo",
  wallet: "Ví TechMart",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  refunded: "Đã hoàn tiền",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  shipping: "bg-violet-100 text-violet-700 border-violet-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-lime-100 text-lime-700 border-lime-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  returned: "bg-orange-100 text-orange-700 border-orange-200",
};

const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  received: "Đã nhận hàng",
  refunded: "Đã hoàn tiền",
  closed: "Đã đóng",
};

const RETURN_REASONS = [
  "Sản phẩm bị lỗi / hư hỏng",
  "Sản phẩm không đúng mô tả",
  "Giao sai sản phẩm / màu sắc / dung lượng",
  "Sản phẩm không như mong đợi",
  "Khác",
];

const RATING_LABELS = ["", "Tệ", "Không tốt", "Bình thường", "Tốt", "Xuất sắc"];

const formatVariantSummary = (item: {
  variantName?: string;
  sku?: string;
}) => {
  if (item.variantName && item.sku) {
    return `${item.variantName} • SKU: ${item.sku}`;
  }
  if (item.variantName) {
    return item.variantName;
  }
  if (item.sku) {
    return `SKU: ${item.sku}`;
  }
  return "";
};

type LookupLocationState = {
  email?: string;
};

const GuestReviewModal = ({
  items,
  orderCode,
  accessToken,
  onClose,
  onSubmitted,
}: {
  items: OrderReviewItemSummary[];
  orderCode: string;
  accessToken: string;
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
  const [touched, setTouched] = useState<Set<number>>(new Set());

  const itemsToSubmit = actionableItems.filter((item) =>
    touched.has(item.orderDetailId),
  );

  const markTouched = (orderDetailId: number) => {
    setTouched((prev) => new Set(prev).add(orderDetailId));
  };

  const handleSubmit = async () => {
    if (itemsToSubmit.length === 0) {
      toast.error("Vui lòng đánh giá ít nhất 1 sản phẩm");
      return;
    }

    try {
      setSubmitting(true);
      const results = await Promise.allSettled(
        itemsToSubmit.map((item) => {
          const payload = {
            orderCode,
            rating: ratings[item.orderDetailId] ?? item.review?.rating ?? 5,
            comment: comments[item.orderDetailId]?.trim() ?? "",
          };

          if (item.canEditReview && item.review?.reviewId) {
            return reviewService.updateGuest(
              item.review.reviewId,
              payload,
              accessToken,
            );
          }

          return reviewService.createGuest(
            {
              orderCode,
              productId: item.productId,
              orderDetailId: item.orderDetailId,
              rating: payload.rating,
              comment: payload.comment,
            },
            accessToken,
          );
        }),
      );

      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length === results.length) {
        const firstError = (failed[0] as PromiseRejectedResult).reason;
        toast.error(
          firstError?.response?.data?.message ||
            "Không thể gửi đánh giá, vui lòng thử lại",
        );
        return;
      }

      if (failed.length > 0) {
        toast.success(
          `Đã gửi ${results.length - failed.length}/${results.length} đánh giá`,
        );
      } else {
        toast.success("Cảm ơn bạn đã đánh giá!");
      }

      onSubmitted();
    } catch {
      toast.error("Không thể gửi đánh giá, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 rounded-t-3xl">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Đánh giá sản phẩm
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {actionableItems.length} sản phẩm có thể đánh giá hoặc chỉnh sửa
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 transition-colors hover:bg-slate-100"
          >
            <X size={17} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-8 px-6 py-5">
          {actionableItems.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Hiện không có sản phẩm nào đủ điều kiện để đánh giá hoặc sửa đánh
                giá.
              </p>
            </div>
          )}

          {actionableItems.map((item, index) => {
            const rating = ratings[item.orderDetailId] ?? 0;
            const variantSummary = formatVariantSummary(item);

            return (
              <div key={item.orderDetailId} className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <img
                    src={getImageUrl(item.productImage)}
                    alt={item.productName}
                    className="h-14 w-14 rounded-xl bg-white object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {item.productName}
                    </p>
                    {variantSummary && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {variantSummary}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.canCreateReview && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-700">
                          Chưa đánh giá
                        </span>
                      )}
                      {item.canEditReview && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
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
                      onClick={() => {
                        setRatings((prev) => ({
                          ...prev,
                          [item.orderDetailId]: star,
                        }));
                        markTouched(item.orderDetailId);
                      }}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        size={32}
                        className={
                          star <= rating
                            ? "fill-current text-yellow-400 drop-shadow-sm"
                            : "text-slate-200 hover:text-yellow-200"
                        }
                      />
                    </button>
                  ))}
                  <span
                    className={`ml-2 text-sm font-semibold ${
                      rating ? "text-yellow-600" : "text-slate-300"
                    }`}
                  >
                    {rating ? RATING_LABELS[rating] : "Chưa chọn"}
                  </span>
                </div>

                {item.canEditReview && (
                  <p className="text-xs font-medium text-orange-600">
                    Bạn chỉ có thể sửa đánh giá này 1 lần sau khi đã gửi yêu cầu
                    hoàn hàng cho sản phẩm.
                  </p>
                )}

                <textarea
                  value={comments[item.orderDetailId] ?? ""}
                  onChange={(event) => {
                    setComments((prev) => ({
                      ...prev,
                      [item.orderDetailId]: event.target.value,
                    }));
                    markTouched(item.orderDetailId);
                  }}
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                  rows={3}
                  className="w-full resize-none rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm transition-colors focus:border-yellow-400 focus:outline-none"
                />

                {index < actionableItems.length - 1 && (
                  <hr className="border-slate-100" />
                )}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white px-6 pb-6 pt-3 rounded-b-3xl">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
          >
            Để sau
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || itemsToSubmit.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-yellow-500 disabled:opacity-50"
          >
            <Star size={15} className="fill-current" />
            {submitting
              ? "Đang gửi..."
              : itemsToSubmit.length > 0
                ? `Lưu ${itemsToSubmit.length} đánh giá`
                : "Lưu đánh giá"}
          </button>
        </div>
      </div>
    </div>
  );
};

const GuestReturnModal = ({
  items,
  orderCode,
  accessToken,
  returnedOrderDetailIds,
  onClose,
  onSubmitted,
}: {
  items: OrderDetailView["items"];
  orderCode: string;
  accessToken: string;
  returnedOrderDetailIds: Set<number>;
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
      items.map((item) => [
        item.orderDetailId,
        {
          checked: !returnedOrderDetailIds.has(item.orderDetailId),
          quantity: item.quantity ?? 1,
        },
      ]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);

  const finalReason = reason === "Khác" ? customReason.trim() : reason.trim();

  const handleAddImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setEvidenceFiles((prev) => [...prev, ...files].slice(0, 5));
    event.target.value = "";
  };

  const removeImage = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, current) => current !== index));
  };

  const toggleItem = (orderDetailId: number) => {
    setSelected((prev) => ({
      ...prev,
      [orderDetailId]: {
        ...prev[orderDetailId],
        checked: !prev[orderDetailId]?.checked,
      },
    }));
  };

  const setQuantity = (orderDetailId: number, quantity: number) => {
    setSelected((prev) => ({
      ...prev,
      [orderDetailId]: {
        ...prev[orderDetailId],
        quantity,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!finalReason) {
      toast.error("Vui lòng chọn lý do hoàn hàng");
      return;
    }

    const returnItems = items
      .filter((item) => selected[item.orderDetailId]?.checked)
      .map((item) => ({
        orderDetailId: item.orderDetailId,
        quantity: selected[item.orderDetailId].quantity,
      }));

    if (returnItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }

    if (evidenceFiles.length === 0) {
      toast.error("Vui lòng tải lên ít nhất 1 ảnh bằng chứng");
      return;
    }

    try {
      setSubmitting(true);
      await orderService.createGuestReturn(
        orderCode,
        {
          reason: finalReason,
          customerNote: customerNote.trim() || undefined,
          items: returnItems,
          evidenceImages: evidenceFiles,
        },
        accessToken,
      );
      toast.success("Đã gửi yêu cầu hoàn hàng");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 rounded-t-3xl">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <RotateCcw size={16} className="text-orange-500" />
              Yêu cầu hoàn hàng
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Chọn sản phẩm và cung cấp bằng chứng hoàn trả
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 transition-colors hover:bg-slate-100"
          >
            <X size={17} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">
              Sản phẩm cần hoàn trả
            </p>
            <div className="space-y-3">
              {items.map((item) => {
                const selectedState = selected[item.orderDetailId];
                const disabled = returnedOrderDetailIds.has(item.orderDetailId);
                return (
                  <label
                    key={item.orderDetailId}
                    className={`flex gap-3 rounded-2xl border p-3 ${
                      disabled
                        ? "border-gray-100 bg-gray-50 opacity-50"
                        : selectedState?.checked
                          ? "border-orange-300 bg-orange-50"
                          : "border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selectedState?.checked)}
                      disabled={disabled}
                      onChange={() => toggleItem(item.orderDetailId)}
                      className="mt-1 h-4 w-4 rounded accent-orange-500"
                    />
                    <img
                      src={getImageUrl(item.productImage)}
                      alt={item.productName}
                      className="h-14 w-14 rounded-xl bg-slate-50 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {item.productName}
                      </p>
                      {formatVariantSummary(item) && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatVariantSummary(item)}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-3">
                        {selectedState?.checked && item.quantity > 1 ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                setQuantity(
                                  item.orderDetailId,
                                  Math.max(1, selectedState.quantity - 1),
                                );
                              }}
                              className="h-6 w-6 rounded border border-slate-300 bg-white text-slate-700"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-slate-800">
                              {selectedState.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                setQuantity(
                                  item.orderDetailId,
                                  Math.min(item.quantity, selectedState.quantity + 1),
                                );
                              }}
                              className="h-6 w-6 rounded border border-slate-300 bg-white text-slate-700"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Số lượng: {item.quantity}
                          </p>
                        )}
                        <span className="text-sm font-black text-orange-600">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">
              Lý do hoàn trả
            </p>
            <div className="space-y-2">
              {RETURN_REASONS.map((item) => (
                <label
                  key={item}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2.5 transition-colors ${
                    reason === item
                      ? "border-orange-400 bg-orange-50"
                      : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="guest-return-reason"
                    value={item}
                    checked={reason === item}
                    onChange={() => setReason(item)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span className="text-sm text-slate-700">{item}</span>
                </label>
              ))}
            </div>
            {reason === "Khác" && (
              <textarea
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                rows={2}
                placeholder="Nhập lý do cụ thể..."
                className="mt-2 w-full resize-none rounded-xl border-2 border-orange-300 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
              />
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">
              Ghi chú thêm
            </p>
            <textarea
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
              rows={3}
              placeholder="Mô tả chi tiết tình trạng sản phẩm..."
              className="w-full resize-none rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm transition-colors focus:border-orange-400 focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">
              <Camera size={14} className="mr-1 inline text-orange-500" />
              Ảnh/video bằng chứng
            </p>
            <div className="flex flex-wrap gap-2">
              {evidenceFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="group relative h-20 w-20 overflow-hidden rounded-xl border-2 border-slate-200"
                >
                  {file.type.startsWith("video/") ? (
                    <video
                      src={URL.createObjectURL(file)}
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`evidence-${index}`}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 size={16} className="text-white" />
                  </button>
                </div>
              ))}
              {evidenceFiles.length < 5 && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 transition-colors hover:border-orange-400">
                  <ImageIcon size={20} className="text-slate-400" />
                  <span className="mt-0.5 text-[10px] font-bold text-slate-400">
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

        <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white px-6 pb-6 pt-4 rounded-b-3xl">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white transition-all hover:bg-orange-600 disabled:opacity-50"
          >
            <RotateCcw size={15} />
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const GuestOrderDetailPage = () => {
  const { orderCode = "" } = useParams<{ orderCode: string }>();
  const location = useLocation();
  const locationState = (location.state || {}) as LookupLocationState;
  const storedSession = getGuestOrderAccess(orderCode);

  const [email, setEmail] = useState(locationState.email || storedSession?.email || "");
  const [accessToken, setAccessToken] = useState(storedSession?.accessToken || "");
  const [orderDetail, setOrderDetail] = useState<OrderDetailView | null>(null);
  const [reviewSummary, setReviewSummary] = useState<OrderReviewSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const normalizedOrderCode = useMemo(
    () => orderCode.trim().toUpperCase(),
    [orderCode],
  );

  const fetchOrder = async (lookupEmail: string) => {
    if (!normalizedOrderCode) {
      setErrorMessage("Không tìm thấy mã đơn hàng hợp lệ");
      return;
    }

    if (!lookupEmail.trim()) {
      setErrorMessage("Vui lòng nhập email đặt hàng");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const data = await orderService.lookupGuestOrder(
        normalizedOrderCode,
        lookupEmail.trim(),
      );
      const nextAccessToken = data.accessToken;
      persistGuestOrderAccess({
        orderCode: normalizedOrderCode,
        email: lookupEmail.trim(),
        accessToken: nextAccessToken,
      });
      setEmail(lookupEmail.trim());
      setAccessToken(nextAccessToken);
      setOrderDetail(data.order);

      const summary = await reviewService
        .getGuestOrderSummary(normalizedOrderCode, nextAccessToken)
        .catch(() => null);
      setReviewSummary(summary);
    } catch (error: any) {
      setOrderDetail(null);
      setReviewSummary(null);
      const message =
        error?.response?.data?.message || "Không tìm thấy đơn hàng phù hợp";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const emailFromState = locationState.email || storedSession?.email;
    if (emailFromState) {
      void fetchOrder(emailFromState);
    }
  }, [locationState.email, normalizedOrderCode, storedSession?.email]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await fetchOrder(email);
  };

  const handleReload = async () => {
    if (!email.trim()) {
      toast.error("Vui lòng nhập email đặt hàng");
      return;
    }
    await fetchOrder(email);
  };

  const handleConfirmDelivered = async () => {
    if (!accessToken) {
      toast.error("Vui lòng tra cứu lại đơn hàng trước khi thao tác");
      return;
    }
    try {
      setActionLoading("confirm");
      await orderService.confirmDeliveredGuest(normalizedOrderCode, accessToken);
      toast.success("Đã xác nhận nhận hàng");
      await fetchOrder(email);
      setShowReviewModal(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Không thể xác nhận đã nhận hàng",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRepay = async () => {
    if (!accessToken) {
      toast.error("Vui lòng tra cứu lại đơn hàng trước khi thanh toán");
      return;
    }

    try {
      setActionLoading("repay");
      const paymentUrl = await orderService.repayGuestVNPay(
        normalizedOrderCode,
        accessToken,
      );
      window.location.href = paymentUrl;
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Không thể tạo link thanh toán lại",
      );
      setActionLoading(null);
    }
  };

  const order = orderDetail?.order;
  const items = orderDetail?.items ?? [];
  const timeline = orderDetail?.timeline ?? [];
  const returns = orderDetail?.returns ?? [];
  const returnedOrderDetailIds = new Set(
    returns
      .filter((item) => item.status !== "rejected")
      .flatMap((item) => item.items.map((returnItem) => returnItem.orderDetailId)),
  );
  const reviewItems = reviewSummary?.items ?? [];
  const actionableReviewItems = reviewItems.filter(
    (item) => item.canCreateReview || item.canEditReview,
  );
  const hasUnreturnedItems = items.some(
    (item) => !returnedOrderDetailIds.has(item.orderDetailId),
  );
  const canRequestReturn = Boolean(order?.canRequestReturn) && hasUnreturnedItems;
  const canConfirmReceived = order?.status === "delivered";
  const canReview = actionableReviewItems.length > 0;
  const canRepay =
    order?.paymentMethod === "vnpay" &&
    order?.paymentStatus !== "paid" &&
    order?.status !== "cancelled";

  return (
    <>
      {showReviewModal && order && accessToken && (
        <GuestReviewModal
          items={reviewItems}
          orderCode={normalizedOrderCode}
          accessToken={accessToken}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={() => {
            setShowReviewModal(false);
            void fetchOrder(email);
          }}
        />
      )}

      {showReturnModal && order && accessToken && (
        <GuestReturnModal
          items={items}
          orderCode={normalizedOrderCode}
          accessToken={accessToken}
          returnedOrderDetailIds={returnedOrderDetailIds}
          onClose={() => setShowReturnModal(false)}
          onSubmitted={() => {
            setShowReturnModal(false);
            void fetchOrder(email);
          }}
        />
      )}

      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Quay lại tra cứu
          </Link>
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">
              Mã đơn hàng
            </p>
            <p className="font-mono text-lg font-black text-blue-600">
              #{normalizedOrderCode}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-800">
              Tra cứu đơn hàng
            </h1>
            <p className="text-sm font-medium text-gray-500">
              Nhập email đã dùng khi đặt hàng để xem và thao tác với đơn #{normalizedOrderCode}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-black uppercase tracking-widest text-gray-400">
                Email đặt hàng
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-2xl border border-gray-200 py-3 pl-11 pr-4 text-sm font-bold text-gray-700 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-[50px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
              >
                <Search size={16} />
                {loading ? "Đang tra cứu..." : "Xem đơn hàng"}
              </button>
              {order && (
                <button
                  type="button"
                  onClick={() => void handleReload()}
                  className="inline-flex h-[50px] items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <RefreshCw size={15} />
                  Tải lại
                </button>
              )}
            </div>
          </form>

          {errorMessage && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
              {errorMessage}
            </div>
          )}
        </div>

        {!order && !loading && (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <Package size={40} className="mx-auto mb-4 text-gray-200" />
            <h2 className="text-lg font-semibold text-gray-700">
              Chưa có dữ liệu đơn hàng
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Điền đúng email đặt hàng để xem chi tiết đơn của bạn.
            </p>
          </div>
        )}

        {loading && (
          <div className="rounded-3xl border border-gray-200 bg-white px-6 py-16 text-center text-sm font-bold text-gray-500">
            Đang tải thông tin đơn hàng...
          </div>
        )}

        {order && (
          <>
            <div className="flex flex-wrap gap-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              {canConfirmReceived && (
                <button
                  onClick={handleConfirmDelivered}
                  disabled={actionLoading === "confirm"}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  {actionLoading === "confirm"
                    ? "Đang xác nhận..."
                    : "Đã nhận hàng"}
                </button>
              )}

              {canRequestReturn && (
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600"
                >
                  <RotateCcw size={15} />
                  Yêu cầu hoàn hàng
                </button>
              )}

              {canReview && (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-yellow-500"
                >
                  <Star size={15} className="fill-current" />
                  Đánh giá
                </button>
              )}

              {canRepay && (
                <button
                  onClick={handleRepay}
                  disabled={actionLoading === "repay"}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  <RefreshCw size={15} />
                  {actionLoading === "repay"
                    ? "Đang chuyển hướng..."
                    : "Thanh toán lại"}
                </button>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black text-gray-800">
                      #{order.orderCode}
                    </h2>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${STATUS_BADGE_STYLES[order.status] || "border-gray-200 bg-gray-100 text-gray-600"}`}
                    >
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    Đặt lúc {formatDateTime(order.orderDate)}
                  </p>
                  {order.returnDeadlineAt && (
                    <p
                      className={`mt-2 text-xs font-semibold ${
                        order.returnWindowExpired
                          ? "text-rose-600"
                          : "text-orange-600"
                      }`}
                    >
                      {order.returnWindowExpired
                        ? `Đã hết hạn yêu cầu hoàn hàng sau ${order.returnWindowDays ?? 7} ngày`
                        : `Có thể yêu cầu hoàn hàng đến ${formatDateTime(order.returnDeadlineAt)}`}
                    </p>
                  )}
                  {order.cancelReason && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      <span className="font-black">Lý do hủy:</span>{" "}
                      {order.cancelReason}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-5 text-lg font-black uppercase tracking-wider text-gray-800">
                    Sản phẩm trong đơn
                  </h3>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={item.orderDetailId}
                        className="flex gap-4 rounded-2xl border border-gray-100 p-4"
                      >
                        <img
                          src={getImageUrl(item.productImage)}
                          alt={item.productName}
                          className="h-20 w-20 rounded-2xl border border-gray-100 bg-gray-50 object-contain"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-gray-800">
                            {item.productName}
                          </p>
                          {formatVariantSummary(item) && (
                            <p className="mt-1 text-xs font-semibold text-gray-500">
                              {formatVariantSummary(item)}
                            </p>
                          )}
                          <p className="mt-2 text-xs font-bold text-gray-400">
                            Số lượng: x{item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-red-600">
                            {formatCurrency(item.subtotal)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-gray-400">
                            {formatCurrency(item.price)}/sp
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {returns.length > 0 && (
                  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-5 text-lg font-black uppercase tracking-wider text-gray-800">
                      Yêu cầu hoàn hàng
                    </h3>
                    <div className="space-y-4">
                      {returns.map((returnItem) => (
                        <div
                          key={returnItem.orderReturnId}
                          className="rounded-2xl border border-gray-100 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-gray-800">
                                #{returnItem.requestCode}
                              </p>
                              <p className="mt-1 text-xs text-gray-400">
                                Gửi lúc {formatDateTime(returnItem.requestedAt)}
                              </p>
                            </div>
                            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
                              {RETURN_STATUS_LABELS[returnItem.status] ||
                                returnItem.status}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-gray-600">
                            <span className="font-bold text-gray-700">
                              Lý do:
                            </span>{" "}
                            {returnItem.reason}
                          </p>
                          {returnItem.customerNote && (
                            <p className="mt-2 text-sm text-gray-500">
                              {returnItem.customerNote}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-5 text-lg font-black uppercase tracking-wider text-gray-800">
                    Lịch sử xử lý
                  </h3>
                  <div className="space-y-5">
                    {timeline.map((event) => (
                      <div key={event.orderEventId} className="flex gap-4">
                        <div className="mt-1 h-3 w-3 rounded-full bg-blue-500" />
                        <div className="space-y-1">
                          <p className="text-sm font-black text-gray-800">
                            {event.eventLabel || event.eventType}
                          </p>
                          {event.toLabel && (
                            <p className="text-xs font-semibold text-blue-600">
                              {event.toLabel}
                            </p>
                          )}
                          {event.displayNote && (
                            <p className="text-xs text-gray-500">
                              {event.displayNote}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {formatDateTime(event.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-black uppercase tracking-wider text-gray-800">
                    Thông tin người đặt
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="font-bold text-gray-400">Họ tên</span>
                      <span className="font-black text-gray-700">
                        {order.customer.name || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-bold text-gray-400">Email</span>
                      <span className="font-black text-gray-700">
                        {order.customer.email || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-black uppercase tracking-wider text-gray-800">
                    Thanh toán
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="font-bold text-gray-400">Phương thức</span>
                      <span className="font-black text-gray-700">
                        {PAYMENT_METHOD_LABELS[order.paymentMethod] ||
                          order.paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-bold text-gray-400">Trạng thái</span>
                      <span className="font-black text-gray-700">
                        {PAYMENT_STATUS_LABELS[order.paymentStatus] ||
                          order.paymentStatus}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-bold text-gray-400">Tạm tính</span>
                      <span className="font-black text-gray-700">
                        {formatCurrency(order.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-bold text-gray-400">Giảm giá</span>
                      <span className="font-black text-emerald-600">
                        -{formatCurrency(order.discountAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-gray-100 pt-3">
                      <span className="font-black text-gray-800">Tổng cộng</span>
                      <span className="text-lg font-black text-red-600">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-black uppercase tracking-wider text-gray-800">
                    Thông tin giao hàng
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="font-bold text-gray-400">Người nhận</span>
                      <span className="font-black text-gray-700">
                        {order.shipping.name || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-bold text-gray-400">Điện thoại</span>
                      <span className="font-black text-gray-700">
                        {order.shipping.phone || "—"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                        Địa chỉ
                      </span>
                      <p className="text-sm font-semibold text-gray-700">
                        {order.shipping.fullAddress || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
