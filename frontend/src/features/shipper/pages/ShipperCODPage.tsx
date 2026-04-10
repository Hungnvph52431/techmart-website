import { useEffect, useState } from 'react';
import { shipperService, CODSummary } from '@/services/shipper.service';

const Card = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div style={{
    background: '#fff', borderRadius: 12, padding: 20, marginBottom: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    borderLeft: highlight ? '4px solid #1976d2' : '4px solid #e0e0e0',
  }}>
    <div style={{ fontSize: 13, color: '#757575', marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: highlight ? '#1976d2' : '#212121' }}>{value}</div>
  </div>
);

export const ShipperCODPage = () => {
  const [summary, setSummary] = useState<CODSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await shipperService.getTodayCOD();
        setSummary(res.data);
      } catch {
        setError('Không thể tải dữ liệu COD.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>COD Hôm nay</h2>

      {loading && <div style={{ textAlign: 'center', padding: 32, color: '#757575' }}>Đang tải...</div>}
      {error && <div style={{ textAlign: 'center', padding: 32, color: '#d32f2f' }}>{error}</div>}

      {summary && (
        <>
          <Card label="Số đơn COD hôm nay" value={String(summary.totalOrders)} />
          <Card label="Tổng tiền cần thu" value={fmt(summary.totalCodAmount)} highlight />
          <Card label="Đã thu" value={fmt(summary.collectedAmount)} />
          <div style={{
            background: summary.pendingAmount > 0 ? '#fff3e0' : '#e8f5e9',
            borderRadius: 12, padding: 20,
            borderLeft: `4px solid ${summary.pendingAmount > 0 ? '#ff6d00' : '#2e7d32'}`,
          }}>
            <div style={{ fontSize: 13, color: '#757575', marginBottom: 6 }}>Chưa thu</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: summary.pendingAmount > 0 ? '#e65100' : '#2e7d32' }}>
              {fmt(summary.pendingAmount)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
