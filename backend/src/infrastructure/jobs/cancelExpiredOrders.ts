import pool from "../database/connection";
import { RowDataPacket } from "mysql2";

const EXPIRE_MINUTES = 10;

export async function cancelExpiredOrders(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log(
      `[CancelExpiredOrders] 🚀 Bắt đầu quét đơn hết hạn (expire: ${EXPIRE_MINUTES} phút)`,
    );

    // 1. Tìm đơn hàng hết hạn thanh toán
    const [expiredOrders] = await conn.query<RowDataPacket[]>(
      `SELECT order_id, order_code, status, order_date, payment_method, payment_status
       FROM orders
       WHERE payment_method IN ('vnpay', 'bank_transfer')
         AND payment_status = 'pending'
         AND status IN ('pending', 'confirmed')
         AND order_date < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [EXPIRE_MINUTES],
    );

    if (expiredOrders.length === 0) {
      console.log(`[CancelExpiredOrders] ✅ Không có đơn nào cần hủy`);
      await conn.rollback();
      return;
    }

    for (const order of expiredOrders) {
      const orderId: number = order.order_id;
      const orderCode: string = order.order_code;

      const innerConn = await pool.getConnection();
      try {
        await innerConn.beginTransaction();

        const [rawItems] = await innerConn.query<RowDataPacket[]>(
          `SELECT order_detail_id, product_id, variant_id, quantity, product_name, variant_name
           FROM order_details
           WHERE order_id = ?
           ORDER BY product_id, variant_id`,
          [orderId],
        );

        // 2. Cập nhật status đơn hàng → cancelled
        const [result] = await innerConn.query<any>(
          `UPDATE orders
           SET status         = 'cancelled',
               payment_status = 'failed',
               cancel_reason  = ?,
               cancelled_at   = NOW(),
               updated_at     = NOW()
           WHERE order_id = ?
             AND status IN ('pending', 'confirmed')
             AND payment_status = 'pending'`,
          [
            `Hủy tự động do không thanh toán sau ${EXPIRE_MINUTES} phút`,
            orderId,
          ],
        );

        if (result.affectedRows === 0) {
          await innerConn.rollback();
          innerConn.release();
          continue;
        }

        // 3. Ghi event hủy đơn vào timeline
        await innerConn.query(
          `INSERT INTO order_events
             (order_id, event_type, from_status, to_status, actor_role, note, created_at)
           VALUES (?, 'order_cancelled', ?, 'cancelled', 'system', ?, NOW())`,
          [
            orderId,
            order.status,
            `Tự động hủy: không thanh toán sau ${EXPIRE_MINUTES} phút`,
          ],
        );

        // 4. Ghi event thay đổi payment_status
        await innerConn.query(
          `INSERT INTO order_events
             (order_id, event_type, from_status, to_status, actor_role, note, created_at)
           VALUES (?, 'payment_status_changed', 'pending', 'failed', 'system', ?, NOW())`,
          [orderId, `Thanh toán hết hạn sau ${EXPIRE_MINUTES} phút`],
        );

        await innerConn.commit();
      } catch (err: any) {
        await innerConn.rollback();
        console.error(
          `[CancelExpiredOrders] ❌ LỖI khi xử lý đơn ${orderCode} (ID: ${orderId}):`,
          err.message,
        );
        if (err.stack) console.error(err.stack);
      } finally {
        innerConn.release();
      }
    }

    await conn.commit();
  } catch (err: any) {
    await conn.rollback();
    console.error(
      `[CancelExpiredOrders] ❌ LỖI NGHIÊM TRỌNG khi quét danh sách đơn:`,
      err.message,
    );
    if (err.stack) console.error(err.stack);
  } finally {
    conn.release();
  }
}
