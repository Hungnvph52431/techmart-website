import { Link, Outlet, useLocation } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';

export const CustomerOrdersLayout = () => {
  const location = useLocation();
  const isDetailPage = /^\/orders\/\d+/.test(location.pathname);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-slate-900 px-6 py-8 text-white md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-300">Tai khoan</p>
            <h1 className="mt-2 text-3xl font-bold">
              {isDetailPage ? 'Chi tiet don hang' : 'Don hang cua toi'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Theo doi trang thai, lich su xu ly, yeu cau hoan/tra va danh gia sau mua hang.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/orders"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              Xem don hang
            </Link>
            <Link
              to="/products"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Tiep tuc mua sam
            </Link>
          </div>
        </div>
        <Outlet />
      </div>
    </Layout>
  );
};
