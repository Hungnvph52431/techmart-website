import { useEffect, useState } from 'react';
import { Wallet, RefreshCw } from 'lucide-react';
import { walletService, type WalletTopupRequest } from '@/services/wallet.service';
import toast from 'react-hot-toast';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const DAY_OPTIONS = [7, 14, 30];

export const AdminWalletTopups = () => {
  const [topups, setTopups]   = useState<WalletTopupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays]       = useState(7);

  const load = async (d: number) => {
    try {
      setLoading(true);
      setTopups(await walletService.adminListTopups(d));
    } catch {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(days); }, [days]);

  const totalAmount = topups.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase italic flex items-center gap-2">
            <Wallet size={22} className="text-orange-500" /> Lịch sử nạp ví
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Giao dịch nạp ví thành công — tự động qua VNPay
          </p>
        </div>
        <button onClick={() => load(days)} disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* Stats + Day filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tổng nạp</p>
            <p className="text-xl font-black text-emerald-700 mt-0.5">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-3">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Giao dịch</p>
            <p className="text-xl font-black text-orange-700 mt-0.5">{topups.length}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {DAY_OPTIONS.map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                days === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}>
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-gray-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Đang tải...
          </div>
        ) : topups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Wallet size={40} className="mb-3 opacity-30" />
            <p className="font-bold text-sm">Chưa có giao dịch nào trong {days} ngày qua</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Mã giao dịch', 'Khách hàng', 'Số tiền', 'Thời gian nạp', 'Hoàn thành lúc'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topups.map(item => (
                <tr key={item.requestId} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs font-bold text-gray-700">{item.referenceCode}</span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-gray-800 text-xs">{item.userName ?? '—'}</p>
                    <p className="text-gray-400 text-xs">{item.userEmail ?? ''}</p>
                  </td>
                  <td className="px-5 py-4 font-black text-emerald-600">{formatCurrency(item.amount)}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">{formatDate(item.createdAt)}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                    {item.completedAt ? formatDate(item.completedAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
