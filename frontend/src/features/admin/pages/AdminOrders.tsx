import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminOrderService } from '@/services/admin/order.service';
// Đã xóa toàn bộ import từ '@/types' vì không được sử dụng trong component này
import { 
  Search, 
  RefreshCw, 
  Package,
  Phone,
  CreditCard,
} from 'lucide-react';
interface OrderResponse {
  items: any[];    // Danh sách đơn hàng
  total: number;   // Tổng số lượng đơn
  page: number;
  limit: number;
  totalPages: number;
}
// --- CONSTANTS & LABELS ---
const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn/trả',
};

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  processing: 'bg-blue-100 text-blue-800',
  shipping: 'bg-violet-100 text-violet-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-lime-100 text-lime-800',
  cancelled: 'bg-rose-100 text-rose-800',
  returned: 'bg-slate-200 text-slate-800',
};

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Ship COD',
  online: 'Chuyển khoản',
  vnpay: 'VNPay',
  bank_transfer: 'Chuyển khoản',
  momo: 'MoMo',
  wallet: 'Ví TechMart',
};

const PAYMENT_STATUS_BADGES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
  refunded: 'bg-blue-100 text-blue-700',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Chưa TT',
  paid: 'Đã TT',
  failed: 'Thất bại',
  refunded: 'Đã hoàn',
};

export const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    loadOrders();
  }, [filter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchText), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadOrders = async () => {
  try {
    setLoading(true);
    const response = await adminOrderService.getAll({
      search: searchQuery || undefined,
      status: filter !== 'all' ? filter : undefined,
    }) as unknown as OrderResponse;

    const orderList = response.items || [];
    const total = response.total || 0;

    setOrders(orderList);
    setTotalOrders(total);
  } catch (error) {
    toast.error('Không thể tải danh sách đơn hàng');
  } finally {
    setLoading(false);
  }
};

  const filteredOrders = orders;

  if (loading && orders.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-xl text-blue-600 font-black animate-pulse uppercase italic">Đang tải vận đơn...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Quản lý đơn hàng</h1>
              <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mt-1">
            Tổng cộng: {totalOrders} vận đơn
          </p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm mã đơn, tên khách, SĐT, tên sản phẩm..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
            />
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          </div>
          <button onClick={() => loadOrders()} className="p-2.5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <RefreshCw size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* TABS LỌC */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['all', 'pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled', 'returned'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              filter === s ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100'
            }`}
          >
            {s === 'all' ? 'Tất cả' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT: 1 CỘT - click vào row để vào trang detail */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        
        {/* DANH SÁCH */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-xs font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4 text-left">Đơn hàng</th>
                <th className="px-6 py-4 text-left">Khách hàng</th>
                <th className="px-6 py-4 text-left">Thanh toán</th>
                <th className="px-6 py-4 text-left">Tổng tiền</th>
                <th className="px-6 py-4 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
  {filteredOrders.length > 0 ? (
    filteredOrders.map((order) => (
      <tr
        key={order.orderId}
        onClick={() => navigate(`/admin/orders/${order.orderId}`)}
        className="cursor-pointer transition-colors hover:bg-blue-50/40"
      >
        <td className="px-6 py-4">
          <div className="text-base font-black text-blue-600 font-mono">{order.orderCode}</div>
          <div className="text-xs text-gray-400 uppercase font-bold">
            {order.orderDate
              ? new Date(order.orderDate).toLocaleDateString('vi-VN')
              : order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('vi-VN')
              : 'Không rõ ngày'}
          </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-base font-bold text-gray-800">
                  {order.customer?.name || order.shipping?.name || 'Khách lẻ'}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <Phone size={12} />
                  <span>{order.customer?.phone || order.shipping?.phone || '—'}</span>
                </div>
              </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1 text-sm font-bold text-gray-600 mb-1">
            <CreditCard size={14} className="text-gray-400" />
            {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${PAYMENT_STATUS_BADGES[order.paymentStatus] || 'bg-gray-100 text-gray-500'}`}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
          </span>
        </td>
        <td className="px-6 py-4 text-base font-black text-red-500">
          {Number(order.totalAmount || order.total).toLocaleString('vi-VN')}₫
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${STATUS_BADGES[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
            {order.openReturnCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-orange-100 text-orange-600 border border-orange-200">
                🔄 Đang hoàn trả
              </span>
            )}
          </div>
        </td>
      </tr>
    ))
  ) : (
    // PHẦN 2: Nếu không có đơn hàng nào khớp, hiển thị thông báo trống
    <tr>
      <td colSpan={5} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-2">
          <Package className="text-gray-200" size={40} />
          <p className="text-gray-400 italic text-sm font-medium">
            Không tìm thấy đơn hàng nào khớp với tìm kiếm hoặc bộ lọc.
          </p>
        </div>
      </td>
    </tr>
  )}
</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};