import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Star, Search, Eye, EyeOff, AlertTriangle, RefreshCw,
  ShieldCheck, X, Calendar, Package, MessageSquare
} from 'lucide-react';
import { reviewService, Review } from '@/services/review.service';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã hiện',
  rejected: 'Đã ẩn',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

const StarDisplay = ({ rating, size = 12 }: { rating: number; size?: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} size={size} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
    ))}
  </div>
);

// ─── MODAL CHI TIẾT ───────────────────────────────────────────────────────────
const ReviewDetailModal = ({
  review,
  onClose,
  onToggleStatus,
  submitting,
}: {
  review: Review;
  onClose: () => void;
  onToggleStatus: (r: Review) => void;
  submitting: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-black text-gray-800 uppercase italic tracking-tight">Chi tiết đánh giá</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Người dùng */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
            {review.userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-black text-gray-800">{review.userName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {review.isVerifiedPurchase && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={10} /> Đã mua hàng
                </span>
              )}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_STYLES[review.status]}`}>
                {STATUS_LABELS[review.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Thông tin đơn hàng */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-2xl p-3 flex items-center gap-2">
            <Package size={14} className="text-gray-400" />
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Sản phẩm</p>
              <p className="text-sm font-black text-gray-800">#{review.productId}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Thời gian</p>
              <p className="text-sm font-black text-gray-800">
                {new Date(review.createdAt).toLocaleString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Đánh giá sao */}
        <div className="bg-yellow-50 rounded-2xl p-4">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Điểm đánh giá</p>
          <div className="flex items-center gap-3">
            <StarDisplay rating={review.rating} size={24} />
            <span className="text-2xl font-black text-gray-800">{review.rating}/5</span>
          </div>
        </div>

        {/* Nội dung */}
        <div className="space-y-3">
          {review.title && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Tiêu đề</p>
              <p className="text-sm font-bold text-gray-800 bg-gray-50 rounded-xl px-4 py-2">{review.title}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1">
              <MessageSquare size={10} /> Nội dung chi tiết
            </p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 min-h-[80px]">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {review.comment || <span className="text-gray-400 italic">Không có nội dung</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Hữu ích */}
        <p className="text-xs text-gray-400 font-bold">
          👍 {review.helpfulCount} người thấy hữu ích
        </p>
      </div>

      {/* Footer actions */}
      <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
        <button onClick={onClose}
          className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-sm font-black text-gray-600 hover:bg-gray-50 transition-colors">
          Đóng
        </button>
        <button
          onClick={() => onToggleStatus(review)}
          disabled={submitting}
          className={`flex-1 py-2.5 rounded-2xl text-sm font-black text-white transition-colors disabled:opacity-50 ${
            review.status === 'approved'
              ? 'bg-rose-500 hover:bg-rose-600'
              : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
          {submitting ? 'Đang xử lý...' : review.status === 'approved' ? '🙈 Ẩn đánh giá' : '👁️ Hiện đánh giá'}
        </button>
      </div>
    </div>
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterRating, setFilterRating] = useState<number | undefined>();
  const [filterSuspicious, setFilterSuspicious] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      const res = await reviewService.adminGetAll({
        status: filterStatus,
        rating: filterRating,
        search: search || undefined,
        suspicious: filterSuspicious || undefined,
        page,
        limit: 15,
      });
      setReviews(res.reviews);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      toast.error('Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [filterStatus, filterRating, filterSuspicious, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load();
  };

  const handleToggleStatus = async (review: Review) => {
    const nextStatus = review.status === 'approved' ? 'rejected' : 'approved';
    const label = nextStatus === 'approved' ? 'hiện' : 'ẩn';
    try {
      setSubmitting(review.reviewId);
      await reviewService.updateStatus(review.reviewId, nextStatus);
      toast.success(`Đã ${label} đánh giá`);
      setSelectedReview(null);
      void load();
    } catch {
      toast.error('Thao tác thất bại');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal chi tiết */}
      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onToggleStatus={handleToggleStatus}
          submitting={submitting === selectedReview.reviewId}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Quản lý đánh giá</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Tổng: {total} đánh giá</p>
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên sản phẩm, người dùng..."
              className="pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
            />
            <Search className="absolute left-3 top-3 text-gray-400" size={15} />
          </form>
          <button onClick={load} className="p-2.5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 shadow-sm">
            <RefreshCw size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {s === 'all' ? 'Tất cả' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
          {[undefined, 1, 2, 3, 4, 5].map((r) => (
            <button key={r ?? 'all'} onClick={() => { setFilterRating(r); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterRating === r ? 'bg-yellow-400 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {r ? `${r}★` : 'Tất cả sao'}
            </button>
          ))}
        </div>
        <button onClick={() => { setFilterSuspicious(!filterSuspicious); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
            filterSuspicious ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-100 hover:border-orange-300'
          }`}>
          <AlertTriangle size={14} /> Đáng ngờ (Bomb review)
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-blue-600 font-black uppercase italic animate-pulse text-sm">Đang tải...</div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Star size={36} className="text-gray-200" />
            <p className="text-sm text-gray-400 font-bold">Không có đánh giá nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-5 py-3 text-left">Người dùng</th>
                  <th className="px-5 py-3 text-left">Sản phẩm</th>
                  <th className="px-5 py-3 text-left">Đánh giá</th>
                  <th className="px-5 py-3 text-left">Nội dung</th>
                  <th className="px-5 py-3 text-left">Trạng thái</th>
                  <th className="px-5 py-3 text-left">Ngày</th>
                  <th className="px-5 py-3 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reviews.map((review) => (
                  <tr
                    key={review.reviewId}
                    onClick={() => setSelectedReview(review)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                          {review.userName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">{review.userName}</p>
                          {review.isVerifiedPurchase && (
                            <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold">
                              <ShieldCheck size={9} /> Đã mua
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-blue-600">#{review.productId}</p>
                      {review.productName && (
                        <p className="text-[10px] text-gray-400 max-w-[120px] truncate">{review.productName}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StarDisplay rating={review.rating} />
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      {review.title && <p className="text-xs font-bold text-gray-800 truncate">{review.title}</p>}
                      {review.comment && <p className="text-xs text-gray-500 truncate">{review.comment}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_STYLES[review.status]}`}>
                        {STATUS_LABELS[review.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleStatus(review)}
                        disabled={submitting === review.reviewId}
                        title={review.status === 'approved' ? 'Ẩn review này' : 'Hiện review này'}
                        className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                          review.status === 'approved' ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'
                        }`}
                      >
                        {review.status === 'approved' ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${page === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};