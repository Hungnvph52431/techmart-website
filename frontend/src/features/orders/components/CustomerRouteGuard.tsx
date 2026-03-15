import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const CustomerRouteGuard = () => {
  const location = useLocation();
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (user.role !== 'customer') {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};
