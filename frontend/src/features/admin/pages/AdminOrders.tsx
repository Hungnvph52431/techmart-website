import { useEffect, useState } from 'react';
import { orderService } from '@/services/order.service';
import toast from 'react-hot-toast';

// 1. Cập nhật Interface khớp hoàn toàn với Console Log
interface OrderResponse {
  orderId: number;
  orderCode: string;
  userId: number;
  userName: string;
  userEmail: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: string;
  shippingName: string;
  createdAt: string;
}

export const AdminOrders = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAll();
      // data trả về là mảng các object camelCase
      setOrders(data as any);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      await orderService.updateStatus(orderId, newStatus);
      toast.success('Cập nhật trạng thái thành công');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipping: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return `px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
      classes[status] || 'bg-gray-100 text-gray-800'
    }`;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Chờ xử lý',
      processing: 'Đang xử lý',
      shipping: 'Đang giao',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return labels[status] || status;
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-blue-600 font-bold animate-pulse">Đang tải dữ liệu đơn hàng...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Quản lý đơn hàng</h1>
      </div>

      {/* Bộ lọc trạng thái */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['all', 'pending', 'processing', 'shipping', 'completed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              filter === s
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? `Tất cả (${orders.length})` : `${getStatusLabel(s)} (${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Mã đơn</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Khách hàng</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Tổng tiền</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Ngày đặt</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Thanh toán</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map((order) => (
                // FIX: Dùng orderId làm key
                <tr key={order.orderId} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-black text-blue-600 font-mono">
                      {order.orderCode || `#${order.orderId}`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{order.shippingName || order.userName}</div>
                    <div className="text-xs text-gray-400">{order.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
  <span className="text-sm font-black text-red-500">
    {/* Kiểm tra cả 2 tên biến totalAmount và total_amount */}
    {Number(order.totalAmount || (order as any).total_amount || 0).toLocaleString('vi-VN')}₫
  </span>
</td>

<td className="px-6 py-4 whitespace-nowrap">
  <span className="text-xs font-medium text-gray-400">
    {/* Kiểm tra createdAt và created_at */}
    {order.createdAt || (order as any).created_at 
      ? new Date(order.createdAt || (order as any).created_at).toLocaleDateString('vi-VN') 
      : 'Chưa rõ ngày'}
  </span>
</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClass(order.status)}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-[11px] font-bold text-gray-700 uppercase">
                      {order.paymentMethod === 'cod' ? 'Tiền mặt' : 'Chuyển khoản'}
                    </div>
                    <div className={`text-[10px] font-medium ${order.paymentStatus === 'paid' ? 'text-green-500' : 'text-orange-500'}`}>
                      {order.paymentStatus === 'paid' ? '● Đã thanh toán' : '○ Chưa thanh toán'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order.orderId, e.target.value)}
                      className="border-2 border-gray-100 rounded-lg px-2 py-1 text-xs font-bold focus:border-blue-500 outline-none transition-all"
                      disabled={order.status === 'completed' || order.status === 'cancelled'}
                    >
                      <option value="pending">Chờ xử lý</option>
                      <option value="processing">Đang xử lý</option>
                      <option value="shipping">Đang giao</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-20">
            <div className="text-gray-300 text-5xl mb-4 opacity-20">📦</div>
            <p className="text-gray-400 font-bold italic">Không tìm thấy đơn hàng nào!</p>
          </div>
        )}
      </div>
    </div>
  );
};