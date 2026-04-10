import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shipperService, ShipperOrderDetail, DeliveryFailReason } from '@/services/shipper.service';

const DELIVERY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  WAITING_PICKUP: { label: 'Chờ lấy hàng', color: '#e65100', bg: '#fff3e0' },
  PICKED_UP:      { label: 'Đã lấy hàng',  color: '#1565c0', bg: '#e3f2fd' },
  IN_DELIVERY:    { label: 'Đang giao',     color: '#6a1b9a', bg: '#f3e5f5' },
  DELIVERED:      { label: 'Đã giao',       color: '#2e7d32', bg: '#e8f5e9' },
  FAILED:         { label: 'Thất bại',      color: '#c62828', bg: '#fce4ec' },
  RETURNING:      { label: 'Hoàn hàng',     color: '#4e342e', bg: '#efebe9' },
  RETURNED:       { label: 'Đã hoàn',       color: '#757575', bg: '#f5f5f5' },
};

const FAIL_REASONS: { value: DeliveryFailReason; label: string }[] = [
  { value: 'VACANT',           label: 'Không có người nhà' },
  { value: 'WRONG_ADDRESS',    label: 'Sai địa chỉ' },
  { value: 'CUSTOMER_REFUSED', label: 'Khách từ chối nhận' },
  { value: 'OTHER',            label: 'Lý do khác' },
];

export const ShipperOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ShipperOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showFailForm, setShowFailForm] = useState(false);
  const [failReason, setFailReason] = useState<DeliveryFailReason>('VACANT');
  const [failNote, setFailNote] = useState('');
  const [codConfirmed, setCodConfirmed] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);

  const loadOrder = () => {
    setLoading(true);
    shipperService
      .getOrderDetail(Number(id))
      .then(r => setOrder(r.data))
      .catch(e => setError(e.message || 'Không thể tải đơn hàng'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrder(); }, [id]);

  const handlePickup = async () => {
    setActionLoading(true); setActionError('');
    try {
      await shipperService.pickup(Number(id));
      loadOrder();
    } catch (e: any) { setActionError(e.response?.data?.message || e.message); }
    finally { setActionLoading(false); }
  };

  const handleStart = async () => {
    setActionLoading(true); setActionError('');
    try {
      await shipperService.startDelivery(Number(id));
      loadOrder();
    } catch (e: any) { setActionError(e.response?.data?.message || e.message); }
    finally { setActionLoading(false); }
  };

  const handleComplete = async () => {
    if (!order) return;
    const isCOD = order.codAmount > 0;
    if (isCOD && !codConfirmed) {
      setActionError('Vui lòng xác nhận đã thu tiền COD');
      return;
    }
    setActionLoading(true); setActionError('');
    try {
      await shipperService.complete(Number(id), {
        photoUrl: 'uploaded',
        codCollected: isCOD ? true : undefined,
      });
      loadOrder();
    } catch (e: any) { setActionError(e.response?.data?.message || e.message); }
    finally { setActionLoading(false); }
  };

  const handleFail = async () => {
    setActionLoading(true); setActionError('');
    try {
      await shipperService.fail(Number(id), { failReason, note: failNote });
      setShowFailForm(false);
      loadOrder();
    } catch (e: any) { setActionError(e.response?.data?.message || e.message); }
    finally { setActionLoading(false); }
  };

  const handleRetry = async () => {
    setActionLoading(true); setActionError('');
    try {
      await shipperService.retryDelivery(Number(id));
      loadOrder();
    } catch (e: any) { setActionError(e.response?.data?.message || e.message); }
    finally { setActionLoading(false); }
  };

  const handleReturnToWarehouse = async () => {
    setActionLoading(true); setActionError('');
    try {
      await shipperService.returnToWarehouse(Number(id));
      setShowReturnConfirm(false);
      loadOrder();
    } catch (e: any) { setActionError(e.response?.data?.message || e.message); }
    finally { setActionLoading(false); }
  };

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center', color: '#9e9e9e' }}>Đang tải...</div>
  );
  if (error || !order) return (
    <div style={{ padding: 32, textAlign: 'center', color: '#d32f2f' }}>{error || 'Không tìm thấy đơn'}</div>
  );

  const dl = DELIVERY_LABEL[order.deliveryStatus] ?? { label: order.deliveryStatus, color: '#757575', bg: '#f5f5f5' };
  const isCOD = order.codAmount > 0;
  const isTerminal = ['DELIVERED', 'RETURNED'].includes(order.deliveryStatus);

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Back header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', background: '#fff',
        borderBottom: '1px solid #f0f0f0',
      }}>
        <button onClick={() => navigate('/shipper')}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#1565c0', padding: 0 }}>
          ←
        </button>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1565c0' }}>{order.orderCode}</div>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 600,
          padding: '3px 8px', borderRadius: 20, background: dl.bg, color: dl.color,
        }}>
          {dl.label}
        </span>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Recipient info */}
        <Section title="Người nhận">
          <Row label="Tên" value={order.shippingName} />
          <Row label="SĐT" value={order.shippingPhone} />
          <Row label="Địa chỉ" value={`${order.shippingAddress}, ${order.shippingWard ?? ''}, ${order.shippingDistrict}, ${order.shippingCity}`} />
        </Section>

        {/* Payment */}
        <Section title="Thanh toán">
          {isCOD ? (
            <>
              <Row label="Phương thức" value="Tiền mặt (COD)" />
              <Row
                label="Số tiền cần thu"
                value={`${order.codAmount.toLocaleString('vi-VN')}đ`}
                valueColor="#e65100"
                bold
              />
              <Row label="Trạng thái" value={order.codCollected ? '✓ Đã thu tiền' : 'Chưa thu tiền'}
                valueColor={order.codCollected ? '#2e7d32' : '#c62828'} />
            </>
          ) : (
            <>
              <Row label="Phương thức" value={order.paymentMethod.toUpperCase()} />
              <Row label="Trạng thái" value="Đã thanh toán online" valueColor="#1565c0" />
            </>
          )}
          <Row label="Tổng tiền" value={`${order.total.toLocaleString('vi-VN')}đ`} bold />
        </Section>

        {/* Items */}
        <Section title={`Sản phẩm (${order.items.length})`}>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < order.items.length - 1 ? '1px solid #f5f5f5' : undefined }}>
              {item.product_image && (
                <img src={item.product_image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#212121' }}>{item.product_name}</div>
                {item.variant_name && <div style={{ fontSize: 11, color: '#9e9e9e' }}>{item.variant_name}</div>}
                <div style={{ fontSize: 12, color: '#757575', marginTop: 2 }}>
                  x{item.quantity} · {item.price.toLocaleString('vi-VN')}đ
                </div>
              </div>
            </div>
          ))}
        </Section>

        {/* Delivery attempts */}
        {order.deliveryAttempts.length > 0 && (
          <Section title={`Lịch sử giao (${order.deliveryAttempts.length} lần)`}>
            {order.deliveryAttempts.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < order.deliveryAttempts.length - 1 ? '1px solid #f5f5f5' : undefined }}>
                <span style={{ fontSize: 12, color: a.status === 'SUCCESS' ? '#2e7d32' : '#c62828', fontWeight: 600 }}>
                  {a.status === 'SUCCESS' ? '✓ Thành công' : `✗ ${a.failReason ?? 'Thất bại'}`}
                </span>
                <span style={{ fontSize: 11, color: '#9e9e9e' }}>
                  {new Date(a.attemptedAt).toLocaleString('vi-VN')}
                </span>
              </div>
            ))}
          </Section>
        )}

        {/* Action area */}
        {!isTerminal && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9e9e9e', textTransform: 'uppercase', marginBottom: 12 }}>
              Thao tác
            </div>

            {actionError && (
              <div style={{ background: '#fce4ec', color: '#c62828', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 10 }}>
                {actionError}
              </div>
            )}

            {/* WAITING_PICKUP */}
            {order.deliveryStatus === 'WAITING_PICKUP' && (
              <ActionBtn label="Xác nhận lấy hàng" color="#1565c0" loading={actionLoading} onClick={handlePickup} />
            )}

            {/* PICKED_UP */}
            {order.deliveryStatus === 'PICKED_UP' && (
              <ActionBtn label="Bắt đầu giao hàng" color="#6a1b9a" loading={actionLoading} onClick={handleStart} />
            )}

            {/* IN_DELIVERY */}
            {order.deliveryStatus === 'IN_DELIVERY' && !showFailForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* COD: confirm checkbox */}
                {isCOD && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff3e0', borderRadius: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={codConfirmed} onChange={e => setCodConfirmed(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e65100' }}>
                      Đã thu {order.codAmount.toLocaleString('vi-VN')}đ từ khách
                    </span>
                  </label>
                )}

                <ActionBtn
                  label="Giao thành công"
                  color="#2e7d32"
                  loading={actionLoading}
                  onClick={handleComplete}
                  disabled={isCOD && !codConfirmed}
                />
                <ActionBtn
                  label="Giao thất bại"
                  color="#c62828"
                  loading={false}
                  onClick={() => { setShowFailForm(true); setActionError(''); }}
                  outline
                />
              </div>
            )}

            {/* Fail form */}
            {order.deliveryStatus === 'IN_DELIVERY' && showFailForm && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Lý do giao thất bại</div>
                <select
                  value={failReason}
                  onChange={e => setFailReason(e.target.value as DeliveryFailReason)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, marginBottom: 8 }}
                >
                  {FAIL_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Ghi chú thêm (không bắt buộc)"
                  value={failNote}
                  onChange={e => setFailNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowFailForm(false)}
                    style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid #e0e0e0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Huỷ
                  </button>
                  <ActionBtn label={actionLoading ? '...' : 'Xác nhận thất bại'} color="#c62828" loading={actionLoading} onClick={handleFail} flex={2} />
                </div>
              </div>
            )}

            {/* FAILED — giao lại đúng API */}
            {order.deliveryStatus === 'FAILED' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, color: '#9e9e9e', textAlign: 'center' }}>
                  Lần giao thất bại: {order.attemptCount}/3
                </div>
                <ActionBtn
                  label={`Giao lại (lần ${order.attemptCount + 1})`}
                  color="#1565c0"
                  loading={actionLoading}
                  onClick={handleRetry}
                />
              </div>
            )}

            {/* RETURNING — xác nhận trả kho */}
            {order.deliveryStatus === 'RETURNING' && !showReturnConfirm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, color: '#e65100', textAlign: 'center', fontWeight: 600 }}>
                  Đơn đã thất bại 3 lần — cần trả hàng về kho
                </div>
                <ActionBtn
                  label="Đã trả về kho"
                  color="#e65100"
                  loading={false}
                  onClick={() => setShowReturnConfirm(true)}
                />
              </div>
            )}

            {/* Modal xác nhận trả kho */}
            {order.deliveryStatus === 'RETURNING' && showReturnConfirm && (
              <div style={{ background: '#fff3e0', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e65100', marginBottom: 8 }}>
                  Xác nhận đã trả hàng về kho?
                </div>
                <div style={{ fontSize: 12, color: '#757575', marginBottom: 14 }}>
                  Sau khi xác nhận, Admin sẽ kiểm tra và nhập kho. Hành động này không thể hoàn tác.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowReturnConfirm(false)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #e0e0e0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <ActionBtn
                    label={actionLoading ? '...' : 'Xác nhận đã trả về kho'}
                    color="#e65100"
                    loading={actionLoading}
                    onClick={handleReturnToWarehouse}
                    flex={2}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal state info */}
        {isTerminal && (
          <div style={{
            background: order.deliveryStatus === 'DELIVERED' ? '#e8f5e9' : '#f5f5f5',
            borderRadius: 12, padding: 14, textAlign: 'center',
            color: order.deliveryStatus === 'DELIVERED' ? '#2e7d32' : '#757575',
            fontWeight: 700, fontSize: 14,
          }}>
            {order.deliveryStatus === 'DELIVERED'
              ? '✓ Đơn hàng đã giao thành công'
              : '✓ Đã trả hàng về kho — chờ Admin xác nhận nhập kho'}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub-components ---
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: '#9e9e9e', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);

const Row = ({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '4px 0' }}>
    <span style={{ fontSize: 12, color: '#9e9e9e', flexShrink: 0, marginRight: 8 }}>{label}</span>
    <span style={{ fontSize: 13, color: valueColor ?? '#212121', fontWeight: bold ? 700 : 400, textAlign: 'right' }}>{value}</span>
  </div>
);

const ActionBtn = ({
  label, color, loading, onClick, outline, disabled, flex,
}: {
  label: string; color: string; loading: boolean; onClick: () => void;
  outline?: boolean; disabled?: boolean; flex?: number;
}) => (
  <button
    onClick={onClick}
    disabled={loading || disabled}
    style={{
      flex: flex ?? undefined,
      width: flex ? undefined : '100%',
      padding: '12px 0',
      borderRadius: 10,
      border: outline ? `2px solid ${color}` : 'none',
      background: outline ? '#fff' : (disabled ? '#e0e0e0' : color),
      color: outline ? color : (disabled ? '#9e9e9e' : '#fff'),
      fontSize: 14,
      fontWeight: 700,
      cursor: loading || disabled ? 'not-allowed' : 'pointer',
    }}
  >
    {loading ? '...' : label}
  </button>
);
