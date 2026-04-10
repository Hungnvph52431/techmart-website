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
  type: 'topup' | 'payment' | 'refund' | 'admin_adjust' | 'withdraw_request' | 'withdraw_reversal' | 'withdraw_complete';
  amount: number;
  balanceAfter: number;
  referenceType?: string;
  note?: string;
  createdAt: string;
}

export interface SupportedBank {
  code: string;
  name: string;
}

export interface LinkedBankAccount {
  bankAccountId: number;
  userId: number;
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;
  accountHolderName: string;
  branchName: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletWithdrawalProfile {
  bankAccount: LinkedBankAccount | null;
  hasWithdrawPin: boolean;
}

export type WalletWithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';

export interface WalletWithdrawalRequest {
  requestId: number;
  userId: number;
  bankAccountId: number;
  referenceCode: string;
  amount: number;
  status: WalletWithdrawalStatus;
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;
  accountHolderName: string;
  branchName: string;
  customerNote?: string;
  adminNote?: string;
  requestedAt: string;
  approvedAt?: string;
  paidAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
}

export interface AdminWalletWithdrawalRequest extends WalletWithdrawalRequest {
  userName?: string;
  userEmail?: string;
  accountNumber?: string;
  processedByName?: string;
  processedByEmail?: string;
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

  getSupportedBanks: async (): Promise<SupportedBank[]> => {
    const res = await api.get('/wallet/banks');
    return res.data;
  },

  getWithdrawalProfile: async (): Promise<WalletWithdrawalProfile> => {
    const res = await api.get('/wallet/withdrawal-profile');
    return res.data;
  },

  setupWithdrawalProfile: async (payload: {
    bankCode: string;
    accountNumber: string;
    accountHolderName: string;
    branchName: string;
    pin: string;
    confirmPin: string;
  }): Promise<WalletWithdrawalProfile> => {
    const res = await api.post('/wallet/withdrawal-profile/setup', payload);
    return res.data;
  },

  getWithdrawals: async (): Promise<WalletWithdrawalRequest[]> => {
    const res = await api.get('/wallet/withdrawals');
    return res.data;
  },

  createWithdrawal: async (payload: {
    amount: number;
    pin: string;
    customerNote?: string;
  }): Promise<WalletWithdrawalRequest> => {
    const res = await api.post('/wallet/withdrawals', payload);
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

  adminListWithdrawals: async (params?: { status?: string; days?: number }): Promise<AdminWalletWithdrawalRequest[]> => {
    const res = await api.get('/wallet/admin/withdrawals', { params });
    return res.data;
  },

  adminUpdateWithdrawalStatus: async (
    requestId: number | string,
    payload: { status: 'approved' | 'paid' | 'rejected'; adminNote?: string }
  ): Promise<AdminWalletWithdrawalRequest> => {
    const res = await api.patch(`/wallet/admin/withdrawals/${requestId}/status`, payload);
    return res.data;
  },
};
