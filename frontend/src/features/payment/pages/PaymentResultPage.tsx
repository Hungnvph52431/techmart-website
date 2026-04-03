// src/pages/PaymentResultPage.tsx

import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, ShoppingBag, Loader2, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useCartStore } from '@/store/cartStore';
import api from '@/services/api';
import toast from 'react-hot-toast';

type ResultStatus = 'loading' | 'success' | 'cancel' | 'failed' | 'error';

const RESULT_CONFIG: Record<Exclude<ResultStatus, 'loading'>, {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
}> = {
  success: {
    icon: <CheckCircle className="w-20 h-20 text-emerald-500" strokeWidth={1.5} />,
    title: 'Thanh toán thành công!',
    subtitle: 'Đơn hàng của bạn đã được xác nhận. Chúng tôi sẽ xử lý và giao hàng sớm nhất.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  cancel: {
    icon: <XCircle className="w-20 h-20 text-rose-400" strokeWidth={1.5} />,
    title: 'Đã hủy thanh toán',
    subtitle: 'Giao dịch đã bị hủy. Đơn hàng vẫn còn hiệu lực, bạn có thể thanh toán lại trong vòng 10 phút.',
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
  },
  failed: {
    icon: <XCircle className="w-20 h-20 text-rose-500" strokeWidth={1.5} />,
    title: 'Thanh toán thất bại',
    subtitle: 'Giao dịch không thành công. Vui lòng kiểm tra lại thông tin thẻ hoặc thử thanh toán lại.',
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
  },
  error: {
    icon: <XCircle className="w-20 h-20 text-gray-400" strokeWidth={1.5} />,
    title: 'Có lỗi xảy ra',
    subtitle: 'Đã xảy ra lỗi trong quá trình xử lý. Vui lòng liên hệ hỗ trợ nếu tiền đã bị trừ.',
    color: 'text-gray-600',
    bg: 'bg-gray-50 border-gray-200',
  },
};

const REPAY_WINDOW_SECONDS = 10 * 60;

export const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [repaying, setRepaying] = useState(false);
  const [seconds, setSeconds] = useState(REPAY_WINDOW_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const statusParam = (searchParams.get('status') as ResultStatus) || 'error';
  const orderId = searchParams.get('orderId');
  const orderCode = searchParams.get('orderCode');

  const canRepay = statusParam === 'cancel' || statusParam === 'failed';
  const expired = seconds <= 0;

  useEffect(() => {
    if (!canRepay) return;

    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [canRepay]);

  useEffect(() => {
    if (statusParam === 'success') {
      useCartStore.getState().clearCart();
    }
    setTimeout(() => setVisible(true), 100);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const progressPct = (seconds / REPAY_WINDOW_SECONDS) * 100;

  const handleRepay = async () => {
    if (!orderId || expired) return;
    try {
      setRepaying(true);
      const { data } = await api.post('/payment/vnpay/repay', { orderId: Number(orderId) });
      window.location.href = data.paymentUrl;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tạo lại link thanh toán');
      setRepaying(false);
    }
  };

  const displayStatus: Exclude<ResultStatus, 'loading'> =
    statusParam === 'loading' ? 'error' : statusParam;
  const config = RESULT_CONFIG[displayStatus];

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div
          className={`w-full max-w-md text-center transition-all duration-500 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex justify-center mb-6">{config.icon}</div>

          <h1 className={`text-2xl font-black ${config.color} mb-3`}>
            {config.title}
          </h1>
          <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
            {config.subtitle}
          </p>

          {(orderId || orderCode) && (
            <div className={`inline-flex flex-col items-center gap-1 px-6 py-4 rounded-2xl border ${config.bg} mb-8`}>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                Mã đơn hàng
              </p>
              <p className={`font-black text-lg font-mono ${config.color}`}>
                #{orderCode || orderId}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {/* ── THANH TOÁN LẠI ── */}
            {canRepay && orderId && (
              <div className="space-y-2 mb-1">
                {!expired ? (
                  <>
                    <div className="flex items-center justify-between text-xs font-bold text-gray-400 px-1">
                      <span>Thời gian thanh toán lại</span>
                      <span
                        className={`font-black tabular-nums transition-colors ${
                          seconds <= 60 ? 'text-red-500' : 'text-gray-500'
                        }`}
                      >
                        {mm}:{ss}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          seconds <= 60 ? 'bg-red-400' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <button
                      onClick={handleRepay}
                      disabled={repaying}
                      className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-wider text-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60 shadow-lg shadow-blue-100"
                    >
                      {repaying ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      {repaying ? 'Đang chuyển hướng...' : 'Thanh toán lại qua VNPay'}
                    </button>
                  </>
                ) : (
                  <div className="py-3 px-4 rounded-2xl bg-gray-50 border-2 border-gray-100 text-sm text-gray-400 font-bold">
                    ⏱ Đã hết thời gian thanh toán lại. Vui lòng liên hệ hỗ trợ hoặc đặt đơn mới.
                  </div>
                )}
              </div>
            )}

            {(statusParam === 'success' || statusParam === 'cancel' || statusParam === 'failed') && orderId && (
              <Link
                to={`/orders/${orderId}`}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-wider text-sm hover:bg-slate-800 transition-all"
              >
                <ShoppingBag size={16} />
                Xem chi tiết đơn hàng
                <ArrowRight size={16} />
              </Link>
            )}

            <Link
              to="/"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-black uppercase tracking-wider text-sm hover:bg-gray-50 transition-all"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};