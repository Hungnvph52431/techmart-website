import pool from '../../infrastructure/database/connection';
import { RowDataPacket } from 'mysql2';
import { OrderUseCase } from '../use-cases/OrderUseCase';
import { OrderStatus } from '../../domain/entities/Order';

// ─── CẤU HÌNH THỜI GIAN TỰ ĐỘNG (tính bằng milliseconds) ───────────────────
const AUTO_PROCESS_CONFIG = {
  // COD: thời gian tối thiểu ở mỗi trạng thái trước khi tự chuyển
  COD: {
    pending_to_confirmed: 30 * 60 * 1000,       // 30 phút
    confirmed_to_processing: 2 * 60 * 60 * 1000, // 2 giờ
    processing_to_shipping: 4 * 60 * 60 * 1000,  // 4 giờ
    // shipping → delivered: KHÔNG tự động (cần shipper xác nhận)
  },
  // QR/Online: sau khi paid → tự xác nhận ngay, rồi theo lịch như COD
  ONLINE: {
    paid_to_confirmed: 0,                         // Ngay lập tức
    confirmed_to_processing: 2 * 60 * 60 * 1000, // 2 giờ
    processing_to_shipping: 4 * 60 * 60 * 1000,  // 4 giờ
  },
  // Interval chạy scheduler (mỗi 5 phút)
  CHECK_INTERVAL: 5 * 60 * 1000,
};

const SYSTEM_ACTOR = { userId: 0, role: 'system' as const };

export class OrderScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private orderUseCase: OrderUseCase) {}

  // ─── KHỞI ĐỘNG ──────────────────────────────────────────────────────────────
  start() {
    console.log('🤖 [OrderScheduler] Khởi động — kiểm tra mỗi 5 phút');
    // Chạy ngay lập tức lần đầu
    void this.runAllJobs();
    // Sau đó chạy định kỳ
    this.intervalId = setInterval(() => {
      void this.runAllJobs();
    }, AUTO_PROCESS_CONFIG.CHECK_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 [OrderScheduler] Đã dừng');
    }
  }

  // ─── CHẠY TẤT CẢ JOBS ───────────────────────────────────────────────────────
  private async runAllJobs() {
    try {
      await Promise.allSettled([
        this.processQrPaidOrders(),
        this.processCodAutoAdvance(),
        this.processOnlineAutoAdvance(),
      ]);
    } catch (err) {
      console.error('❌ [OrderScheduler] Lỗi không mong muốn:', err);
    }
  }

  // ─── JOB 1: QR/Online đã thanh toán → tự xác nhận ──────────────────────────
  // Điều kiện: payment_method = 'online' AND payment_status = 'paid' AND status = 'pending'
  private async processQrPaidOrders() {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT order_id, status, payment_method, payment_status, updated_at
       FROM orders
       WHERE payment_method = 'online'
         AND payment_status = 'paid'
         AND status = 'pending'
       LIMIT 50`
    );

    if (rows.length === 0) return;
    console.log(`🔄 [Scheduler/QR] Tìm thấy ${rows.length} đơn online đã thanh toán, cần xác nhận`);

    for (const row of rows) {
      try {
        await this.orderUseCase.transitionOrderStatus(
          row.order_id,
          'confirmed',
          SYSTEM_ACTOR.userId,
          SYSTEM_ACTOR.role,
          'Tự động xác nhận sau khi thanh toán QR/Online thành công'
        );
        console.log(`  ✅ Đơn #${row.order_id}: pending → confirmed (QR paid)`);
      } catch (err: any) {
        console.warn(`  ⚠️ Đơn #${row.order_id} không thể xác nhận: ${err.message}`);
      }
    }
  }

  // ─── JOB 2: COD tự động tiến trình ─────────────────────────────────────────
  private async processCodAutoAdvance() {
    const cfg = AUTO_PROCESS_CONFIG.COD;
    const now = Date.now();

    // Query tất cả đơn COD đang trong trạng thái cần xử lý
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT order_id, status, updated_at
       FROM orders
       WHERE payment_method = 'cod'
         AND status IN ('pending', 'confirmed', 'processing')
       LIMIT 100`
    );

    if (rows.length === 0) return;

    let processed = 0;
    for (const row of rows) {
      const updatedAt = new Date(row.updated_at).getTime();
      const elapsed = now - updatedAt;
      let nextStatus: string | null = null;
      let minElapsed = 0;

      if (row.status === 'pending') {
        minElapsed = cfg.pending_to_confirmed;
        nextStatus = 'confirmed';
      } else if (row.status === 'confirmed') {
        minElapsed = cfg.confirmed_to_processing;
        nextStatus = 'processing';
      } else if (row.status === 'processing') {
        minElapsed = cfg.processing_to_shipping;
        nextStatus = 'shipping';
      }

      if (!nextStatus || elapsed < minElapsed) continue;

      try {
        await this.orderUseCase.transitionOrderStatus(
          row.order_id,
          nextStatus as OrderStatus,
          SYSTEM_ACTOR.userId,
          SYSTEM_ACTOR.role,
          `Tự động chuyển trạng thái (COD) sau ${Math.round(elapsed / 3600000 * 10) / 10}h`
        );
        console.log(`  ✅ Đơn COD #${row.order_id}: ${row.status} → ${nextStatus}`);
        processed++;
      } catch (err: any) {
        console.warn(`  ⚠️ Đơn COD #${row.order_id} lỗi: ${err.message}`);
      }
    }

    if (processed > 0) {
      console.log(`🔄 [Scheduler/COD] Đã xử lý ${processed} đơn`);
    }
  }

  // ─── JOB 3: Online/QR đã confirmed → tiếp tục tiến trình ───────────────────
  private async processOnlineAutoAdvance() {
    const cfg = AUTO_PROCESS_CONFIG.ONLINE;
    const now = Date.now();

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT order_id, status, updated_at
       FROM orders
       WHERE payment_method = 'online'
         AND payment_status = 'paid'
         AND status IN ('confirmed', 'processing')
       LIMIT 100`
    );

    if (rows.length === 0) return;

    let processed = 0;
    for (const row of rows) {
      const updatedAt = new Date(row.updated_at).getTime();
      const elapsed = now - updatedAt;
      let nextStatus: string | null = null;
      let minElapsed = 0;

      if (row.status === 'confirmed') {
        minElapsed = cfg.confirmed_to_processing;
        nextStatus = 'processing';
      } else if (row.status === 'processing') {
        minElapsed = cfg.processing_to_shipping;
        nextStatus = 'shipping';
      }

      if (!nextStatus || elapsed < minElapsed) continue;

      try {
        await this.orderUseCase.transitionOrderStatus(
          row.order_id,
          nextStatus as OrderStatus,
          SYSTEM_ACTOR.userId,
          SYSTEM_ACTOR.role,
          `Tự động chuyển trạng thái (Online) sau ${Math.round(elapsed / 3600000 * 10) / 10}h`
        );
        console.log(`  ✅ Đơn Online #${row.order_id}: ${row.status} → ${nextStatus}`);
        processed++;
      } catch (err: any) {
        console.warn(`  ⚠️ Đơn Online #${row.order_id} lỗi: ${err.message}`);
      }
    }

    if (processed > 0) {
      console.log(`🔄 [Scheduler/Online] Đã xử lý ${processed} đơn`);
    }
  }
}