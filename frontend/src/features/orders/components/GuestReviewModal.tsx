import { useState } from "react";
import toast from "react-hot-toast";
import { Star, X } from "lucide-react";
import {
  reviewService,
  type OrderReviewItemSummary,
} from "@/services/review.service";
import { useEscapeKey } from "@/hooks/useEscapeKey";

const BACKEND_URL =
  (import.meta.env.VITE_API_URL as string)?.replace("/api", "") ||
  "http://localhost:5001";

const getImageUrl = (url?: string | null) => {
  if (!url) return "/placeholder.jpg";
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

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

type Props = {
  items: OrderReviewItemSummary[];
  orderCode: string;
  accessToken: string;
  onClose: () => void;
  onSubmitted: () => void;
};

export const GuestReviewModal = ({
  items,
  orderCode,
  accessToken,
  onClose,
  onSubmitted,
}: Props) => {
  useEscapeKey(onClose);
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
