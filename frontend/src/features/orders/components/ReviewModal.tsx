import { useState } from "react";
import toast from "react-hot-toast";
import { Star, X } from "lucide-react";
import {
  reviewService,
  type OrderReviewItemSummary,
} from "@/services/review.service";
import { formatOrderItemVariantSummary } from "../lib/orderFormatters";
import { RATING_LABELS } from "../lib/orderLabels";

type Props = {
  items: OrderReviewItemSummary[];
  orderId: number;
  onClose: () => void;
  onSubmitted: () => void;
};

export const ReviewModal = ({ items, orderId, onClose, onSubmitted }: Props) => {
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

  const markTouched = (orderDetailId: number) => {
    setTouched((prev) => new Set(prev).add(orderDetailId));
  };

  const itemsToSubmit = actionableItems.filter((item) =>
    touched.has(item.orderDetailId),
  );

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
                  onChange={(e) => {
                    setComments((prev) => ({
                      ...prev,
                      [item.orderDetailId]: e.target.value,
                    }));
                    markTouched(item.orderDetailId);
                  }}
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
            disabled={submitting || itemsToSubmit.length === 0}
            className="flex-1 py-3 rounded-2xl bg-yellow-400 text-slate-900 font-bold text-sm hover:bg-yellow-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
