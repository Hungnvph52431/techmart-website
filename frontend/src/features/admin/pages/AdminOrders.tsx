import { useEffect, useState } from 'react'; // Đã xóa FormEvent
import toast from 'react-hot-toast';
import { orderService } from '@/services/order.service';
// Đã xóa toàn bộ import từ '@/types' vì không được sử dụng trong component này
import { 
  Search, 
  RefreshCw, 
  Package 
} from 'lucide-react'; // Chỉ giữ lại các Icon thực sự hiển thị
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
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn/trả',
};

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  processing: 'bg-blue-100 text-blue-800',
  shipping: 'bg-violet-100 text-violet-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
  returned: 'bg-slate-200 text-slate-800',
};

export const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
  try {
    setLoading(true);
    
    // Ép kiểu dữ liệu trả về thành OrderResponse để dập lỗi TS2339
    const response = await orderService.getAll() as unknown as OrderResponse;
    
    // Bây giờ bạn có thể truy cập thoải mái mà không bị báo lỗi
    const orderList = response.items || []; 
    const total = response.total || 0;

    setOrders(orderList);
    setTotalOrders(total); 
    
    if (orderList.length > 0 && !selectedOrder) {
      setSelectedOrder(orderList[0]);
    }
  } catch (error) {
    toast.error('Không thể tải danh sách đơn hàng');
  } finally {
    setLoading(false);
  }
};

  const handleUpdateStatus = async (orderId: number, nextStatus: string) => {
    // Đã xóa prompt 'note' vì biến này không được truyền vào hàm updateStatus
    try {
      await orderService.updateStatus(orderId, nextStatus);
      toast.success('Đã cập nhật trạng thái');
      loadOrders();
    } catch (error) {
      toast.error('Cập nhật thất bại');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter;
    const matchesSearch = order.orderCode?.toLowerCase().includes(searchText.toLowerCase()) || 
                          order.shippingName?.toLowerCase().includes(searchText.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">
            Tổng cộng: {totalOrders} vận đơn
          </p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm mã đơn, tên khách..."
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
        {['all', 'pending', 'confirmed', 'shipping', 'delivered', 'cancelled'].map((s) => (
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

      {/* MAIN CONTENT: 2 CỘT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* CỘT TRÁI: DANH SÁCH */}
        <div className="xl:col-span-7 bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4 text-left">Đơn hàng</th>
                  <th className="px-6 py-4 text-left">Khách hàng</th>
                  <th className="px-6 py-4 text-left">Tổng tiền</th>
                  <th className="px-6 py-4 text-left">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
  {filteredOrders.length > 0 ? (
    // PHẦN 1: Nếu có đơn hàng, thực hiện map để hiển thị danh sách
    filteredOrders.map((order) => (
      <tr 
        key={order.orderId} 
        onClick={() => setSelectedOrder(order)}
        className={`cursor-pointer transition-colors ${selectedOrder?.orderId === order.orderId ? 'bg-blue-50/50' : 'hover:bg-gray-50/30'}`}
      >
        <td className="px-6 py-4">
          <div className="text-sm font-black text-blue-600 font-mono">{order.orderCode}</div>
          <div className="text-[10px] text-gray-400 uppercase font-bold">
            {new Date(order.createdAt).toLocaleDateString('vi-VN')}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm font-bold text-gray-800">{order.shippingName || 'Khách lẻ'}</div>
          <div className="text-[11px] text-gray-400">
            {order.paymentMethod === 'cod' ? 'Ship COD' : 'Chuyển khoản'}
          </div>
        </td>
        <td className="px-6 py-4 text-sm font-black text-red-500">
          {Number(order.totalAmount || order.total).toLocaleString('vi-VN')}₫
        </td>
        <td className="px-6 py-4">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_BADGES[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
        </td>
      </tr>
    ))
  ) : (
    // PHẦN 2: Nếu không có đơn hàng nào khớp, hiển thị thông báo trống
    <tr>
      <td colSpan={4} className="px-6 py-12 text-center">
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

        {/* CỘT PHẢI: CHI TIẾT */}
        <div className="xl:col-span-5 space-y-6">
          {selectedOrder ? (
            <div className="bg-white rounded-[24px] shadow-xl border border-gray-100 p-6 sticky top-24">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-800 tracking-tight">Chi tiết #{selectedOrder.orderCode}</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase mt-1">Cập nhật lúc: {new Date().toLocaleTimeString('vi-VN')}</p>
                </div>
                <select 
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(selectedOrder.orderId, e.target.value)}
                  className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.keys(STATUS_LABELS).map(key => (
                    <option key={key} value={key}>{STATUS_LABELS[key]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Người nhận</p>
                  <p className="text-sm font-bold text-gray-800">{selectedOrder.shippingName}</p>
                  <p className="text-xs text-gray-500">{selectedOrder.shippingPhone || 'Chưa có SĐT'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Địa chỉ</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{selectedOrder.shippingAddress}</p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase px-1">Kiện hàng</p>
                <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                  <div className="flex justify-between items-center p-3 border border-gray-50 rounded-xl">
                    <span className="text-sm font-bold text-gray-700">Sản phẩm trong đơn</span>
                    <span className="text-sm font-black text-blue-600">x{selectedOrder.itemCount || 1}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-400 uppercase">Tổng quyết toán</span>
                <span className="text-2xl font-black text-red-600">
                  {Number(selectedOrder.totalAmount || selectedOrder.total).toLocaleString('vi-VN')}₫
                </span>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-[24px] border-2 border-dashed border-gray-200">
              <Package className="text-gray-200 mb-2" size={48} />
              <p className="text-gray-400 font-bold italic text-sm">Chọn một vận đơn để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};