import { VNPay, ProductCode, VnpLocale, ignoreLogger, HashAlgorithm } from 'vnpay';
import type { VerifyReturnUrl, ReturnQueryFromVNPay } from 'vnpay';

export const vnpay = new VNPay({
  tmnCode: process.env.VNPAY_TMN_CODE || 'LGZKF5XY',
  secureSecret: process.env.VNPAY_HASH_SECRET || 'AYZF6NW0N0WWISS797R6NXE9X9K114LF',
  vnpayHost: 'https://sandbox.vnpayment.vn',
  testMode: true,
  hashAlgorithm: HashAlgorithm.SHA512,
  enableLog: false,
  loggerFn: ignoreLogger,
});

// ✅ Return URL trỏ về backend để verify + redirect
export const VNPAY_RETURN_URL =
  process.env.VNPAY_RETURN_URL ||
  'https://your-ngrok.ngrok-free.app/api/payment/vnpay/return';

export interface CreatePaymentParams {
  orderId: number;
  orderCode: string;
  amount: number;
  ipAddr: string;
}

export function createPaymentUrl(params: CreatePaymentParams): string {
  return vnpay.buildPaymentUrl({
    vnp_Amount: params.amount,
    vnp_IpAddr: params.ipAddr,
    vnp_TxnRef: params.orderCode,
    vnp_OrderInfo: `Thanh toan don hang ${params.orderCode}`,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: VNPAY_RETURN_URL,
    vnp_Locale: VnpLocale.VN,
  });
}

export function verifyReturnUrl(query: ReturnQueryFromVNPay): VerifyReturnUrl {
  return vnpay.verifyReturnUrl(query);
}