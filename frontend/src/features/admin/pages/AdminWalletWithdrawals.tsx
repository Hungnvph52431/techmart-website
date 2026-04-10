import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Wallet, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { walletService, type AdminWalletWithdrawalRequest, type WalletWithdrawalStatus } from '@/services/wallet.service';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_LABEL: Record<WalletWithdrawalStatus, string> = {
  pending: 'Chờ xử lý',
  approved: 'Đã duyệt',
  paid: 'Đã chuyển khoản',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
};

const STATUS_BADGE: Record<WalletWithdrawalStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-gray-50 text-gray-700 border-gray-200',
};

const DAY_OPTIONS = [7, 14, 30];

export const AdminWalletWithdrawals = () => {
  const [items, setItems] = useState<AdminWalletWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState<'all' | WalletWithdrawalStatus>('all');
  const [actionModal, setActionModal] = useState<{
    request: AdminWalletWithdrawalRequest;
    status: 'approved' | 'paid' | 'rejected';
  } | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const load = async (nextDays = days, nextStatus = status) => {
    try {
      setLoading(true);
      const result = await walletService.adminListWithdrawals({ days: nextDays, status: nextStatus });
      setItems(result);
    } catch {
      toast.error('Không thể tải danh sách yêu cầu rút tiền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(days, status);
  }, [days, status]);

  const pendingAmount = useMemo(
    () => items.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0),
    [items]
  );

  const openActionModal = (
    request: AdminWalletWithdrawalRequest,
    nextStatus: 'approved' | 'paid' | 'rejected'
  ) => {
    setActionModal({ request, status: nextStatus });
    setAdminNote('');
  };

  const closeActionModal = () => {
    setActionModal(null);
    setAdminNote('');
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;

    if (actionModal.status === 'rejected' && !adminNote.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setProcessing(true);
      await walletService.adminUpdateWithdrawalStatus(actionModal.request.requestId, {
        status: actionModal.status,
        adminNote: adminNote.trim() || undefined,
      });
      toast.success('Cập nhật yêu cầu rút tiền thành công');
      closeActionModal();
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase italic flex items-center gap-2">
            <Wallet size={22} className="text-blue-600" /> Yêu cầu rút ví
          </h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý yêu cầu rút tiền về ngân hàng của khách hàng</p>
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Đang chờ</p>
            <p className="text-xl font-black text-amber-700 mt-0.5">{formatCurrency(pendingAmount)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Yêu cầu</p>
            <p className="text-xl font-black text-blue-700 mt-0.5">{items.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {DAY_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setDays(option)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  days === option ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {option} ngày
              </button>
            ))}
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | WalletWithdrawalStatus)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 bg-white"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="approved">Đã duyệt</option>
            <option value="paid">Đã chuyển khoản</option>
            <option value="rejected">Từ chối</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-gray-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Đang tải...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Wallet size={40} className="mb-3 opacity-30" />
            <p className="font-bold text-sm">Chưa có yêu cầu rút tiền nào</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Mã yêu cầu', 'Khách hàng', 'Ngân hàng nhận', 'Số tiền', 'Trạng thái', 'Tạo lúc', 'Xử lý', 'Hành động'].map((heading) => (
                  <th key={heading} className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.requestId} className="hover:bg-gray-50/50 align-top">
                  <td className="px-5 py-4">
                    <p className="font-mono text-xs font-bold text-gray-700">{item.referenceCode}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-gray-800 text-xs">{item.userName ?? '—'}</p>
                    <p className="text-gray-400 text-xs">{item.userEmail ?? ''}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-gray-800 text-xs">{item.bankName}</p>
                    <p className="text-gray-500 text-xs">{item.accountNumber || item.accountNumberMasked}</p>
                    <p className="text-gray-400 text-xs">{item.accountHolderName} · {item.branchName}</p>
                  </td>
                  <td className="px-5 py-4 font-black text-rose-600">{formatCurrency(item.amount)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-black ${STATUS_BADGE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">{formatDate(item.requestedAt)}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    <p>{item.processedByName || '—'}</p>
                    <p className="text-gray-400 mt-1">
                      {formatDate(item.paidAt || item.rejectedAt || item.approvedAt)}
                    </p>
                    {item.adminNote && <p className="text-gray-400 mt-1 max-w-[220px]">{item.adminNote}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      {item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openActionModal(item, 'approved')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-blue-700"
                          >
                            <CheckCircle2 size={14} /> Duyệt
                          </button>
                          <button
                            onClick={() => openActionModal(item, 'rejected')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100"
                          >
                            <XCircle size={14} /> Từ chối
                          </button>
                        </>
                      )}
                      {item.status === 'approved' && (
                        <>
                          <button
                            onClick={() => openActionModal(item, 'paid')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 size={14} /> Đã chuyển
                          </button>
                          <button
                            onClick={() => openActionModal(item, 'rejected')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100"
                          >
                            <XCircle size={14} /> Từ chối
                          </button>
                        </>
                      )}
                      {!['pending', 'approved'].includes(item.status) && (
                        <span className="text-[11px] font-bold text-gray-400">Không có thao tác</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-gray-100 shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">
                {actionModal.status === 'approved' && 'Duyệt yêu cầu rút tiền'}
                {actionModal.status === 'paid' && 'Đánh dấu đã chuyển khoản'}
                {actionModal.status === 'rejected' && 'Từ chối yêu cầu rút tiền'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {actionModal.request.referenceCode} · {formatCurrency(actionModal.request.amount)}
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                <p className="font-bold text-gray-800">{actionModal.request.userName}</p>
                <p>{actionModal.request.bankName} - {actionModal.request.accountNumber || actionModal.request.accountNumberMasked}</p>
                <p>{actionModal.request.accountHolderName} · {actionModal.request.branchName}</p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                  {actionModal.status === 'rejected' ? 'Lý do từ chối' : 'Ghi chú xử lý'}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={4}
                  placeholder={actionModal.status === 'rejected' ? 'Nhập lý do từ chối yêu cầu rút tiền...' : 'Nhập ghi chú nội bộ nếu cần...'}
                  className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 outline-none focus:border-blue-300"
                />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={closeActionModal}
                disabled={processing}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={processing}
                className="px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
