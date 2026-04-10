import pool from '../../infrastructure/database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { createPaymentUrl } from '../services/VNPayService';
import {
  sendWalletTopupEmail,
  sendWalletWithdrawalRequestedEmail,
  sendWalletWithdrawalStatusEmail,
} from '../services/EmailService';

export interface WalletTopupRequest {
  requestId: number;
  userId: number;
  amount: number;
  paymentMethod: 'vnpay';
  status: 'pending' | 'completed' | 'failed';
  referenceCode: string;
  vnpayTxnNo?: string;
  createdAt: Date;
  completedAt?: Date;
  userName?: string;
  userEmail?: string;
}

export interface WalletTransaction {
  transactionId: number;
  userId: number;
  type: 'topup' | 'payment' | 'refund' | 'admin_adjust' | 'withdraw_request' | 'withdraw_reversal' | 'withdraw_complete';
  amount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: number;
  note?: string;
  createdAt: Date;
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
  accountNumber: string;
  accountNumberMasked: string;
  accountHolderName: string;
  branchName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletWithdrawalProfile {
  bankAccount: Omit<LinkedBankAccount, 'accountNumber'> | null;
  hasWithdrawPin: boolean;
}

export interface WalletWithdrawalRequest {
  requestId: number;
  userId: number;
  bankAccountId: number;
  referenceCode: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  bankCode: string;
  bankName: string;
  accountNumber?: string;
  accountNumberMasked: string;
  accountHolderName: string;
  branchName: string;
  customerNote?: string;
  adminNote?: string;
  requestedAt: Date;
  approvedAt?: Date;
  paidAt?: Date;
  rejectedAt?: Date;
  cancelledAt?: Date;
  userName?: string;
  userEmail?: string;
  processedByName?: string;
  processedByEmail?: string;
}

interface WithdrawalSetupInput {
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
  branchName: string;
  pin: string;
  confirmPin: string;
}

interface CreateWithdrawalInput {
  amount: number;
  pin: string;
  customerNote?: string;
}

interface UpdateWithdrawalStatusInput {
  status: 'approved' | 'paid' | 'rejected';
  adminNote?: string;
}

const SUPPORTED_BANKS: SupportedBank[] = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'CTG', name: 'VietinBank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MBB', name: 'MB Bank' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'SHB', name: 'SHB' },
  { code: 'OCB', name: 'OCB' },
];

function generateReferenceCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WLT-${ts}-${rand}`;
}

function mapTopup(row: any): WalletTopupRequest {
  return {
    requestId: row.request_id,
    userId: row.user_id,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    status: row.status,
    referenceCode: row.reference_code,
    vnpayTxnNo: row.vnpay_txn_ref ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    userName: row.user_name ?? undefined,
    userEmail: row.user_email ?? undefined,
  };
}

function mapTransaction(row: any): WalletTransaction {
  return {
    transactionId: row.transaction_id,
    userId: row.user_id,
    type: row.type,
    amount: Number(row.amount),
    balanceAfter: Number(row.balance_after),
    referenceType: row.reference_type ?? undefined,
    referenceId: row.reference_id ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

function maskAccountNumber(accountNumber?: string | null): string {
  if (!accountNumber) return '';
  const normalized = String(accountNumber);
  if (normalized.length <= 4) return normalized;
  return `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}

function mapBankAccount(row: any): LinkedBankAccount {
  return {
    bankAccountId: row.bank_account_id,
    userId: row.user_id,
    bankCode: row.bank_code,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountNumberMasked: maskAccountNumber(row.account_number),
    accountHolderName: row.account_holder_name,
    branchName: row.branch_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWithdrawal(row: any): WalletWithdrawalRequest {
  return {
    requestId: row.withdrawal_request_id,
    userId: row.user_id,
    bankAccountId: row.bank_account_id,
    referenceCode: row.reference_code,
    amount: Number(row.amount),
    status: row.status,
    bankCode: row.bank_code,
    bankName: row.bank_name,
    accountNumber: row.account_number ?? undefined,
    accountNumberMasked: maskAccountNumber(row.account_number),
    accountHolderName: row.account_holder_name,
    branchName: row.branch_name,
    customerNote: row.customer_note ?? undefined,
    adminNote: row.admin_note ?? undefined,
    requestedAt: row.requested_at,
    approvedAt: row.approved_at ?? undefined,
    paidAt: row.paid_at ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    userName: row.user_name ?? undefined,
    userEmail: row.user_email ?? undefined,
    processedByName: row.processed_by_name ?? undefined,
    processedByEmail: row.processed_by_email ?? undefined,
  };
}

export class WalletUseCase {
  private generateWithdrawalReferenceCode(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `WDR-${ts}-${rand}`;
  }

  private getSupportedBankByCode(bankCode: string): SupportedBank | undefined {
    return SUPPORTED_BANKS.find((item) => item.code === bankCode);
  }

  private normalizeAccountNumber(accountNumber: string): string {
    return accountNumber.replace(/\s+/g, '');
  }

  private async getUserMeta(userId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT name, email, wallet_balance FROM users WHERE user_id = ?',
      [userId]
    );

    return (rows as RowDataPacket[])[0] ?? null;
  }

  private async getLinkedBankAccount(
    executor: PoolConnection | typeof pool,
    userId: number
  ): Promise<LinkedBankAccount | null> {
    const [rows] = await executor.execute<RowDataPacket[]>(
      'SELECT * FROM user_bank_accounts WHERE user_id = ? LIMIT 1',
      [userId]
    );

    return rows.length > 0 ? mapBankAccount(rows[0]) : null;
  }

  private async createNotificationWithConnection(
    connection: PoolConnection,
    input: {
      userId: number;
      title: string;
      message: string;
      referenceId?: number;
    }
  ) {
    await connection.execute(
      `INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
       VALUES (?, ?, ?, 'system', ?, ?)`,
      [input.userId, input.title, input.message, input.referenceId ?? null, new Date()]
    );
  }

  private validateSetupInput(input: WithdrawalSetupInput) {
    const bank = this.getSupportedBankByCode(input.bankCode);
    if (!bank) throw new Error('Ngân hàng không hợp lệ');

    const accountNumber = this.normalizeAccountNumber(input.accountNumber);
    if (!/^\d{6,20}$/.test(accountNumber)) {
      throw new Error('Số tài khoản phải từ 6 đến 20 chữ số');
    }

    if (!input.accountHolderName.trim()) {
      throw new Error('Vui lòng nhập tên chủ tài khoản');
    }

    if (!input.branchName.trim()) {
      throw new Error('Vui lòng nhập chi nhánh ngân hàng');
    }

    if (!/^\d{6}$/.test(input.pin)) {
      throw new Error('Mật khẩu rút tiền phải gồm đúng 6 chữ số');
    }

    if (input.pin !== input.confirmPin) {
      throw new Error('Mật khẩu rút tiền và xác nhận mật khẩu không trùng nhau');
    }
  }

  getSupportedBanks(): SupportedBank[] {
    return SUPPORTED_BANKS;
  }

  async getBalance(userId: number): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT wallet_balance FROM users WHERE user_id = ?',
      [userId]
    );
    return Number((rows as RowDataPacket[])[0]?.wallet_balance ?? 0);
  }

  async getTransactions(userId: number): Promise<WalletTransaction[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    return (rows as RowDataPacket[]).map(mapTransaction);
  }

  async getWithdrawalProfile(userId: number): Promise<WalletWithdrawalProfile> {
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT withdraw_pin_hash FROM users WHERE user_id = ?',
      [userId]
    );

    if (!userRows.length) {
      throw new Error('Không tìm thấy người dùng');
    }

    const bankAccount = await this.getLinkedBankAccount(pool, userId);

    return {
      bankAccount: bankAccount
        ? {
            bankAccountId: bankAccount.bankAccountId,
            userId: bankAccount.userId,
            bankCode: bankAccount.bankCode,
            bankName: bankAccount.bankName,
            accountNumberMasked: bankAccount.accountNumberMasked,
            accountHolderName: bankAccount.accountHolderName,
            branchName: bankAccount.branchName,
            createdAt: bankAccount.createdAt,
            updatedAt: bankAccount.updatedAt,
          }
        : null,
      hasWithdrawPin: Boolean(userRows[0].withdraw_pin_hash),
    };
  }

  async setupWithdrawalProfile(userId: number, input: WithdrawalSetupInput): Promise<WalletWithdrawalProfile> {
    this.validateSetupInput(input);

    const bank = this.getSupportedBankByCode(input.bankCode);
    if (!bank) {
      throw new Error('Ngân hàng không hợp lệ');
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [userRows] = await connection.execute<RowDataPacket[]>(
        'SELECT user_id, withdraw_pin_hash FROM users WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (!userRows.length) {
        throw new Error('Không tìm thấy người dùng');
      }

      const [bankRows] = await connection.execute<RowDataPacket[]>(
        'SELECT bank_account_id FROM user_bank_accounts WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (bankRows.length > 0 || userRows[0].withdraw_pin_hash) {
        throw new Error('Bạn đã thiết lập thông tin rút tiền trước đó');
      }

      const now = new Date();
      const hashedPin = await bcrypt.hash(input.pin, 10);
      const accountNumber = this.normalizeAccountNumber(input.accountNumber);

      await connection.execute(
        `INSERT INTO user_bank_accounts (
          user_id, bank_code, bank_name, account_number, account_holder_name, branch_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          bank.code,
          bank.name,
          accountNumber,
          input.accountHolderName.trim(),
          input.branchName.trim(),
          now,
          now,
        ]
      );

      await connection.execute(
        'UPDATE users SET withdraw_pin_hash = ?, withdraw_pin_set_at = ?, updated_at = ? WHERE user_id = ?',
        [hashedPin, now, now, userId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return this.getWithdrawalProfile(userId);
  }

  async getWithdrawals(userId: number): Promise<WalletWithdrawalRequest[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM wallet_withdrawal_requests
       WHERE user_id = ?
       ORDER BY requested_at DESC, withdrawal_request_id DESC`,
      [userId]
    );

    return rows.map(mapWithdrawal);
  }

  async createWithdrawal(userId: number, input: CreateWithdrawalInput): Promise<WalletWithdrawalRequest> {
    if (!/^\d{6}$/.test(input.pin)) {
      throw new Error('Mật khẩu rút tiền phải gồm đúng 6 chữ số');
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('Số tiền rút không hợp lệ');
    }

    const amount = Math.round(input.amount);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [userRows] = await connection.execute<RowDataPacket[]>(
        'SELECT user_id, name, email, wallet_balance, withdraw_pin_hash FROM users WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (!userRows.length) {
        throw new Error('Không tìm thấy người dùng');
      }

      const user = userRows[0];
      if (!user.withdraw_pin_hash) {
        throw new Error('Bạn cần thiết lập thông tin rút tiền trước');
      }

      const isPinValid = await bcrypt.compare(input.pin, user.withdraw_pin_hash);
      if (!isPinValid) {
        throw new Error('Mật khẩu rút tiền không chính xác');
      }

      const [bankRows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM user_bank_accounts WHERE user_id = ? LIMIT 1 FOR UPDATE',
        [userId]
      );

      if (!bankRows.length) {
        throw new Error('Bạn chưa liên kết tài khoản ngân hàng');
      }

      const bankAccount = mapBankAccount(bankRows[0]);
      const currentBalance = Number(user.wallet_balance ?? 0);

      if (currentBalance < amount) {
        throw new Error('Số dư ví không đủ để rút tiền');
      }

      const now = new Date();
      const referenceCode = this.generateWithdrawalReferenceCode();

      await connection.execute(
        'UPDATE users SET wallet_balance = wallet_balance - ?, updated_at = ? WHERE user_id = ?',
        [amount, now, userId]
      );

      const [balanceRows] = await connection.execute<RowDataPacket[]>(
        'SELECT wallet_balance FROM users WHERE user_id = ?',
        [userId]
      );
      const balanceAfter = Number(balanceRows[0]?.wallet_balance ?? 0);

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO wallet_withdrawal_requests (
          user_id, bank_account_id, reference_code, amount, status,
          bank_code, bank_name, account_number, account_holder_name, branch_name,
          customer_note, requested_at
        ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          bankAccount.bankAccountId,
          referenceCode,
          amount,
          bankAccount.bankCode,
          bankAccount.bankName,
          bankAccount.accountNumber,
          bankAccount.accountHolderName,
          bankAccount.branchName,
          input.customerNote?.trim() || null,
          now,
        ]
      );

      await connection.execute(
        `INSERT INTO wallet_transactions (
          user_id, type, amount, balance_after, reference_type, reference_id, note, created_at
        ) VALUES (?, 'withdraw_request', ?, ?, 'wallet_withdrawal_request', ?, ?, ?)`,
        [userId, amount, balanceAfter, result.insertId, `Yêu cầu rút tiền ${referenceCode}`, now]
      );

      await this.createNotificationWithConnection(connection, {
        userId,
        title: 'Đã tạo yêu cầu rút tiền',
        message: `Yêu cầu rút ${amount.toLocaleString('vi-VN')}đ về ${bankAccount.bankName} đang chờ xử lý.`,
        referenceId: result.insertId,
      });

      await connection.commit();

      sendWalletWithdrawalRequestedEmail({
        customerName: user.name || 'Khách hàng',
        customerEmail: user.email,
        referenceCode,
        amount,
        bankName: bankAccount.bankName,
        accountNumberMasked: bankAccount.accountNumberMasked,
        currentBalance: balanceAfter,
      }).catch((error) => console.error('[WalletUseCase] Lỗi gửi email tạo yêu cầu rút tiền:', error));

      const [requestRows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM wallet_withdrawal_requests WHERE withdrawal_request_id = ?',
        [result.insertId]
      );

      return mapWithdrawal(requestRows[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async adminListWithdrawals(status: string = 'all', days: number = 30): Promise<WalletWithdrawalRequest[]> {
    const params: any[] = [];
    const conditions: string[] = [];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    conditions.push('r.requested_at >= ?');
    params.push(since);

    if (status !== 'all') {
      conditions.push('r.status = ?');
      params.push(status);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        r.*,
        u.name AS user_name,
        u.email AS user_email,
        actor.name AS processed_by_name,
        actor.email AS processed_by_email
       FROM wallet_withdrawal_requests r
       JOIN users u ON u.user_id = r.user_id
       LEFT JOIN users actor ON actor.user_id = r.processed_by
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY r.requested_at DESC, r.withdrawal_request_id DESC`,
      params
    );

    return rows.map(mapWithdrawal);
  }

  async adminUpdateWithdrawalStatus(
    requestId: number,
    actorId: number,
    input: UpdateWithdrawalStatusInput
  ): Promise<WalletWithdrawalRequest> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [requestRows] = await connection.execute<RowDataPacket[]>(
        `SELECT r.*, u.name AS user_name, u.email AS user_email
         FROM wallet_withdrawal_requests r
         JOIN users u ON u.user_id = r.user_id
         WHERE r.withdrawal_request_id = ?
         FOR UPDATE`,
        [requestId]
      );

      if (!requestRows.length) {
        throw new Error('Không tìm thấy yêu cầu rút tiền');
      }

      const request = mapWithdrawal(requestRows[0]);
      const now = new Date();

      if (input.status === 'approved') {
        if (request.status !== 'pending') {
          throw new Error('Chỉ có thể duyệt yêu cầu đang chờ xử lý');
        }

        await connection.execute(
          `UPDATE wallet_withdrawal_requests
           SET status = 'approved', approved_at = ?, admin_note = ?, processed_by = ?
           WHERE withdrawal_request_id = ?`,
          [now, input.adminNote?.trim() || null, actorId, requestId]
        );

        await this.createNotificationWithConnection(connection, {
          userId: request.userId,
          title: 'Yêu cầu rút tiền đã được duyệt',
          message: `Yêu cầu rút tiền ${request.referenceCode} đã được duyệt và đang chờ chuyển khoản.`,
          referenceId: requestId,
        });
      } else if (input.status === 'paid') {
        if (request.status !== 'approved') {
          throw new Error('Chỉ có thể đánh dấu đã chuyển khoản sau khi yêu cầu đã được duyệt');
        }

        await connection.execute(
          `UPDATE wallet_withdrawal_requests
           SET status = 'paid', paid_at = ?, admin_note = ?, processed_by = ?
           WHERE withdrawal_request_id = ?`,
          [now, input.adminNote?.trim() || null, actorId, requestId]
        );

        await this.createNotificationWithConnection(connection, {
          userId: request.userId,
          title: 'Rút tiền đã hoàn tất',
          message: `TechMart đã chuyển khoản thành công cho yêu cầu ${request.referenceCode}.`,
          referenceId: requestId,
        });
      } else if (input.status === 'rejected') {
        if (!input.adminNote?.trim()) {
          throw new Error('Vui lòng nhập lý do từ chối yêu cầu rút tiền');
        }

        if (!['pending', 'approved'].includes(request.status)) {
          throw new Error('Chỉ có thể từ chối yêu cầu đang chờ xử lý hoặc đã duyệt');
        }

        await connection.execute(
          'UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = ? WHERE user_id = ?',
          [request.amount, now, request.userId]
        );

        const [balanceRows] = await connection.execute<RowDataPacket[]>(
          'SELECT wallet_balance FROM users WHERE user_id = ?',
          [request.userId]
        );
        const balanceAfter = Number(balanceRows[0]?.wallet_balance ?? 0);

        await connection.execute(
          `INSERT INTO wallet_transactions (
            user_id, type, amount, balance_after, reference_type, reference_id, note, created_at
          ) VALUES (?, 'withdraw_reversal', ?, ?, 'wallet_withdrawal_request', ?, ?, ?)`,
          [
            request.userId,
            request.amount,
            balanceAfter,
            requestId,
            `Hoàn lại tiền do từ chối yêu cầu rút ${request.referenceCode}`,
            now,
          ]
        );

        await connection.execute(
          `UPDATE wallet_withdrawal_requests
           SET status = 'rejected', rejected_at = ?, admin_note = ?, processed_by = ?
           WHERE withdrawal_request_id = ?`,
          [now, input.adminNote.trim(), actorId, requestId]
        );

        await this.createNotificationWithConnection(connection, {
          userId: request.userId,
          title: 'Yêu cầu rút tiền bị từ chối',
          message: `Yêu cầu ${request.referenceCode} đã bị từ chối. Số dư ví đã được hoàn lại.`,
          referenceId: requestId,
        });
      } else {
        throw new Error('Trạng thái xử lý không hợp lệ');
      }

      await connection.commit();

      const userMeta = await this.getUserMeta(request.userId);
      if (userMeta?.email && ['approved', 'paid', 'rejected'].includes(input.status)) {
        sendWalletWithdrawalStatusEmail({
          customerName: userMeta.name || 'Khách hàng',
          customerEmail: userMeta.email,
          referenceCode: request.referenceCode,
          amount: request.amount,
          bankName: request.bankName,
          accountNumberMasked: request.accountNumberMasked,
          status: input.status,
          adminNote: input.adminNote?.trim() || undefined,
          currentBalance: Number(userMeta.wallet_balance ?? 0),
        }).catch((error) => console.error('[WalletUseCase] Lỗi gửi email trạng thái rút tiền:', error));
      }

      const [finalRows] = await pool.execute<RowDataPacket[]>(
        `SELECT
          r.*,
          u.name AS user_name,
          u.email AS user_email,
          actor.name AS processed_by_name,
          actor.email AS processed_by_email
         FROM wallet_withdrawal_requests r
         JOIN users u ON u.user_id = r.user_id
         LEFT JOIN users actor ON actor.user_id = r.processed_by
         WHERE r.withdrawal_request_id = ?`,
        [requestId]
      );

      return mapWithdrawal(finalRows[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Tạo topup request + trả về VNPay payment URL
  async createVNPayTopupUrl(userId: number, amount: number, ipAddr: string): Promise<{ requestId: number; referenceCode: string; paymentUrl: string }> {
    if (amount < 10000) throw new Error('Số tiền nạp tối thiểu là 10.000đ');
    if (amount > 50000000) throw new Error('Số tiền nạp tối đa là 50.000.000đ');

    const referenceCode = generateReferenceCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 phút

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO wallet_topup_requests (user_id, amount, payment_method, status, reference_code, created_at, expires_at)
       VALUES (?, ?, 'vnpay', 'pending', ?, ?, ?)`,
      [userId, amount, referenceCode, now, expiresAt]
    );

    const paymentUrl = createPaymentUrl({
      orderId: result.insertId,
      orderCode: referenceCode,
      amount,
      ipAddr,
    });

    return { requestId: result.insertId, referenceCode, paymentUrl };
  }

  // VNPay callback auto-credit wallet
  async completeVNPayTopup(referenceCode: string, txnNo: string): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rawRows] = await connection.execute(
        "SELECT * FROM wallet_topup_requests WHERE reference_code = ? AND status = 'pending'",
        [referenceCode]
      );
      const rows = rawRows as RowDataPacket[];
      if (rows.length === 0) { await connection.rollback(); return; }

      const req = mapTopup(rows[0]);
      await this._creditWallet(connection, req.userId, req.amount, 'topup', 'topup_request', req.requestId, `Nạp ví VNPay - ${req.referenceCode}`);
      await connection.execute(
        "UPDATE wallet_topup_requests SET status = 'completed', vnpay_txn_ref = ?, completed_at = ? WHERE request_id = ?",
        [txnNo, new Date(), req.requestId]
      );

      await connection.commit();

      // Gửi email thông báo nạp ví thành công (fire-and-forget)
      try {
        const [userRows] = await pool.execute<RowDataPacket[]>(
          'SELECT name, email, wallet_balance FROM users WHERE user_id = ?',
          [req.userId]
        );
        const u = (userRows as RowDataPacket[])[0];
        if (u?.email) {
          sendWalletTopupEmail({
            customerName: u.name || 'Khách hàng',
            customerEmail: u.email,
            referenceCode: req.referenceCode,
            amount: req.amount,
            newBalance: Number(u.wallet_balance),
          }).catch((err) => console.error('[WalletUseCase] Lỗi gửi email nạp ví:', err));
        }
      } catch (emailErr) {
        console.error('[WalletUseCase] Lỗi query user cho email:', emailErr);
      }
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }

  // Mark as failed (VNPay cancelled/failed)
  async failVNPayTopup(referenceCode: string): Promise<void> {
    await pool.execute(
      "UPDATE wallet_topup_requests SET status = 'failed' WHERE reference_code = ? AND status = 'pending'",
      [referenceCode]
    );
  }

  // Admin: chỉ xem log completed trong 7 ngày gần nhất
  async adminListTopups(days: number = 7): Promise<WalletTopupRequest[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT r.*, u.name AS user_name, u.email AS user_email
       FROM wallet_topup_requests r
       JOIN users u ON u.user_id = r.user_id
       WHERE r.status = 'completed' AND r.completed_at >= ?
       ORDER BY r.completed_at DESC`,
      [since]
    );
    return (rows as RowDataPacket[]).map(mapTopup);
  }

  // Internal helper
  async _creditWallet(connection: any, userId: number, amount: number, type: 'topup' | 'refund', refType: string, refId: number, note: string) {
    await connection.execute(
      'UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
      [amount, userId]
    );
    const [rawUser] = await connection.execute(
      'SELECT wallet_balance FROM users WHERE user_id = ?',
      [userId]
    );
    const userRow = (rawUser as RowDataPacket[])[0];
    await connection.execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, amount, Number(userRow.wallet_balance), refType, refId, note, new Date()]
    );
  }
}
