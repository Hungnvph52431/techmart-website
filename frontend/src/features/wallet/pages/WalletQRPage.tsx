import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { walletService } from '@/services/wallet.service';
import { CheckCircle2, XCircle, Clock, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const BANK_ID = 'TPB';
const ACCOUNT_NO = '00001302290';
const ACCOUNT_NAME = 'BUI VIET KHANH';
const EXPIRE_SECONDS = 15 * 60; // 15 phút

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const formatCountdown = (secs: number) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const WalletQRPage = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<any>(null);
  const [countdown, setCountdown] = useState(EXPIRE_SECONDS);
  const [loading, setLoading] = useState(true);

  // Tải thông tin request
  const loadRequest = useCallback(async () => {
    if (!requestId) return;
    try {
      const data = await walletService.getTopupStatus(Number(requestId));
      setRequest(data);

      // Tính countdown từ expiresAt
      const remaining = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
      setCountdown(remaining);

      if (data.status === 'completed') {
        toast.success('Nạp tiền thành công! Số dư đã được cập nhật.');
        setTimeout(() => navigate('/profile'), 2000);
      }
      if (data.status === 'expired' || data.status === 'failed') {
        toast.error('Yêu cầu đã hết hạn hoặc thất bại.');
      }
    } catch {
      toast.error('Không thể tải thông tin yêu cầu');
    } finally {
      setLoading(false);
    }
  }, [requestId, navigate]);

  useEffect(() => { void loadRequest(); }, [loadRequest]);

  // Countdown timer
  useEffect(() => {
    if (!request || request.status !== 'pending') return;
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(timer);
  }, [request, countdown]);

  // Polling mỗi 10 giây khi pending
  useEffect(() => {
    if (!request || request.status !== 'pending') return;
    const poll = setInterval(() => void loadRequest(), 10000);
    return () => clearInterval(poll);
  }, [request, loadRequest]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!request) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <XCircle size={48} className="mx-auto mb-4 text-rose-400" />
          <h2 className="text-xl font-black text-gray-900">Không tìm thấy yêu cầu</h2>
          <button onClick={() => navigate('/profile')} className="mt-6 px-6 py-3 bg-orange-500 text-white rounded-2xl font-bold">Quay lại</button>
        </div>
      </Layout>
    );
  }

  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${request.amount}&addInfo=${encodeURIComponent(request.referenceCode)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
  const isExpired = request.status === 'expired' || (request.status === 'pending' && countdown <= 0);
  const isCompleted = request.status === 'completed';
  const isFailed = request.status === 'failed';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-lg">
        <div className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 text-white">
            <h1 className="text-xl font-black uppercase tracking-tight">Nạp tiền vào ví</h1>
            <p className="text-orange-100 text-sm mt-1">Mã giao dịch: <span className="font-mono font-bold">{request.referenceCode}</span></p>
          </div>

          <div className="p-6 space-y-6">
            {/* Status */}
            {isCompleted && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
                <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-black text-emerald-800">Nạp tiền thành công!</p>
                  <p className="text-sm text-emerald-600">Số dư ví đã được cập nhật</p>
                </div>
              </div>
            )}

            {(isExpired || isFailed) && (
              <div className="flex items-center gap-3 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl">
                <XCircle size={24} className="text-rose-600 flex-shrink-0" />
                <div>
                  <p className="font-black text-rose-800">{isExpired ? 'Yêu cầu đã hết hạn' : 'Giao dịch thất bại'}</p>
                  <p className="text-sm text-rose-600">Vui lòng tạo yêu cầu mới</p>
                </div>
              </div>
            )}

            {/* QR Code */}
            {!isCompleted && (
              <>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Quét mã để chuyển khoản</p>
                  <div className={`relative inline-block ${isExpired ? 'opacity-40 grayscale' : ''}`}>
                    <img src={qrUrl} alt="VietQR" className="w-56 h-56 rounded-2xl shadow-lg mx-auto" />
                    {isExpired && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20">
                        <span className="bg-white text-rose-600 font-black text-xs px-3 py-1 rounded-full">Hết hạn</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-1 text-sm">
                    <p className="font-black text-gray-800">{ACCOUNT_NAME}</p>
                    <p className="text-gray-500 font-bold">{BANK_ID} - {ACCOUNT_NO}</p>
                    <p className="text-gray-500 font-bold">Nội dung: <span className="font-mono text-orange-600">{request.referenceCode}</span></p>
                    <p className="text-2xl font-black text-orange-600 mt-2">{formatCurrency(request.amount)}</p>
                  </div>
                </div>

                {/* Countdown */}
                {request.status === 'pending' && (
                  <div className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-lg ${
                    countdown > 60 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    <Clock size={20} />
                    <span>Hết hạn sau: {formatCountdown(countdown)}</span>
                  </div>
                )}

                <div className="bg-blue-50 rounded-2xl p-4 text-xs text-blue-700 space-y-1">
                  <p className="font-black">Lưu ý quan trọng:</p>
                  <p>• Nhập đúng nội dung chuyển khoản: <span className="font-mono font-bold">{request.referenceCode}</span></p>
                  <p>• Chuyển đúng số tiền: <span className="font-bold">{formatCurrency(request.amount)}</span></p>
                  <p>• Trang sẽ tự động cập nhật khi Admin xác nhận</p>
                  <p>• Thời hạn thanh toán: 15 phút</p>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {request.status === 'pending' && (
                <button onClick={() => void loadRequest()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
                  <RefreshCcw size={15} /> Kiểm tra trạng thái
                </button>
              )}
              <button onClick={() => navigate('/profile')}
                className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600">
                {isCompleted ? 'Về trang cá nhân' : 'Huỷ & Quay lại'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
