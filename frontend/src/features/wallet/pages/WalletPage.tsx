import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuthStore } from '@/store/authStore';
import { walletService, WalletTransaction } from '@/services/wallet.service';
import toast from 'react-hot-toast';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw, Zap, CreditCard, Clock,
} from 'lucide-react';

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; positive: boolean }> = {
  topup:        { label: 'Nạp ví',     color: 'text-green-600',  icon: <ArrowDownCircle size={16} />, positive: true },
  payment:      { label: 'Thanh toán', color: 'text-red-500',    icon: <ArrowUpCircle size={16} />,   positive: false },
  refund:       { label: 'Hoàn tiền',  color: 'text-blue-600',   icon: <RefreshCw size={16} />,       positive: true },
  admin_adjust: { label: 'Điều chỉnh', color: 'text-violet-600', icon: <Zap size={16} />,             positive: true },
};

export const WalletPage = () => {
  const [searchParams] = useSearchParams();
  const { user, updateUser } = useAuthStore();

  const [balance, setBalance]           = useState<number>(user?.walletBalance ?? 0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txLoading, setTxLoading]       = useState(true);
  const [amount, setAmount]             = useState<number>(100_000);
  const [customInput, setCustomInput]   = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  // Show result toast from URL param after VNPay redirect back
  useEffect(() => {
    const topupResult = searchParams.get('topup');
    if (topupResult === 'success') {
      toast.success('Nạp ví thành công! Số dư đã được cập nhật.');
    } else if (topupResult === 'failed') {
      toast.error('Giao dịch bị hủy hoặc thất bại.');
    } else if (topupResult === 'error') {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  }, []);

  useEffect(() => {
    walletService.getBalance()
      .then((b) => { setBalance(b); updateUser({ walletBalance: b }); })
      .catch(() => {});
    walletService.getTransactions()
      .then(setTransactions).catch(() => {})
      .finally(() => setTxLoading(false));
  }, [searchParams.get('topup')]); // refetch after VNPay return

  const handleCustomInput = (val: string) => {
    const n = Number(val.replace(/\D/g, ''));
    setCustomInput(val.replace(/\D/g, ''));
    if (n > 0) setAmount(n);
  };

  const handleTopup = async () => {
    if (amount < 10_000) { toast.error('Số tiền tối thiểu 10.000₫'); return; }
    if (amount > 50_000_000) { toast.error('Số tiền tối đa 50.000.000₫'); return; }
    try {
      setTopupLoading(true);
      const { paymentUrl } = await walletService.createVNPayTopup(amount);
      window.location.href = paymentUrl;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể tạo giao dịch, thử lại sau!');
      setTopupLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('vi-VN');

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-10 max-w-5xl">

          <div className="mb-8">
            <h1 className="text-3xl font-black uppercase italic tracking-tight text-gray-800">Ví TechMart</h1>
            <p className="text-sm text-gray-400 font-bold mt-1">Quản lý số dư & nạp tiền qua VNPay</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* LEFT: Balance + Topup */}
            <div className="lg:col-span-2 space-y-6">

              {/* Balance card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 p-8 text-white shadow-2xl shadow-orange-200">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-6">
                    <Wallet className="h-5 w-5 opacity-80" />
                    <span className="text-sm font-black uppercase tracking-widest opacity-80">Số dư khả dụng</span>
                  </div>
                  <p className="text-4xl font-black tracking-tight mb-1">{fmt(balance)}₫</p>
                  <p className="text-xs opacity-60 font-bold">{user?.email}</p>
                </div>
              </div>

              {/* Topup form */}
              <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 space-y-5">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">Nạp tiền qua VNPay</h2>

                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((v) => (
                    <button key={v} onClick={() => { setAmount(v); setCustomInput(''); }}
                      className={`py-2.5 rounded-2xl text-xs font-black transition-all border-2 ${
                        amount === v && !customInput
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-gray-100 text-gray-600 hover:border-gray-300'
                      }`}>
                      {v >= 1_000_000 ? `${v / 1_000_000}M` : `${v / 1_000}K`}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input type="text" inputMode="numeric" value={customInput}
                    onChange={(e) => handleCustomInput(e.target.value)}
                    placeholder="Hoặc nhập số tiền khác..."
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-400 pr-10" />
                  <span className="absolute right-4 top-3 text-sm font-black text-gray-400">₫</span>
                </div>

                <div className="flex items-center justify-between bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Sẽ nạp</span>
                  <span className="font-black text-orange-600">{fmt(amount)}₫</span>
                </div>

                {/* VNPay info */}
                <div className="flex items-center gap-3 bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <CreditCard className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black text-blue-800">Thanh toán qua VNPay</p>
                    <p className="text-[10px] text-blue-600 font-bold mt-0.5">ATM, Thẻ tín dụng, QR Banking — tất cả ngân hàng</p>
                  </div>
                </div>

                <button onClick={handleTopup} disabled={topupLoading || amount < 10_000}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-200 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {topupLoading ? 'Đang chuyển hướng...' : `Nạp ${fmt(amount)}₫ qua VNPay`}
                </button>

                <p className="text-center text-[10px] text-gray-400 font-bold">
                  Tiền được cộng tự động sau khi thanh toán thành công.
                </p>
              </div>
            </div>

            {/* RIGHT: Transaction history */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">Lịch sử giao dịch</h2>
                  <span className="text-xs text-gray-400 font-bold">{transactions.length} giao dịch</span>
                </div>

                {txLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-20">
                    <Wallet className="mx-auto h-12 w-12 text-gray-100 mb-3" />
                    <p className="text-gray-400 font-bold text-sm">Chưa có giao dịch nào</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {transactions.map((tx) => {
                      const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.topup;
                      return (
                        <div key={tx.transactionId} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                            cfg.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                          }`}>
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-gray-800">{cfg.label}</p>
                            <p className="text-xs text-gray-400 font-bold truncate mt-0.5">{tx.note || '—'}</p>
                            <p className="text-[10px] text-gray-300 font-bold mt-0.5">
                              {new Date(tx.createdAt).toLocaleString('vi-VN')}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`font-black text-sm ${cfg.positive ? 'text-green-600' : 'text-red-500'}`}>
                              {cfg.positive ? '+' : '-'}{fmt(tx.amount)}₫
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Số dư: {fmt(tx.balanceAfter)}₫</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 bg-amber-50 rounded-2xl border border-amber-100 p-4">
                <div className="flex gap-3">
                  <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <ul className="text-[11px] text-amber-600 font-bold space-y-0.5">
                    <li>• Tiền được cộng <span className="font-black">tự động</span> sau khi VNPay xác nhận thanh toán</li>
                    <li>• Số tiền tối thiểu 10.000₫ — tối đa 50.000.000₫/lần</li>
                    <li>• Ví TechMart chỉ dùng để thanh toán đơn hàng trên TechMart</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
};
