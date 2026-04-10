import { useState } from 'react';
import { shipperService, ShipperStats } from '@/services/shipper.service';

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = today.slice(0, 8) + '01';

export const ShipperStatsPage = () => {
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [stats, setStats] = useState<ShipperStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await shipperService.getStats(from, to);
      setStats(res.data);
    } catch {
      setError('Không thể tải thống kê.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800 }}>📊 Thống kê giao hàng</h2>

      {/* Date picker */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, color: '#9e9e9e', display: 'block', marginBottom: 4 }}>Từ ngày</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13 }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, color: '#9e9e9e', display: 'block', marginBottom: 4 }}>Đến ngày</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13 }} />
          </div>
          <button onClick={fetch} disabled={loading}
            style={{ height: 36, marginTop: 16, padding: '0 18px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {loading ? '...' : 'Xem'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#d32f2f', textAlign: 'center', padding: 16 }}>{error}</div>}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatCard label="Giao thành công" value={String(stats.totalDelivered)} color="#2e7d32" bg="#e8f5e9" />
          <StatCard label="Giao thất bại" value={String(stats.totalFailed)} color="#c62828" bg="#fce4ec" />
          <StatCard label="Tỉ lệ thành công" value={`${stats.successRate}%`} color="#1565c0" bg="#e3f2fd" />
          <StatCard label="COD đã thu" value={`${stats.totalCodCollected.toLocaleString('vi-VN')}đ`} color="#e65100" bg="#fff3e0" />
        </div>
      )}

      {!stats && !loading && !error && (
        <div style={{ textAlign: 'center', padding: 32, color: '#9e9e9e', fontSize: 14 }}>
          Chọn khoảng thời gian và bấm Xem
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) => (
  <div style={{ background: bg, borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 11, color: '#757575', marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
  </div>
);
