import { cancelExpiredOrders } from './cancelExpiredOrders';

const INTERVAL_MS = 60 * 1000;

export function paymentScheduler(): void {
  console.log('🤖 [PaymentScheduler] Khởi động - Kiểm tra mỗi 1 phút ...');

  cancelExpiredOrders().catch((err) =>
    console.error('[Scheduler] cancelExpiredOrders lần đầu thất bại:', err)
  );

  setInterval(() => {
    cancelExpiredOrders().catch((err) =>
      console.error('[Scheduler] cancelExpiredOrders thất bại:', err)
    );
  }, INTERVAL_MS);
}
