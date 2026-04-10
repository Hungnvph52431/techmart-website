import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shipperService, ShipperOrder, DeliveryStatus } from '@/services/shipper.service';

const STATUS_FILTERS: { label: string; value: DeliveryStatus | 'all' }[] = [
  { label: 'Tất cả',    value: 'all' },
  { label: 'Chờ lấy',  value: 'WAITING_PICKUP' },
  { label: 'Đang giao', value: 'IN_DELIVERY' },
  { label: 'Thất bại',  value: 'FAILED' },
];

const DELIVERY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  WAITING_PICKUP: { label: 'Chờ lấy hàng', color: '#e65100', bg: '#fff3e0' },
  PICKED_UP:      { label: 'Đã lấy hàng',  color: '#1565c0', bg: '#e3f2fd' },
  IN_DELIVERY:    { label: 'Đang giao',     color: '#6a1b9a', bg: '#f3e5f5' },
  DELIVERED:      { label: 'Đã giao',       color: '#2e7d32', bg: '#e8f5e9' },
  FAILED:         { label: 'Thất bại',      color: '#c62828', bg: '#fce4ec' },
  RETURNING:      { label: 'Hoàn hàng',     color: '#4e342e', bg: '#efebe9' },
  RETURNED:       { label: 'Đã hoàn',       color: '#757575', bg: '#f5f5f5' },
};

export const ShipperHomePage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ShipperOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<DeliveryStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    shipperService
      .getOrders({ status: filter === 'all' ? undefined : filter, limit: 50 })
      .then(r => {
        setOrders(r.data.items);
        setTotal(r.data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#212121' }}>Đơn được giao</div>
          <div style={{ fontSize: 12, color: '#9e9e9e', marginTop: 2 }}>{total} đơn</div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              fontSize: 12,
              fontWeight: filter === f.value ? 700 : 500,
              background: filter === f.value ? '#1565c0' : '#e0e0e0',
              color: filter === f.value ? '#fff' : '#424242',
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9e9e9e' }}>Đang tải...</div>
        )}

        {!loading && orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9e9e9e' }}>
            Không có đơn nào
          </div>
        )}

        {orders.map(order => {
          const dl = DELIVERY_LABEL[order.deliveryStatus] ?? { label: order.deliveryStatus, color: '#757575', bg: '#f5f5f5' };
          const isCOD = order.codAmount > 0;

          return (
            <div
              key={order.orderId}
              onClick={() => navigate(`/shipper/orders/${order.orderId}`)}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 14,
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                cursor: 'pointer',
              }}
            >
              {/* Row 1: order code + status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1565c0' }}>{order.orderCode}</div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                  background: dl.bg, color: dl.color,
                }}>
                  {dl.label}
                </span>
              </div>

              {/* Row 2: recipient */}
              <div style={{ fontSize: 13, color: '#212121', fontWeight: 600, marginBottom: 2 }}>
                {order.shippingName} · {order.shippingPhone}
              </div>
              <div style={{ fontSize: 12, color: '#757575', marginBottom: 8 }}>
                {order.shippingAddress}, {order.shippingDistrict}, {order.shippingCity}
              </div>

              {/* Row 3: payment badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isCOD ? (
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '4px 10px',
                    background: order.codCollected ? '#e8f5e9' : '#fff3e0',
                    color: order.codCollected ? '#2e7d32' : '#e65100',
                    borderRadius: 20,
                  }}>
                    {order.codCollected ? '✓ Đã thu' : `Thu: ${order.codAmount.toLocaleString('vi-VN')}đ`}
                  </span>
                ) : (
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '4px 10px',
                    background: '#e3f2fd', color: '#1565c0', borderRadius: 20,
                  }}>
                    Đã thanh toán online
                  </span>
                )}
                <span style={{ fontSize: 11, color: '#9e9e9e', marginLeft: 'auto' }}>
                  {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
