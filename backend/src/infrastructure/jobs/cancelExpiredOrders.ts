import pool from "../database/connection";
import { RowDataPacket } from "mysql2";

const EXPIRE_MINUTES = 1;

export async function cancelExpiredOrders(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Tìm đơn hàng hết hạn thanh toán
    const [expiredOrders] = await conn.query<RowDataPacket[]>(
      `SELECT order_id, order_code, status
       FROM orders
       WHERE payment_method IN ('vnpay', 'bank_transfer')
         AND payment_status = 'pending'
         AND status IN ('pending', 'confirmed')
         AND order_date < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [EXPIRE_MINUTES],
    );

    if (expiredOrders.length === 0) {
      await conn.rollback();
      return;
    }

    console.log(
      `[CancelExpiredOrders] Tìm thấy ${expiredOrders.length} đơn hết hạn`,
    );

    for (const order of expiredOrders) {
      const orderId: number = order.order_id;

      // Mỗi đơn dùng transaction riêng — lỗi 1 đơn không ảnh hưởng đơn khác
      const innerConn = await pool.getConnection();
      try {
        await innerConn.beginTransaction();

        // 2. Lấy danh sách sản phẩm trong đơn
        const [items] = await innerConn.query<RowDataPacket[]>(
          `SELECT product_id, variant_id, quantity FROM order_details WHERE order_id = ?`,
          [orderId],
        );

        // 3. Cập nhật status → cancelled, payment_status → failed
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

        // Nếu không update được (đơn đã bị xử lý bởi luồng khác) → bỏ qua
        if (result.affectedRows === 0) {
          await innerConn.rollback();
          innerConn.release();
          continue;
        }

        // 4. Ghi event hủy đơn vào timeline
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

        // 5. Ghi event thay đổi payment_status
        await innerConn.query(
          `INSERT INTO order_events
             (order_id, event_type, from_status, to_status, actor_role, note, created_at)
           VALUES (?, 'payment_status_changed', 'pending', 'failed', 'system', ?, NOW())`,
          [orderId, `Thanh toán hết hạn sau ${EXPIRE_MINUTES} phút`],
        );

        // 6. Hoàn tồn kho: cộng lại stock_quantity theo entities (không dùng reserved_quantity)
        for (const item of items) {
          if (item.variant_id) {
            // Có variant → chỉ hoàn kho variant, KHÔNG cộng vào product
            await innerConn.query(
              `UPDATE product_variants
               SET stock_quantity = stock_quantity + ?,
                   updated_at     = NOW()
               WHERE variant_id = ?`,
              [item.quantity, item.variant_id],
            );
          } else {
            // Không có variant → hoàn kho trực tiếp vào product
            await innerConn.query(
              `UPDATE products
               SET stock_quantity = stock_quantity + ?,
                   updated_at     = NOW()
               WHERE product_id = ?`,
              [item.quantity, item.product_id],
            );
          }
        }

        await innerConn.commit();
        console.log(
          `[CancelExpiredOrders] ✅ Đã hủy đơn #${order.order_code} (ID: ${orderId})`,
        );
      } catch (err) {
        await innerConn.rollback();
        console.error(
          `[CancelExpiredOrders] ❌ Lỗi khi hủy đơn ${orderId}:`,
          err,
        );
      } finally {
        innerConn.release();
      }
    }

    // Transaction ngoài chỉ dùng để query danh sách — commit/rollback ở đây không ảnh hưởng kho
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error(
      "[CancelExpiredOrders] ❌ Lỗi khi query danh sách đơn hết hạn:",
      err,
    );
  } finally {
    conn.release();
  }
}
