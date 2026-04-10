import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const tabs = [
  { to: '/shipper',       label: '📦 Công việc', end: true },
  { to: '/shipper/cod',   label: '💰 COD' },
  { to: '/shipper/stats', label: '📊 Thống kê' },
];

export const ShipperLayout = () => {
  const { user, clearAuth } = useAuthStore();

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f5f5f5',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Top header */}
      <header style={{
        background: '#1565c0',
        color: '#fff',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>TechMart Shipper</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 1 }}>{user?.fullName || user?.email}</div>
        </div>
        <button
          onClick={() => { clearAuth(); window.location.href = '/login'; }}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            borderRadius: 8,
            padding: '7px 13px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Đăng xuất
        </button>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav style={{
        background: '#fff',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            style={({ isActive }) => ({
              flex: 1,
              textAlign: 'center',
              padding: '12px 0 10px',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#1565c0' : '#9e9e9e',
              borderTop: isActive ? '2px solid #1565c0' : '2px solid transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
