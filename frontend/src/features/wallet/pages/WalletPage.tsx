import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Zap,
  CreditCard,
  Clock,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useAuthStore } from '@/store/authStore';
import {
  walletService,
  type SupportedBank,
  type WalletTransaction,
  type WalletWithdrawalProfile,
  type WalletWithdrawalRequest,
} from '@/services/wallet.service';
import { BankPicker } from '@/features/wallet/components/BankPicker';

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; positive: boolean }> = {
  topup:             { label: 'Nạp ví',            color: 'text-green-600',  icon: <ArrowDownCircle size={16} />, positive: true },
  payment:           { label: 'Thanh toán',        color: 'text-red-500',    icon: <ArrowUpCircle size={16} />,   positive: false },
  refund:            { label: 'Hoàn tiền',         color: 'text-blue-600',   icon: <RefreshCw size={16} />,       positive: true },
  admin_adjust:      { label: 'Điều chỉnh',        color: 'text-violet-600', icon: <Zap size={16} />,             positive: true },
  withdraw_request:  { label: 'Rút tiền',          color: 'text-red-500',    icon: <ArrowUpCircle size={16} />,   positive: false },
  withdraw_reversal: { label: 'Hoàn lại rút tiền', color: 'text-blue-600',   icon: <RefreshCw size={16} />,       positive: true },
  withdraw_complete: { label: 'Hoàn tất rút',      color: 'text-red-500',    icon: <ArrowUpCircle size={16} />,   positive: false },
};

const WITHDRAWAL_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Chờ xử lý', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Đã duyệt', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid: { label: 'Đã chuyển khoản', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Từ chối', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-gray-50 text-gray-700 border-gray-200' },
};

const formatCurrency = (n: number) => n.toLocaleString('vi-VN');
const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const formatDate = (date?: string) =>
  date
    ? new Date(date).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const WalletPage = () => {
  const [searchParams] = useSearchParams();
  const topupResult = searchParams.get('topup');
  const { user, updateUser } = useAuthStore();

  const [balance, setBalance] = useState<number>(user?.walletBalance ?? 0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawalRequest[]>([]);
  const [supportedBanks, setSupportedBanks] = useState<SupportedBank[]>([]);
  const [withdrawalProfile, setWithdrawalProfile] = useState<WalletWithdrawalProfile | null>(null);

  const [txLoading, setTxLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);

  const [amount, setAmount] = useState<number>(100_000);
  const [customInput, setCustomInput] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [showSetupCard, setShowSetupCard] = useState(false);
  const [showWithdrawCard, setShowWithdrawCard] = useState(false);

  const [setupForm, setSetupForm] = useState({
    bankCode: '',
    accountNumber: '',
    accountHolderName: '',
    branchName: '',
    pin: '',
    confirmPin: '',
  });

  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    pin: '',
    customerNote: '',
  });

  const loadWalletData = async () => {
    try {
      setTxLoading(true);
      setProfileLoading(true);
      setWithdrawalsLoading(true);

      const [nextBalance, nextTransactions, nextBanks, nextProfile, nextWithdrawals] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions(),
        walletService.getSupportedBanks(),
        walletService.getWithdrawalProfile(),
        walletService.getWithdrawals(),
      ]);

      setBalance(nextBalance);
      updateUser({ walletBalance: nextBalance });
      setTransactions(nextTransactions);
      setSupportedBanks(nextBanks);
      setWithdrawalProfile(nextProfile);
      setWithdrawals(nextWithdrawals);
    } catch {
      toast.error('Không thể tải dữ liệu ví');
    } finally {
      setTxLoading(false);
      setProfileLoading(false);
      setWithdrawalsLoading(false);
    }
  };

  useEffect(() => {
    if (topupResult === 'success') {
      toast.success('Nạp ví thành công! Số dư đã được cập nhật.');
    } else if (topupResult === 'failed') {
      toast.error('Giao dịch bị hủy hoặc thất bại.');
    } else if (topupResult === 'error') {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  }, [topupResult]);

  useEffect(() => {
    void loadWalletData();
  }, [topupResult]);

  const handleCustomInput = (val: string) => {
    const n = Number(val.replace(/\D/g, ''));
    setCustomInput(val.replace(/\D/g, ''));
    if (n > 0) setAmount(n);
  };

  const handleTopup = async () => {
    if (amount < 10_000) {
      toast.error('Số tiền tối thiểu 10.000₫');
      return;
    }
    if (amount > 50_000_000) {
      toast.error('Số tiền tối đa 50.000.000₫');
      return;
    }

    try {
      setTopupLoading(true);
      const { paymentUrl } = await walletService.createVNPayTopup(amount);
      window.location.href = paymentUrl;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể tạo giao dịch, thử lại sau!');
      setTopupLoading(false);
    }
  };

  const openWithdrawFlow = () => {
    if (!withdrawalProfile?.bankAccount || !withdrawalProfile.hasWithdrawPin) {
      setShowSetupCard(true);
      setShowWithdrawCard(false);
      return;
    }

    setShowWithdrawCard(true);
    setShowSetupCard(false);
  };

  const handleSetupChange = (field: keyof typeof setupForm, value: string) => {
    setSetupForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleWithdrawFormChange = (field: keyof typeof withdrawForm, value: string) => {
    setWithdrawForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSetupWithdrawalProfile = async () => {
    if (!setupForm.bankCode) {
      toast.error('Vui lòng chọn ngân hàng');
      return;
    }

    if (!/^\d{6,20}$/.test(setupForm.accountNumber.replace(/\s+/g, ''))) {
      toast.error('Số tài khoản phải từ 6 đến 20 chữ số');
      return;
    }

    if (!setupForm.accountHolderName.trim()) {
      toast.error('Vui lòng nhập tên chủ tài khoản');
      return;
    }

    if (!setupForm.branchName.trim()) {
      toast.error('Vui lòng nhập chi nhánh ngân hàng');
      return;
    }

    if (!/^\d{6}$/.test(setupForm.pin)) {
      toast.error('Mật khẩu rút tiền phải gồm đúng 6 chữ số');
      return;
    }

    if (setupForm.pin !== setupForm.confirmPin) {
      toast.error('Mật khẩu rút tiền và xác nhận mật khẩu không trùng nhau');
      return;
    }

    try {
      setActionLoading(true);
      const profile = await walletService.setupWithdrawalProfile(setupForm);
      setWithdrawalProfile(profile);
      toast.success('Đã liên kết ngân hàng và thiết lập mật khẩu rút tiền');
      setSetupForm({
        bankCode: '',
        accountNumber: '',
        accountHolderName: '',
        branchName: '',
        pin: '',
        confirmPin: '',
      });
      setShowSetupCard(false);
      setShowWithdrawCard(true);
      await loadWalletData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể thiết lập thông tin rút tiền');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWithdrawal = async () => {
    const parsedAmount = Number(withdrawForm.amount.replace(/\D/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền rút hợp lệ');
      return;
    }

    if (!/^\d{6}$/.test(withdrawForm.pin)) {
      toast.error('Mật khẩu rút tiền phải gồm đúng 6 chữ số');
      return;
    }

    try {
      setActionLoading(true);
      await walletService.createWithdrawal({
        amount: parsedAmount,
        pin: withdrawForm.pin,
        customerNote: withdrawForm.customerNote.trim() || undefined,
      });
      toast.success('Đã tạo yêu cầu rút tiền thành công');
      setWithdrawForm({ amount: '', pin: '', customerNote: '' });
      setShowWithdrawCard(false);
      await loadWalletData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tạo yêu cầu rút tiền');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black uppercase italic tracking-tight text-gray-800">Ví TechMart</h1>
            <p className="text-sm text-gray-400 font-bold mt-1">Quản lý số dư, nạp ví và rút tiền về ngân hàng</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 p-8 text-white shadow-2xl shadow-orange-200">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-6">
                    <Wallet className="h-5 w-5 opacity-80" />
                    <span className="text-sm font-black uppercase tracking-widest opacity-80">Số dư khả dụng</span>
                  </div>
                  <p className="text-4xl font-black tracking-tight mb-1">{formatCurrency(balance)}₫</p>
                  <p className="text-xs opacity-60 font-bold">{user?.email}</p>

                  <button
                    onClick={openWithdrawFlow}
                    className="mt-6 inline-flex items-center justify-center w-full rounded-2xl bg-white/15 px-4 py-3 text-sm font-black uppercase tracking-widest text-white border border-white/20 hover:bg-white/20 transition-all"
                  >
                    Rút tiền về ngân hàng
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">Tài khoản ngân hàng nhận tiền</h2>
                    <p className="text-xs text-gray-400 font-bold mt-1">Mỗi tài khoản chỉ liên kết một ngân hàng để rút tiền</p>
                  </div>
                  {withdrawalProfile?.hasWithdrawPin ? (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      PIN đã thiết lập
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                      Chưa thiết lập PIN
                    </span>
                  )}
                </div>

                {profileLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : withdrawalProfile?.bankAccount ? (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 space-y-2">
                    <p className="text-sm font-black text-gray-800">{withdrawalProfile.bankAccount.bankName}</p>
                    <p className="text-xs text-gray-500 font-bold">Số tài khoản: {withdrawalProfile.bankAccount.accountNumberMasked}</p>
                    <p className="text-xs text-gray-500 font-bold">Chủ tài khoản: {withdrawalProfile.bankAccount.accountHolderName}</p>
                    <p className="text-xs text-gray-500 font-bold">Chi nhánh: {withdrawalProfile.bankAccount.branchName}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5">
                    <p className="text-sm font-bold text-gray-500">Bạn chưa liên kết tài khoản ngân hàng để rút tiền.</p>
                  </div>
                )}

                <button
                  onClick={openWithdrawFlow}
                  className="w-full rounded-2xl border-2 border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black uppercase tracking-widest text-blue-700 hover:bg-blue-100 transition-all"
                >
                  {!withdrawalProfile?.bankAccount || !withdrawalProfile?.hasWithdrawPin
                    ? 'Liên kết ngân hàng và thiết lập PIN'
                    : 'Tạo yêu cầu rút tiền'}
                </button>
              </div>

              {showSetupCard && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 space-y-5">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">Thiết lập rút tiền lần đầu</h2>
                    <p className="text-xs text-gray-400 font-bold mt-1">Liên kết ngân hàng và tạo mật khẩu rút tiền 6 số</p>
                  </div>

                  <div className="space-y-2">
                    <BankPicker
                      banks={supportedBanks}
                      value={setupForm.bankCode}
                      onChange={(bankCode) => handleSetupChange('bankCode', bankCode)}
                      disabled={actionLoading}
                    />
                    <p className="px-1 text-[11px] font-bold text-gray-400">
                      Danh sách đã bao gồm các ngân hàng đang hoạt động tại Việt Nam. Bạn có thể tìm nhanh theo tên, mã hoặc viết tắt.
                    </p>
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={setupForm.accountNumber}
                    onChange={(e) => handleSetupChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                    placeholder="Số tài khoản ngân hàng"
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-400"
                  />

                  <input
                    type="text"
                    value={setupForm.accountHolderName}
                    onChange={(e) => handleSetupChange('accountHolderName', e.target.value)}
                    placeholder="Tên chủ tài khoản"
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-400"
                  />

                  <input
                    type="text"
                    value={setupForm.branchName}
                    onChange={(e) => handleSetupChange('branchName', e.target.value)}
                    placeholder="Chi nhánh ngân hàng"
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-400"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={setupForm.pin}
                      onChange={(e) => handleSetupChange('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="PIN 6 số"
                      className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-400"
                    />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={setupForm.confirmPin}
                      onChange={(e) => handleSetupChange('confirmPin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Nhập lại PIN"
                      className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-400"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSetupCard(false)}
                      className="flex-1 rounded-2xl border-2 border-gray-100 px-4 py-3 text-sm font-black uppercase tracking-widest text-gray-500 hover:border-gray-200"
                    >
                      Đóng
                    </button>
                    <button
                      onClick={handleSetupWithdrawalProfile}
                      disabled={actionLoading}
                      className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-3 text-sm font-black uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {actionLoading ? 'Đang lưu...' : 'Liên kết ngay'}
                    </button>
                  </div>
                </div>
              )}

              {showWithdrawCard && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 space-y-5">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">Tạo yêu cầu rút tiền</h2>
                    <p className="text-xs text-gray-400 font-bold mt-1">Tiền sẽ được trừ khỏi ví ngay khi yêu cầu được tạo</p>
                  </div>

                  {withdrawalProfile?.bankAccount && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
                      <p className="text-sm font-black text-blue-800">{withdrawalProfile.bankAccount.bankName}</p>
                      <p className="text-xs text-blue-600 font-bold mt-1">
                        {withdrawalProfile.bankAccount.accountHolderName} · {withdrawalProfile.bankAccount.accountNumberMasked}
                      </p>
                      <p className="text-xs text-blue-500 font-bold mt-1">Chi nhánh: {withdrawalProfile.bankAccount.branchName}</p>
                    </div>
                  )}

                  <input
                    type="text"
                    inputMode="numeric"
                    value={withdrawForm.amount}
                    onChange={(e) => handleWithdrawFormChange('amount', e.target.value.replace(/\D/g, ''))}
                    placeholder="Số tiền cần rút"
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-400"
                  />

                  <textarea
                    value={withdrawForm.customerNote}
                    onChange={(e) => handleWithdrawFormChange('customerNote', e.target.value)}
                    rows={3}
                    placeholder="Ghi chú thêm cho yêu cầu rút tiền (không bắt buộc)"
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-400 resize-none"
                  />

                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={withdrawForm.pin}
                    onChange={(e) => handleWithdrawFormChange('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Nhập mật khẩu rút tiền 6 số"
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-400"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowWithdrawCard(false)}
                      className="flex-1 rounded-2xl border-2 border-gray-100 px-4 py-3 text-sm font-black uppercase tracking-widest text-gray-500 hover:border-gray-200"
                    >
                      Đóng
                    </button>
                    <button
                      onClick={handleCreateWithdrawal}
                      disabled={actionLoading}
                      className="flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 px-4 py-3 text-sm font-black uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {actionLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 space-y-5">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">Nạp tiền qua VNPay</h2>

                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setAmount(value);
                        setCustomInput('');
                      }}
                      className={`py-2.5 rounded-2xl text-xs font-black transition-all border-2 ${
                        amount === value && !customInput
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-gray-100 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {value >= 1_000_000 ? `${value / 1_000_000}M` : `${value / 1_000}K`}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customInput}
                    onChange={(e) => handleCustomInput(e.target.value)}
                    placeholder="Hoặc nhập số tiền khác..."
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-400 pr-10"
                  />
                  <span className="absolute right-4 top-3 text-sm font-black text-gray-400">₫</span>
                </div>

                <div className="flex items-center justify-between bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Sẽ nạp</span>
                  <span className="font-black text-orange-600">{formatCurrency(amount)}₫</span>
                </div>

                <div className="flex items-center gap-3 bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <CreditCard className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black text-blue-800">Thanh toán qua VNPay</p>
                    <p className="text-[10px] text-blue-600 font-bold mt-0.5">ATM, Thẻ tín dụng, QR Banking — tất cả ngân hàng</p>
                  </div>
                </div>

                <button
                  onClick={handleTopup}
                  disabled={topupLoading || amount < 10_000}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-200 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {topupLoading ? 'Đang chuyển hướng...' : `Nạp ${formatCurrency(amount)}₫ qua VNPay`}
                </button>

                <p className="text-center text-[10px] text-gray-400 font-bold">Tiền được cộng tự động sau khi thanh toán thành công.</p>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-6">
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
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                              cfg.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                            }`}
                          >
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-gray-800">{cfg.label}</p>
                            <p className="text-xs text-gray-400 font-bold truncate mt-0.5">{tx.note || '—'}</p>
                            <p className="text-[10px] text-gray-300 font-bold mt-0.5">{formatDate(tx.createdAt)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`font-black text-sm ${cfg.positive ? 'text-green-600' : 'text-red-500'}`}>
                              {cfg.positive ? '+' : '-'}
                              {formatCurrency(tx.amount)}₫
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Số dư: {formatCurrency(tx.balanceAfter)}₫</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">Lịch sử rút tiền</h2>
                  <span className="text-xs text-gray-400 font-bold">{withdrawals.length} yêu cầu</span>
                </div>

                {withdrawalsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : withdrawals.length === 0 ? (
                  <div className="text-center py-16">
                    <Clock className="mx-auto h-10 w-10 text-gray-100 mb-3" />
                    <p className="text-gray-400 font-bold text-sm">Chưa có yêu cầu rút tiền nào</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {withdrawals.map((item) => {
                      const statusConfig = WITHDRAWAL_STATUS_CONFIG[item.status] ?? WITHDRAWAL_STATUS_CONFIG.pending;
                      return (
                        <div key={item.requestId} className="px-6 py-5 hover:bg-gray-50/40">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <p className="text-sm font-black text-gray-800">{item.referenceCode}</p>
                                <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-black ${statusConfig.className}`}>
                                  {statusConfig.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 font-bold">
                                {item.bankName} · {item.accountNumberMasked} · {item.accountHolderName}
                              </p>
                              <p className="text-xs text-gray-400 font-bold">Tạo lúc: {formatDate(item.requestedAt)}</p>
                              {item.adminNote && <p className="text-xs text-gray-500 font-bold">Ghi chú: {item.adminNote}</p>}
                              {item.transferReceiptImageUrl && (
                                <a
                                  href={getImageUrl(item.transferReceiptImageUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100"
                                >
                                  Xem biên lai chuyển khoản
                                </a>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-rose-600">-{formatCurrency(item.amount)}₫</p>
                              <p className="text-[11px] text-gray-400 font-bold mt-1">
                                {item.paidAt
                                  ? `Đã chuyển: ${formatDate(item.paidAt)}`
                                  : item.rejectedAt
                                    ? `Từ chối: ${formatDate(item.rejectedAt)}`
                                    : item.approvedAt
                                      ? `Đã duyệt: ${formatDate(item.approvedAt)}`
                                      : 'Đang chờ xử lý'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                <div className="flex gap-3">
                  <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <ul className="text-[11px] text-amber-600 font-bold space-y-0.5">
                    <li>• Rút tiền lần đầu cần liên kết ngân hàng và thiết lập mật khẩu rút tiền 6 số</li>
                    <li>• TechMart hiện xử lý rút tiền theo yêu cầu thủ công từ admin</li>
                    <li>• Nếu yêu cầu bị từ chối, số dư ví sẽ được hoàn lại tự động</li>
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
