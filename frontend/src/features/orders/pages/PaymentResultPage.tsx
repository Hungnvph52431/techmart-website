import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowRight, ShoppingBag, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import api from '@/services/api';
import { useCartStore } from '@/store/cartStore';

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
    subtitle: 'Giao dịch đã bị hủy. Đơn hàng vẫn còn hiệu lực, bạn có thể thanh toán lại.',
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
  },
  failed: {
    icon: <XCircle className="w-20 h-20 text-rose-500" strokeWidth={1.5} />,
    title: 'Thanh toán thất bại',
    subtitle: 'Giao dịch không thành công. Vui lòng kiểm tra lại thông tin thẻ hoặc thử lại sau.',
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

export const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<ResultStatus>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    void handleVNPayReturn();
  }, []);

  const handleVNPayReturn = async () => {
    // Lấy các params VNPay gửi về
    const vnpResponseCode = searchParams.get('vnp_ResponseCode');
    const vnpTxnRef = searchParams.get('vnp_TxnRef'); // orderCode
    const vnpTransactionStatus = searchParams.get('vnp_TransactionStatus');

    // Nếu không có params VNPay → đây là redirect thủ công (từ mock/internal)
    if (!vnpResponseCode) {
      const manualStatus = searchParams.get('status') as ResultStatus || 'error';
      setStatus(manualStatus);
      setOrderId(searchParams.get('orderId'));
      setOrderCode(searchParams.get('orderCode'));
      setTimeout(() => setVisible(true), 100);
      return;
    }

    // Có params VNPay → gọi backend để verify chữ ký + update DB
    try {
      // Gửi toàn bộ query string về backend để verify
      const queryString = searchParams.toString();
      const response = await api.get(`/payment/vnpay/callback?${queryString}`);

      setOrderCode(vnpTxnRef);
      setOrderId(response.data?.orderId?.toString() || null);

      if (vnpResponseCode === '00' && vnpTransactionStatus === '00') {
        setStatus('success');
      } else if (vnpResponseCode === '24') {
        setStatus('cancel');
      } else {
        setStatus('failed');
      }
    } catch (err) {
      console.error('VNPay callback error:', err);
      // Vẫn hiển thị kết quả dựa trên response code dù backend lỗi
      if (vnpResponseCode === '00' && vnpTransactionStatus === '00') {
        setStatus('success');
      } else if (vnpResponseCode === '24') {
        setStatus('cancel');
      } else {
        setStatus('failed');
      }
      setOrderCode(vnpTxnRef);
    }

    setTimeout(() => setVisible(true), 100);
  };

  if (status === 'loading') {
    return (
      <Layout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-gray-500 font-bold">Đang xử lý kết quả thanh toán...</p>
        </div>
      </Layout>
    );
  }

  const config = RESULT_CONFIG[status];

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
            {(status === 'success' || status === 'cancel' || status === 'failed') && orderId && (
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
