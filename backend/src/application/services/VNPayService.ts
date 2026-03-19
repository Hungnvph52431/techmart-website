import { VNPay, ProductCode, VnpLocale, ignoreLogger, HashAlgorithm } from 'vnpay';
import type { VerifyReturnUrl, ReturnQueryFromVNPay } from 'vnpay';

const tmnCode = process.env.VNPAY_TMN_CODE;
const secureSecret = process.env.VNPAY_HASH_SECRET;

if (!tmnCode || !secureSecret) {
  console.error('[VNPay] THIẾU CẤU HÌNH: VNPAY_TMN_CODE và VNPAY_HASH_SECRET phải được set trong .env');
  console.error('[VNPay] Lấy credentials tại: https://sandbox.vnpayment.vn/merchantv2/');
}

export const vnpay = new VNPay({
  tmnCode: tmnCode || '',
  secureSecret: secureSecret || '',
  vnpayHost: 'https://sandbox.vnpayment.vn',
  testMode: true,
  hashAlgorithm: HashAlgorithm.SHA512,
  enableLog: false,
  loggerFn: ignoreLogger,
});

export const VNPAY_RETURN_URL = process.env.VNPAY_RETURN_URL;

if (!VNPAY_RETURN_URL) {
  console.error('[VNPay] THIẾU CẤU HÌNH: VNPAY_RETURN_URL phải được set trong .env');
  console.error('[VNPay] Dùng ngrok để tạo public URL: ngrok http 5000');
}

export interface CreatePaymentParams {
  orderId: number;
  orderCode: string;
  amount: number;
  ipAddr: string;
}

export function createPaymentUrl(params: CreatePaymentParams): string {
  if (!VNPAY_RETURN_URL) {
    throw new Error('VNPAY_RETURN_URL chưa được cấu hình trong .env');
  }
  if (!tmnCode || !secureSecret) {
    throw new Error('VNPAY_TMN_CODE và VNPAY_HASH_SECRET chưa được cấu hình trong .env');
  }
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