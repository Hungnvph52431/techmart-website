import { Outlet } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';

export const CustomerOrdersLayout = () => {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};
