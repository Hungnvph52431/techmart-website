import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { CheckCircle2, Clock, ArrowLeft, Copy } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ====== CẤU HÌNH VIETQR ======
const BANK_ID = "TPB";
const ACCOUNT_NO = "00001302290";
const ACCOUNT_NAME = "BUI VIET KHANH";
// ==============================

const POLLING_INTERVAL = 10_000; // 10 giây

export const BankTransferPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data);
      if (data.status !== 'pending') {
        setIsPaid(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [orderId]);

  const total = order?.totalAmount ?? 0;
  const description = `TechMart ${orderId}`;
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`Đã sao chép ${label}!`));
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (isPaid) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 max-w-md text-center">
          <div className="bg-white rounded-3xl p-10 border-2 border-gray-100 shadow-xl">
            <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-gray-800 mb-2">Đã nhận thanh toán!</h1>
            <p className="text-gray-500 font-bold text-sm mb-6">
              Đơn hàng #{orderId} đã được xác nhận. Cảm ơn bạn!
            </p>
            <Link
              to={`/orders/${orderId}`}
              className="inline-block px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all"
            >
              Xem đơn hàng
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-lg">
        <Link
          to={`/orders/${orderId}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-600 font-bold text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={16} /> Xem đơn hàng
        </Link>

        <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest mb-4">
              <Clock size={14} /> Chờ thanh toán
            </div>
            <h1 className="text-xl font-black text-gray-800">Chuyển khoản QR</h1>
            <p className="text-sm text-gray-400 font-bold mt-1">Đơn hàng #{orderId}</p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center bg-gradient-to-b from-blue-50 to-white rounded-2xl p-6 border-2 border-dashed border-blue-200 mb-6">
            <img
              src={qrUrl}
              alt="VietQR"
              className="w-60 h-60 rounded-2xl shadow-lg mb-4"
            />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
              Quét bằng app ngân hàng bất kỳ
            </p>
          </div>

          {/* Thông tin chuyển khoản */}
          <div className="space-y-3 mb-6">
            <InfoRow
              label="Ngân hàng"
              value={`${BANK_ID} (TPBank)`}
            />
            <InfoRow
              label="Số tài khoản"
              value={ACCOUNT_NO}
              onCopy={() => copyToClipboard(ACCOUNT_NO, "số tài khoản")}
            />
            <InfoRow
              label="Chủ tài khoản"
              value={ACCOUNT_NAME}
            />
            <InfoRow
              label="Số tiền"
              value={`${total.toLocaleString('vi-VN')}₫`}
              highlight
              onCopy={() => copyToClipboard(String(total), "số tiền")}
            />
            <InfoRow
              label="Nội dung CK"
              value={description}
              highlight
              onCopy={() => copyToClipboard(description, "nội dung chuyển khoản")}
            />
          </div>

          {/* Lưu ý */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-2">Lưu ý quan trọng</p>
            <ul className="space-y-1">
              <li className="text-xs text-amber-600 font-bold">• Nhập đúng nội dung chuyển khoản để đơn được tự động xác nhận</li>
              <li className="text-xs text-amber-600 font-bold">• Trang này tự động cập nhật khi đơn được xác nhận</li>
              <li className="text-xs text-amber-600 font-bold">• Nếu quá 24h chưa xác nhận, liên hệ hỗ trợ</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const InfoRow = ({
  label,
  value,
  highlight,
  onCopy,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  onCopy?: () => void;
}) => (
  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-2">
      <span className={`text-sm font-black ${highlight ? 'text-blue-600' : 'text-gray-700'}`}>
        {value}
      </span>
      {onCopy && (
        <button onClick={onCopy} className="text-gray-300 hover:text-blue-500 transition-colors">
          <Copy size={14} />
        </button>
      )}
    </div>
  </div>
);
