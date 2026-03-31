import pool from '../../infrastructure/database/connection';
import { RowDataPacket } from 'mysql2';
import { OrderUseCase } from '../use-cases/OrderUseCase';
import { OrderStatus } from '../../domain/entities/Order';

// ─── CẤU HÌNH ─────────────────────────────────────────────────────────────────
const CONFIG = {
  // Thời gian tự động hoàn thành sau khi đơn "đã giao" mà khách không xác nhận
  AUTO_COMPLETE_AFTER_DELIVERED_MS: 3 * 24 * 60 * 60 * 1000, // 3 ngày

  COD: {
    pending_to_confirmed_ms: 30 * 60 * 1000,      // 30 phút
    confirmed_to_shipping_ms: 2 * 60 * 60 * 1000, // 2 giờ (bỏ processing, confirmed → shipping)
  },
  ONLINE: {
    paid_to_confirmed_ms: 0,                        // Ngay lập tức
    confirmed_to_shipping_ms: 2 * 60 * 60 * 1000,  // 2 giờ
  },

  CHECK_INTERVAL_MS: 5 * 60 * 1000, // Kiểm tra mỗi 5 phút
};

const SYSTEM = { userId: null as unknown as number, role: 'system' as const };

export class OrderScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private orderUseCase: OrderUseCase) {}

  start() {
    console.log('🤖 [OrderScheduler] Khởi động — kiểm tra mỗi 5 phút');
    void this.runAllJobs();
    this.intervalId = setInterval(() => void this.runAllJobs(), CONFIG.CHECK_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 [OrderScheduler] Đã dừng');
    }
  }

  private async runAllJobs() {
    try {
      await Promise.allSettled([
        this.processQrPaidOrders(),
        this.processCodAutoAdvance(),
        this.processOnlineAutoAdvance(),
        this.autoCompleteDeliveredOrders(), // ✅ Job quan trọng: tự hoàn thành sau 3 ngày
      ]);
    } catch (err) {
      console.error('❌ [OrderScheduler] Lỗi không mong muốn:', err);
    }
  }

  // ─── JOB 1: QR/Online đã thanh toán → tự xác nhận ──────────────────────────
  private async processQrPaidOrders() {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT order_id FROM orders
       WHERE payment_method IN ('vnpay', 'online', 'bank_transfer', 'momo')
         AND payment_status = 'paid'
         AND status = 'pending'
       LIMIT 50`
    );
    if (!rows.length) return;

    console.log(`🔄 [Scheduler/QR] ${rows.length} đơn online đã thanh toán, cần xác nhận`);
    for (const row of rows) {
      try {
        await this.orderUseCase.transitionOrderStatus(
          row.order_id, 'confirmed',
          SYSTEM.userId, SYSTEM.role,
          'Tự động xác nhận sau khi thanh toán online thành công'
        );
        console.log(`  ✅ Đơn #${row.order_id}: pending → confirmed`);
      } catch (err: any) {
        console.warn(`  ⚠️ Đơn #${row.order_id}: ${err.message}`);
      }
    }
  }

  // ─── JOB 2: COD tự động tiến trình ─────────────────────────────────────────
  // pending → confirmed → shipping (bỏ processing)
  private async processCodAutoAdvance() {
    const now = Date.now();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT order_id, status, updated_at FROM orders
       WHERE payment_method IN ('cod', 'deposit')
         AND status IN ('pending', 'confirmed')
       LIMIT 100`
    );
    if (!rows.length) return;

    let processed = 0;
    for (const row of rows) {
      const elapsed = now - new Date(row.updated_at).getTime();
      let nextStatus: OrderStatus | null = null;
      let minMs = 0;

      if (row.status === 'pending') {
        minMs = CONFIG.COD.pending_to_confirmed_ms;
        nextStatus = 'confirmed';
      } else if (row.status === 'confirmed') {
        // ✅ Bỏ processing: confirmed → shipping thẳng
        minMs = CONFIG.COD.confirmed_to_shipping_ms;
        nextStatus = 'shipping';
      }

      if (!nextStatus || elapsed < minMs) continue;

      try {
        await this.orderUseCase.transitionOrderStatus(
          row.order_id, nextStatus,
          SYSTEM.userId, SYSTEM.role,
          `Tự động chuyển trạng thái (COD) sau ${Math.round(elapsed / 3600000 * 10) / 10}h`
        );
        console.log(`  ✅ COD #${row.order_id}: ${row.status} → ${nextStatus}`);
        processed++;
      } catch (err: any) {
        console.warn(`  ⚠️ COD #${row.order_id}: ${err.message}`);
      }
    }
    if (processed > 0) console.log(`🔄 [Scheduler/COD] Đã xử lý ${processed} đơn`);
  }

  // ─── JOB 3: Online confirmed → shipping ─────────────────────────────────────
  private async processOnlineAutoAdvance() {
    const now = Date.now();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT order_id, status, updated_at FROM orders
       WHERE payment_method IN ('vnpay', 'online', 'bank_transfer', 'momo')
         AND payment_status = 'paid'
         AND status = 'confirmed'
       LIMIT 100`
    );
    if (!rows.length) return;

    let processed = 0;
    for (const row of rows) {
      const elapsed = now - new Date(row.updated_at).getTime();
      if (elapsed < CONFIG.ONLINE.confirmed_to_shipping_ms) continue;

      try {
        await this.orderUseCase.transitionOrderStatus(
          row.order_id, 'shipping',
          SYSTEM.userId, SYSTEM.role,
          `Tự động chuyển sang Đang giao (Online) sau ${Math.round(elapsed / 3600000 * 10) / 10}h`
        );
        console.log(`  ✅ Online #${row.order_id}: confirmed → shipping`);
        processed++;
      } catch (err: any) {
        console.warn(`  ⚠️ Online #${row.order_id}: ${err.message}`);
      }
    }
    if (processed > 0) console.log(`🔄 [Scheduler/Online] Đã xử lý ${processed} đơn`);
  }

  // ─── JOB 4: Delivered > 3 ngày → tự động hoàn thành ────────────────────────
  // ✅ Sau 3 ngày kể từ khi chuyển sang "delivered" mà khách không xác nhận
  //    → hệ thống tự chuyển sang "completed"
  private async autoCompleteDeliveredOrders() {
    const now = Date.now();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT order_id, delivered_at, updated_at FROM orders
       WHERE status = 'delivered'
       LIMIT 200`
    );
    if (!rows.length) return;

    let processed = 0;
    for (const row of rows) {
      // Ưu tiên dùng delivered_at, fallback về updated_at
      const baseTime = row.delivered_at ?? row.updated_at;
      if (!baseTime) continue;

      const elapsed = now - new Date(baseTime).getTime();
      if (elapsed < CONFIG.AUTO_COMPLETE_AFTER_DELIVERED_MS) continue;

      try {
        await this.orderUseCase.transitionOrderStatus(
          row.order_id, 'completed',
          SYSTEM.userId, SYSTEM.role,
          'Tự động hoàn thành sau 3 ngày giao hàng mà khách chưa xác nhận'
        );
        console.log(`  ✅ Đơn #${row.order_id}: delivered → completed (auto sau 3 ngày)`);
        processed++;
      } catch (err: any) {
        console.warn(`  ⚠️ Đơn #${row.order_id} không thể auto-complete: ${err.message}`);
      }
    }
    if (processed > 0) console.log(`🔄 [Scheduler/AutoComplete] Đã hoàn thành ${processed} đơn`);
  }
}