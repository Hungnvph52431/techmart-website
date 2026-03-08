import { useEffect, useState } from 'react';
import { orderService } from '@/services/order.service';
import toast from 'react-hot-toast';

interface OrderResponse {
  orderId?: number;
  order_id?: number;
  userId?: number;
  user_id?: number;
  userName?: string;
  user_name?: string;
  userEmail?: string;
  user_email?: string;
  total?: number;
  total_amount?: number;
  status: string;
  payment_method: string;
  payment_status: string;
  shippingAddress?: string;
  shipping_address?: string;
  orderDate?: string;
  created_at?: string;
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
        <div className="text-xl text-gray-600">Đang tải...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý đơn hàng</h1>
      </div>

      {/* Filter */}
      <div className="mb-6 flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          Tất cả ({orders.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'pending'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          Chờ xử lý ({orders.filter((o) => o.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('processing')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'processing'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          Đang xử lý ({orders.filter((o) => o.status === 'processing').length})
        </button>
        <button
          onClick={() => setFilter('shipping')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'shipping'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          Đang giao ({orders.filter((o) => o.status === 'shipping').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'completed'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          Hoàn thành ({orders.filter((o) => o.status === 'completed').length})
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã đơn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Khách hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tổng tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày đặt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thanh toán
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order, index) => {
                const orderId = order.orderId ?? order.order_id;
                const userName = order.userName ?? order.user_name ?? `User #${order.userId ?? order.user_id ?? 'N/A'}`;
                const userEmail = order.userEmail ?? order.user_email ?? '-';
                const totalAmount = order.total ?? order.total_amount ?? 0;
                const createdAt = order.orderDate ?? order.created_at;

                return (
                <tr key={String(orderId || index)} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      #{orderId}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {userName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {userEmail}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {Number(totalAmount).toLocaleString('vi-VN')} ₫
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {createdAt ? new Date(createdAt).toLocaleDateString('vi-VN') : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClass(order.status)}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.payment_method === 'cod' ? 'COD' : 'Chuyển khoản'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        orderId && handleUpdateStatus(orderId, e.target.value)
                      }
                      className="border rounded px-2 py-1 text-sm"
                      disabled={!orderId || order.status === 'completed' || order.status === 'cancelled'}
                    >
                      <option value="pending">Chờ xử lý</option>
                      <option value="processing">Đang xử lý</option>
                      <option value="shipping">Đang giao</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Không có đơn hàng nào
          </div>
        )}
      </div>
    </div>
  );
};
