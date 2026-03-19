import pool from '../../infrastructure/database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { createPaymentUrl } from '../services/VNPayService';
import { sendWalletTopupEmail } from '../services/EmailService';

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
  type: 'topup' | 'payment' | 'refund' | 'admin_adjust';
  amount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: number;
  note?: string;
  createdAt: Date;
}

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

export class WalletUseCase {

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
