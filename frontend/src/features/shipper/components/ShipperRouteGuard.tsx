import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/** Bảo vệ route /shipper/* — chỉ cho phép role 'shipper' */
export const ShipperRouteGuard = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (user?.role !== 'shipper') return <Navigate to="/" replace />;

  return <Outlet />;
};

/** Chặn shipper vào các route web chính → redirect /shipper */
export const BlockShipperGuard = () => {
  const { user } = useAuthStore();

  if (user?.role === 'shipper') return <Navigate to="/shipper" replace />;

  return <Outlet />;
};
