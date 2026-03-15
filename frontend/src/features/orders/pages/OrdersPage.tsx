import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { orderService } from '@/services/order.service';
import type { OrderListItemView, OrderStatus } from '@/types/order';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatCurrency,
  formatDateTime,
} from '../lib/presentation';

const FILTERS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tat ca' },
  { value: 'pending', label: 'Cho xu ly' },
  { value: 'confirmed', label: 'Da xac nhan' },
  { value: 'processing', label: 'Dang chuan bi' },
  { value: 'shipping', label: 'Dang giao' },
  { value: 'delivered', label: 'Da giao' },
  { value: 'cancelled', label: 'Da huy' },
  { value: 'returned', label: 'Da hoan/tra' },
];

export const OrdersPage = () => {
  const [orders, setOrders] = useState<OrderListItemView[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getMyOrders('all');
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch customer orders:', error);
      toast.error('Khong the tai danh sach don hang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === 'all') {
      return orders;
    }

    return orders.filter((order) => order.status === filter);
  }, [filter, orders]);

  const summary = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((order) => order.status === 'pending').length,
      delivering: orders.filter((order) => order.status === 'shipping').length,
      activeReturns: orders.reduce((sum, order) => sum + order.openReturnCount, 0),
    }),
    [orders]
  );

  if (loading && orders.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white">
        <div className="text-lg text-gray-500">Dang tai don hang...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Tong don hang</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Don cho xu ly</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{summary.pending}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Dang giao</p>
          <p className="mt-2 text-3xl font-bold text-violet-600">{summary.delivering}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Yeu cau hoan/tra mo</p>
          <p className="mt-2 text-3xl font-bold text-sky-600">{summary.activeReturns}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              filter === option.value
                ? 'bg-slate-900 text-white'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <h2 className="text-xl font-semibold text-gray-900">Chua co don hang phu hop</h2>
          <p className="mt-2 text-sm text-gray-500">
            Khi ban dat hang thanh cong, lich su don se hien tai day.
          </p>
          <Link
            to="/products"
            className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Mua sam ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Link
              key={order.orderId}
              to={`/orders/${order.orderId}`}
              className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">{order.orderCode}</h2>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_STYLES[order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Dat luc {formatDateTime(order.orderDate)}
                  </p>
                  <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-3">
                    <p>{order.itemCount} san pham</p>
                    <p>
                      {PAYMENT_METHOD_LABELS[order.paymentMethod]} /{' '}
                      {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                    </p>
                    <p>{order.shipping.fullAddress}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-sm lg:items-end">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</p>
                  <p className="text-gray-500">Cap nhat: {formatDateTime(order.updatedAt)}</p>
                  {order.openReturnCount > 0 && (
                    <p className="font-medium text-sky-700">
                      {order.openReturnCount} yeu cau hoan/tra dang duoc xu ly
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
