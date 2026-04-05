// frontend/src/features/products/components/ProductReviews.tsx

import { useEffect, useState } from 'react';
import { Star, ThumbsUp, ShieldCheck, ChevronDown, Lock } from 'lucide-react';
import {
  reviewService,
  Review,
  ReviewStats,
  CreateReviewPayload,
  ProductReviewResponse,
} from '@/services/review.service';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

// ─── Star Rating Input ────────────────────────────────────────────────────────
const StarInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110">
          <Star size={28} className={`transition-colors ${star <= (hovered || value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
        </button>
      ))}
    </div>
  );
};

const StarDisplay = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} size={size} className={s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
    ))}
  </div>
);

// ─── Review Card ─────────────────────────────────────────────────────────────
const ReviewCard = ({
  review,
  onHelpful,
  showProductName,
}: {
  review: Review;
  onHelpful: (id: number) => void;
  showProductName?: boolean;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
          {review.userName?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">{review.userName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <StarDisplay rating={review.rating} size={12} />
            {review.isVerifiedPurchase && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <ShieldCheck size={10} /> Đã mua hàng
              </span>
            )}
          </div>
        </div>
      </div>
      <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">
        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
      </span>
    </div>
    {showProductName && review.productName && (
      <p className="text-[11px] font-black uppercase tracking-wider text-blue-600">
        Từ sản phẩm: {review.productName}
      </p>
    )}
    {review.variantName && (
      <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500">
        Phiên bản: {review.variantName}
      </span>
    )}
    {review.title && <p className="text-sm font-bold text-gray-800">{review.title}</p>}
    {review.comment && <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>}
    <button onClick={() => onHelpful(review.reviewId)}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors">
      <ThumbsUp size={12} /> Hữu ích ({review.helpfulCount})
    </button>
  </div>
);

// ─── Write Review Form ────────────────────────────────────────────────────────
const WriteReviewForm = ({ productId, onSuccess }: { productId: number; onSuccess: () => void }) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { toast.error('Vui lòng chọn số sao đánh giá'); return; }
    try {
      setSubmitting(true);
      const payload: CreateReviewPayload = { productId, rating, title: title.trim() || undefined, comment: comment.trim() || undefined };
      await reviewService.create(payload);
      toast.success('Cảm ơn bạn đã đánh giá! Đánh giá của bạn đã được ghi nhận.');
      setRating(0); setTitle(''); setComment('');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
      <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Viết đánh giá của bạn</h3>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">Đánh giá *</p>
        <StarInput value={rating} onChange={setRating} />
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Tiêu đề ngắn (không bắt buộc)"
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
      <textarea value={comment} onChange={(e) => setComment(e.target.value)}
        rows={4} placeholder="Chia sẻ trải nghiệm của bạn..."
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
      <button type="submit" disabled={submitting}
        className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
      </button>
    </form>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const ProductReviews = ({
  productId,
  onProductStatsChange,
}: {
  productId: number;
  onProductStatsChange?: (stats: ReviewStats) => void;
}) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<ProductReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  // ✅ State kiểm tra quyền review
  const [canReview, setCanReview] = useState<{ canReview: boolean; reason?: string } | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await reviewService.getByProduct(productId, { rating: filterRating, page, limit: 5 });
      setData(res);
      onProductStatsChange?.(res.productStats);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (data?.reviewSource === 'system_fallback' && filterRating && filterRating !== 5) {
      setFilterRating(undefined);
      setPage(1);
    }
  }, [data?.reviewSource, filterRating]);

  // ✅ Kiểm tra quyền review khi user đăng nhập
  useEffect(() => {
    if (!user) { setCanReview(null); return; }
    const check = async () => {
      try {
        setCheckingPermission(true);
        const result = await reviewService.checkCanReview(productId);
        setCanReview(result);
      } catch {
        setCanReview({ canReview: false, reason: 'Không thể kiểm tra quyền đánh giá' });
      } finally {
        setCheckingPermission(false);
      }
    };
    check();
  }, [user, productId]);

  useEffect(() => { void load(); }, [productId, filterRating, page]);

  const handleHelpful = async (reviewId: number) => {
    try { await reviewService.markHelpful(reviewId); void load(); }
    catch { toast.error('Không thể thực hiện'); }
  };

  const stats = data?.stats;
  const reviewSource = data?.reviewSource ?? 'empty';
  const showFallback = reviewSource === 'system_fallback';
  const ratingRows = showFallback ? [5] : [5, 4, 3, 2, 1];

  return (
    <div className="mt-16 pt-12 border-t-4 border-gray-50 space-y-8">
      <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tighter">Đánh giá từ khách hàng</h2>

      {showFallback && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-black text-amber-800">
            {data?.fallbackLabel || 'Tổng hợp đánh giá 5 sao từ khách hàng trên hệ thống'}
          </p>
          <p className="mt-1 text-sm text-amber-700">
            {data?.fallbackDescription || 'Sản phẩm này chưa có đánh giá riêng. Dưới đây là các đánh giá 5 sao từ sản phẩm khác để bạn tham khảo.'}
          </p>
        </div>
      )}

      {/* Stats */}
      {stats && reviewSource !== 'empty' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
            <p className="text-6xl font-black text-gray-800">{stats.average.toFixed(1)}</p>
            <StarDisplay rating={stats.average} size={20} />
            <p className="text-sm text-gray-400 mt-2 font-medium">
              {showFallback ? `${stats.total} đánh giá 5 sao` : `${stats.total} đánh giá`}
            </p>
          </div>
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-2">
            {ratingRows.map((star) => {
              const count = stats.distribution[star] || 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

              if (showFallback) {
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 w-6 text-right">{star}</span>
                    <Star size={12} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                  </div>
                );
              }

              return (
                <button key={star} onClick={() => { setFilterRating(filterRating === star ? undefined : star); setPage(1); }}
                  className={`w-full flex items-center gap-3 group transition-all ${filterRating === star ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}>
                  <span className="text-xs font-bold text-gray-500 w-6 text-right">{star}</span>
                  <Star size={12} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${filterRating === star ? 'bg-yellow-400' : 'bg-yellow-300 group-hover:bg-yellow-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter chips */}
      {reviewSource === 'product' && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setFilterRating(undefined); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!filterRating ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Tất cả
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button key={s} onClick={() => { setFilterRating(filterRating === s ? undefined : s); setPage(1); }}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filterRating === s ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s} <Star size={10} className="fill-current" />
            </button>
          ))}
        </div>
      )}

      {showFallback && (
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-4 py-1.5 text-xs font-bold text-yellow-700">
            5 <Star size={10} className="fill-current" /> tổng hợp
          </span>
        </div>
      )}

      {/* ✅ LOGIC HIỂN THỊ NÚT ĐÁNH GIÁ */}
      {!user ? (
        // Chưa đăng nhập
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <Lock size={16} className="text-gray-400" />
          <p className="text-sm text-gray-500">
            <Link to="/login" className="text-blue-600 font-bold hover:underline">Đăng nhập</Link> để viết đánh giá sản phẩm
          </p>
        </div>
      ) : checkingPermission ? (
        <div className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
      ) : canReview?.canReview ? (
        // ✅ Đã mua hàng → cho phép đánh giá
        <>
          <button onClick={() => setShowForm((p) => !p)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
            <Star size={14} />
            {showForm ? 'Đóng form' : 'Viết đánh giá'}
            <ChevronDown size={14} className={`transition-transform ${showForm ? 'rotate-180' : ''}`} />
          </button>
          {showForm && (
            <WriteReviewForm productId={productId} onSuccess={() => { setShowForm(false); void load(); }} />
          )}
        </>
      ) : (
        // ❌ Chưa mua hàng hoặc đã review rồi
        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <Lock size={16} className="text-amber-500" />
          <p className="text-sm text-amber-700 font-medium">
            {canReview?.reason || 'Bạn cần mua sản phẩm này trước khi đánh giá'}
          </p>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : reviewSource === 'empty' ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
          <Star size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">Sản phẩm này chưa có đánh giá nào</p>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Hệ thống hiện cũng chưa có đánh giá 5 sao để tham khảo.
          </p>
        </div>
      ) : data?.reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
          <Star size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">
            {showFallback ? 'Không có đánh giá 5 sao phù hợp' : 'Chưa có đánh giá nào'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.reviews.map((r) => (
            <ReviewCard
              key={r.reviewId}
              review={r}
              onHelpful={handleHelpful}
              showProductName={showFallback}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${page === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
