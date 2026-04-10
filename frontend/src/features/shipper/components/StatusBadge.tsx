import { DeliveryStatus } from '@/services/shipper.service';

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; bg: string; color: string }> = {
  WAITING_PICKUP: { label: 'Chờ lấy hàng', bg: '#fff3e0', color: '#e65100' },
  PICKED_UP:      { label: 'Đã lấy hàng',  bg: '#e3f2fd', color: '#1565c0' },
  IN_DELIVERY:    { label: 'Đang giao',     bg: '#e8f5e9', color: '#2e7d32' },
  DELIVERED:      { label: 'Đã giao',       bg: '#e8f5e9', color: '#1b5e20' },
  FAILED:         { label: 'Giao thất bại', bg: '#fce4ec', color: '#c62828' },
  RETURNING:      { label: 'Đang hoàn',     bg: '#f3e5f5', color: '#6a1b9a' },
  RETURNED:       { label: 'Đã hoàn',       bg: '#eeeeee', color: '#424242' },
};

interface StatusBadgeProps {
  status: DeliveryStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#eee', color: '#333' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      background: cfg.bg,
      color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
};
