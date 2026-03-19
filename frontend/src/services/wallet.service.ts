import api from './api';

export interface WalletTopupRequest {
  requestId: number;
  userId: number;
  amount: number;
  paymentMethod: 'vnpay';
  status: 'pending' | 'completed' | 'failed';
  referenceCode: string;
  createdAt: string;
  completedAt?: string;
  userName?: string;
  userEmail?: string;
}

export interface WalletTransaction {
  transactionId: number;
  type: 'topup' | 'payment' | 'refund' | 'admin_adjust';
  amount: number;
  balanceAfter: number;
  referenceType?: string;
  note?: string;
  createdAt: string;
}

export const walletService = {
  getBalance: async (): Promise<number> => {
    const res = await api.get('/wallet/balance');
    return res.data.balance;
  },

  getTransactions: async (): Promise<WalletTransaction[]> => {
    const res = await api.get('/wallet/transactions');
    return res.data;
  },

  // Returns { requestId, referenceCode, paymentUrl } - frontend redirects to paymentUrl
  createVNPayTopup: async (amount: number): Promise<{ requestId: number; referenceCode: string; paymentUrl: string }> => {
    const res = await api.post('/wallet/topup/vnpay', { amount });
    return res.data;
  },

  // Admin: log viewer
  adminListTopups: async (days: number = 7): Promise<(WalletTopupRequest)[]> => {
    const res = await api.get(`/wallet/admin/topups?days=${days}`);
    return res.data;
  },
};
