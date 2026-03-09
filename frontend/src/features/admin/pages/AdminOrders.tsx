import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminOrderService } from '@/services/admin/order.service';
import type {
  OrderDetailView,
  OrderListItemView,
  OrderReturnView,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReturnRestockAction,
  ReturnStatus,
} from '@/types/order';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn/trả',
};

const STATUS_BADGES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  processing: 'bg-blue-100 text-blue-800',
  shipping: 'bg-violet-100 text-violet-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
  returned: 'bg-slate-200 text-slate-800',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán lỗi',
  refunded: 'Đã hoàn tiền',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'COD',
  bank_transfer: 'Chuyển khoản',
  momo: 'MoMo',
  vnpay: 'VNPay',
  zalopay: 'ZaloPay',
};

const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: 'Mới yêu cầu',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  received: 'Đã nhận hàng hoàn',
  refunded: 'Đã hoàn tiền',
  closed: 'Đã đóng',
};

const RESTOCK_ACTION_LABELS: Record<ReturnRestockAction, string> = {
  restock: 'Nhập lại kho',
  inspect: 'Chờ kiểm tra',
  discard: 'Loại bỏ',
};

const EVENT_LABELS: Record<string, string> = {
  order_created: 'Tạo đơn hàng',
  status_changed: 'Cập nhật trạng thái',
  payment_status_changed: 'Cập nhật thanh toán',
  order_cancelled: 'Hủy đơn hàng',
  return_requested: 'Tạo yêu cầu hoàn/trả',
  return_approved: 'Duyệt yêu cầu hoàn/trả',
  return_rejected: 'Từ chối yêu cầu hoàn/trả',
  return_received: 'Đã nhận hàng hoàn',
  return_refunded: 'Đã hoàn tiền',
  return_closed: 'Đóng yêu cầu hoàn/trả',
};

const FILTER_OPTIONS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'returned', label: 'Đã hoàn/trả' },
];

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('vi-VN');
};

const getActionOptions = <T extends string>(current: T, nextValues: T[]) =>
  Array.from(new Set([current, ...nextValues]));

export const AdminOrders = () => {
  const [orders, setOrders] = useState<OrderListItemView[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  const loadOrderDetail = async (orderId: number) => {
    try {
      setDetailLoading(true);
      setSelectedOrderId(orderId);
      const detail = await adminOrderService.getById(orderId);
      setSelectedOrder(detail);
    } catch (error) {
      console.error('Failed to fetch order detail:', error);
      toast.error('Không thể tải chi tiết đơn hàng');
    } finally {
      setDetailLoading(false);
    }
  };

  const loadOrders = async (focusOrderId?: number | null) => {
    try {
      setLoading(true);
      const data = await adminOrderService.getAll({
        status: filter,
        search: appliedSearch || undefined,
        page: 1,
        limit: 50,
      });

      setOrders(data.items);
      setMeta({
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
      });

      const nextSelectedOrderId = focusOrderId ?? selectedOrderId;
      const fallbackOrderId = data.items[0]?.orderId ?? null;

      if (nextSelectedOrderId && data.items.some((item) => item.orderId === nextSelectedOrderId)) {
        await loadOrderDetail(nextSelectedOrderId);
      } else if (fallbackOrderId) {
        await loadOrderDetail(fallbackOrderId);
      } else {
        setSelectedOrderId(null);
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [filter, appliedSearch]);

  const refreshAfterMutation = async (orderId?: number) => {
    await loadOrders(orderId ?? selectedOrderId);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedSearch(searchText.trim());
  };

  const handleUpdateStatus = async (order: OrderListItemView, nextStatus: OrderStatus) => {
    if (nextStatus === order.status) {
      return;
    }

    const note = window.prompt('Ghi chú cập nhật trạng thái (tùy chọn):')?.trim();

    try {
      setActionKey(`status-${order.orderId}`);
      await adminOrderService.updateStatus(order.orderId, nextStatus, note || undefined);
      toast.success('Đã cập nhật trạng thái đơn hàng');
      await refreshAfterMutation(order.orderId);
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Không thể cập nhật trạng thái đơn hàng');
    } finally {
      setActionKey(null);
    }
  };

  const handleUpdatePaymentStatus = async (
    order: OrderListItemView,
    nextStatus: PaymentStatus
  ) => {
    if (nextStatus === order.paymentStatus) {
      return;
    }

    const note = window.prompt('Ghi chú cập nhật thanh toán (tùy chọn):')?.trim();

    try {
      setActionKey(`payment-${order.orderId}`);
      await adminOrderService.updatePaymentStatus(order.orderId, nextStatus, note || undefined);
      toast.success('Đã cập nhật trạng thái thanh toán');
      await refreshAfterMutation(order.orderId);
    } catch (error) {
      console.error('Failed to update payment status:', error);
      toast.error('Không thể cập nhật trạng thái thanh toán');
    } finally {
      setActionKey(null);
    }
  };

  const handleCancelOrder = async (order: OrderListItemView) => {
    const reason = window.prompt('Nhập lý do hủy đơn hàng:')?.trim();
    if (!reason) {
      return;
    }

    const adminNote = window.prompt('Ghi chú nội bộ (tùy chọn):')?.trim();

    try {
      setActionKey(`cancel-${order.orderId}`);
      await adminOrderService.cancel(order.orderId, {
        reason,
        adminNote: adminNote || undefined,
      });
      toast.success('Đơn hàng đã được hủy');
      await refreshAfterMutation(order.orderId);
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error('Không thể hủy đơn hàng');
    } finally {
      setActionKey(null);
    }
  };

  const handleReviewReturn = async (
    orderId: number,
    orderReturn: OrderReturnView,
    decision: 'approved' | 'rejected'
  ) => {
    const adminNote = window.prompt(
      decision === 'approved' ? 'Ghi chú duyệt yêu cầu (tùy chọn):' : 'Lý do từ chối (tùy chọn):'
    )?.trim();

    try {
      setActionKey(`return-review-${orderReturn.orderReturnId}`);
      await adminOrderService.reviewReturn(orderId, orderReturn.orderReturnId, {
        decision,
        adminNote: adminNote || undefined,
      });
      toast.success(
        decision === 'approved' ? 'Đã duyệt yêu cầu hoàn/trả' : 'Đã từ chối yêu cầu hoàn/trả'
      );
      await refreshAfterMutation(orderId);
    } catch (error) {
      console.error('Failed to review return request:', error);
      toast.error('Không thể xử lý yêu cầu hoàn/trả');
    } finally {
      setActionKey(null);
    }
  };

  const handleReceiveReturn = async (orderId: number, orderReturn: OrderReturnView) => {
    const adminNote = window.prompt('Ghi chú nhận hàng hoàn (tùy chọn):')?.trim();

    try {
      setActionKey(`return-receive-${orderReturn.orderReturnId}`);
      await adminOrderService.receiveReturn(orderId, orderReturn.orderReturnId, {
        adminNote: adminNote || undefined,
      });
      toast.success('Đã ghi nhận nhận hàng hoàn');
      await refreshAfterMutation(orderId);
    } catch (error) {
      console.error('Failed to receive return:', error);
      toast.error('Không thể ghi nhận hàng hoàn');
    } finally {
      setActionKey(null);
    }
  };

  const handleRefundReturn = async (orderId: number, orderReturn: OrderReturnView) => {
    const adminNote = window.prompt('Ghi chú hoàn tiền (tùy chọn):')?.trim();

    try {
      setActionKey(`return-refund-${orderReturn.orderReturnId}`);
      await adminOrderService.refundReturn(orderId, orderReturn.orderReturnId, {
        adminNote: adminNote || undefined,
      });
      toast.success('Đã ghi nhận hoàn tiền');
      await refreshAfterMutation(orderId);
    } catch (error) {
      console.error('Failed to refund return:', error);
      toast.error('Không thể ghi nhận hoàn tiền');
    } finally {
      setActionKey(null);
    }
  };

  const handleCloseReturn = async (orderId: number, orderReturn: OrderReturnView) => {
    const adminNote = window.prompt('Ghi chú đóng yêu cầu (tùy chọn):')?.trim();

    try {
      setActionKey(`return-close-${orderReturn.orderReturnId}`);
      await adminOrderService.closeReturn(orderId, orderReturn.orderReturnId, {
        adminNote: adminNote || undefined,
      });
      toast.success('Đã đóng yêu cầu hoàn/trả');
      await refreshAfterMutation(orderId);
    } catch (error) {
      console.error('Failed to close return:', error);
      toast.error('Không thể đóng yêu cầu hoàn/trả');
    } finally {
      setActionKey(null);
    }
  };

  const renderReturnActions = (orderReturn: OrderReturnView) => {
    if (!selectedOrder) {
      return null;
    }

    const isBusy = actionKey?.includes(String(orderReturn.orderReturnId));

    if (orderReturn.status === 'requested') {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleReviewReturn(selectedOrder.order.orderId, orderReturn, 'approved')}
            disabled={Boolean(isBusy)}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            Duyệt
          </button>
          <button
            type="button"
            onClick={() => void handleReviewReturn(selectedOrder.order.orderId, orderReturn, 'rejected')}
            disabled={Boolean(isBusy)}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            Từ chối
          </button>
        </div>
      );
    }

    if (orderReturn.status === 'approved') {
      return (
        <button
          type="button"
          onClick={() => void handleReceiveReturn(selectedOrder.order.orderId, orderReturn)}
          disabled={Boolean(isBusy)}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          Xác nhận nhận hàng hoàn
        </button>
      );
    }

    if (orderReturn.status === 'received') {
      if (selectedOrder.order.paymentStatus === 'paid') {
        return (
          <button
            type="button"
            onClick={() => void handleRefundReturn(selectedOrder.order.orderId, orderReturn)}
            disabled={Boolean(isBusy)}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            Ghi nhận hoàn tiền
          </button>
        );
      }

      return (
        <button
          type="button"
          onClick={() => void handleCloseReturn(selectedOrder.order.orderId, orderReturn)}
          disabled={Boolean(isBusy)}
          className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          Đóng yêu cầu
        </button>
      );
    }

    if (orderReturn.status === 'refunded' || orderReturn.status === 'rejected') {
      return (
        <button
          type="button"
          onClick={() => void handleCloseReturn(selectedOrder.order.orderId, orderReturn)}
          disabled={Boolean(isBusy)}
          className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          Đóng yêu cầu
        </button>
      );
    }

    return null;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-xl text-gray-600">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản lý đơn hàng</h1>
          <p className="mt-2 text-sm text-gray-500">
            Theo dõi trạng thái, hoàn/trả và lịch sử xử lý đơn hàng.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Tìm theo mã đơn, tên, email, số điện thoại"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as OrderStatus | 'all')}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Tra cứu
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)]">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Danh sách đơn hàng</h2>
              <p className="text-sm text-gray-500">
                {meta.total} đơn hàng, trang {meta.page}/{Math.max(meta.totalPages, 1)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadOrders(selectedOrderId)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Tải lại
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Mã đơn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Khách hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Tổng tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {orders.map((order) => (
                  <tr
                    key={order.orderId}
                    className={selectedOrderId === order.orderId ? 'bg-blue-50/50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4 align-top">
                      <div className="text-sm font-semibold text-gray-900">{order.orderCode}</div>
                      <div className="mt-1 text-xs text-gray-500">{formatDateTime(order.orderDate)}</div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="text-sm font-medium text-gray-900">{order.customer.name}</div>
                      <div className="mt-1 text-xs text-gray-500">{order.customer.email || '-'}</div>
                      <div className="mt-1 text-xs text-gray-500">{order.customer.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {order.itemCount} sản phẩm, {order.openReturnCount} yêu cầu mở
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[order.status]}`}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                        <span className="text-xs text-gray-500">
                          {PAYMENT_METHOD_LABELS[order.paymentMethod]} /{' '}
                          {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => void loadOrderDetail(order.orderId)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Xem chi tiết
                        </button>

                        <select
                          value={order.status}
                          onChange={(event) =>
                            void handleUpdateStatus(order, event.target.value as OrderStatus)
                          }
                          disabled={
                            actionKey === `status-${order.orderId}` ||
                            getActionOptions(order.status, order.allowedNextStatuses).length === 1
                          }
                          className="w-44 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                        >
                          {getActionOptions(order.status, order.allowedNextStatuses).map((value) => (
                            <option key={value} value={value}>
                              {STATUS_LABELS[value]}
                            </option>
                          ))}
                        </select>

                        <select
                          value={order.paymentStatus}
                          onChange={(event) =>
                            void handleUpdatePaymentStatus(
                              order,
                              event.target.value as PaymentStatus
                            )
                          }
                          disabled={
                            actionKey === `payment-${order.orderId}` ||
                            getActionOptions(order.paymentStatus, order.allowedNextPaymentStatuses)
                              .length === 1
                          }
                          className="w-44 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                        >
                          {getActionOptions(
                            order.paymentStatus,
                            order.allowedNextPaymentStatuses
                          ).map((value) => (
                            <option key={value} value={value}>
                              {PAYMENT_STATUS_LABELS[value]}
                            </option>
                          ))}
                        </select>

                        {order.canCancel && (
                          <button
                            type="button"
                            onClick={() => void handleCancelOrder(order)}
                            disabled={actionKey === `cancel-${order.orderId}`}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                          >
                            Hủy đơn
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              Không tìm thấy đơn hàng phù hợp.
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Chi tiết đơn hàng</h2>
          </div>

          {detailLoading && (
            <div className="px-6 py-10 text-center text-sm text-gray-500">Đang tải chi tiết...</div>
          )}

          {!detailLoading && !selectedOrder && (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              Chọn một đơn hàng để xem thông tin.
            </div>
          )}

          {!detailLoading && selectedOrder && (
            <div className="space-y-6 px-6 py-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedOrder.order.orderCode}
                  </h3>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[selectedOrder.order.status]}`}
                  >
                    {STATUS_LABELS[selectedOrder.order.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {PAYMENT_METHOD_LABELS[selectedOrder.order.paymentMethod]} /{' '}
                  {PAYMENT_STATUS_LABELS[selectedOrder.order.paymentStatus]}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-sm font-semibold text-gray-900">Khách hàng</h4>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>{selectedOrder.order.customer.name}</p>
                    <p>{selectedOrder.order.customer.email || '-'}</p>
                    <p>{selectedOrder.order.customer.phone || '-'}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-sm font-semibold text-gray-900">Giao hàng</h4>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>{selectedOrder.order.shipping.name}</p>
                    <p>{selectedOrder.order.shipping.phone}</p>
                    <p>{selectedOrder.order.shipping.fullAddress}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-900">Dòng thời gian</h4>
                <div className="mt-3 space-y-3">
                  {selectedOrder.timeline.map((event) => (
                    <div key={event.orderEventId} className="border-l-2 border-gray-200 pl-3">
                      <p className="text-sm font-medium text-gray-900">
                        {EVENT_LABELS[event.eventType] || event.eventType}
                      </p>
                      <p className="text-xs text-gray-500">{formatDateTime(event.createdAt)}</p>
                      {(event.note || event.toStatus || event.fromStatus) && (
                        <p className="mt-1 text-sm text-gray-600">
                          {event.note ||
                            [event.fromStatus, event.toStatus].filter(Boolean).join(' -> ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Sản phẩm</h4>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(selectedOrder.order.total)}
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.orderDetailId}
                      className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.variantName || item.sku || `SP #${item.productId}`}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <p>x{item.quantity}</p>
                        <p>{formatCurrency(item.subtotal)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-900">Ghi chú</h4>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium text-gray-900">Khách hàng:</span>{' '}
                    {selectedOrder.order.customerNote || '-'}
                  </p>
                  <p>
                    <span className="font-medium text-gray-900">Nội bộ:</span>{' '}
                    {selectedOrder.order.adminNote || '-'}
                  </p>
                  <p>
                    <span className="font-medium text-gray-900">Lý do hủy:</span>{' '}
                    {selectedOrder.order.cancelReason || '-'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-900">Yêu cầu hoàn/trả</h4>
                <div className="mt-3 space-y-4">
                  {selectedOrder.returns.length === 0 && (
                    <p className="text-sm text-gray-500">Chưa có yêu cầu hoàn/trả.</p>
                  )}

                  {selectedOrder.returns.map((orderReturn) => (
                    <div
                      key={orderReturn.orderReturnId}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {orderReturn.requestCode}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(orderReturn.requestedAt)}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {RETURN_STATUS_LABELS[orderReturn.status]}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <p>
                          <span className="font-medium text-gray-900">Lý do:</span>{' '}
                          {orderReturn.reason}
                        </p>
                        <p>
                          <span className="font-medium text-gray-900">Ghi chú khách:</span>{' '}
                          {orderReturn.customerNote || '-'}
                        </p>
                        <p>
                          <span className="font-medium text-gray-900">Ghi chú admin:</span>{' '}
                          {orderReturn.adminNote || '-'}
                        </p>
                      </div>

                      <div className="mt-3 space-y-2">
                        {orderReturn.items.map((item) => (
                          <div
                            key={item.orderReturnItemId}
                            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {item.productName || `SP #${item.productId}`}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  SL trả: {item.quantity} | {RESTOCK_ACTION_LABELS[item.restockAction]}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500">{item.reason || '-'}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">{renderReturnActions(orderReturn)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
