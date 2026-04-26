// FEATURE: Cổng thanh toán VNPay (sandbox)
// Dùng cho: thanh toán đơn hàng, nạp tiền vào ví TechMart
// Bảo mật: HMAC SHA512 verify callback URL từ VNPay
// Liên quan: PaymentController (orders), WalletUseCase.topup (ví)
// Lưu ý: lazy init để dotenv.config() chạy trước
// Xem chi tiết: MAP.md mục #4

import { VNPay, ProductCode, VnpLocale, ignoreLogger, HashAlgorithm } from 'vnpay';
import type { VerifyReturnUrl, ReturnQueryFromVNPay } from 'vnpay';

// Lazy initialization — tránh đọc env trước khi dotenv.config() chạy
let _vnpay: VNPay | null = null;

function getVnpay(): VNPay {
  if (!_vnpay) {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secureSecret = process.env.VNPAY_HASH_SECRET;
    if (!tmnCode || !secureSecret) {
      throw new Error('VNPAY_TMN_CODE và VNPAY_HASH_SECRET chưa được cấu hình trong .env');
    }
    _vnpay = new VNPay({
      tmnCode,
      secureSecret,
      vnpayHost: 'https://sandbox.vnpayment.vn',
      testMode: true,
      hashAlgorithm: HashAlgorithm.SHA512,
      enableLog: false,
      loggerFn: ignoreLogger,
    });
  }
  return _vnpay;
}

function getReturnUrl(): string {
  const url = process.env.VNPAY_RETURN_URL;
  if (!url) {
    throw new Error('VNPAY_RETURN_URL chưa được cấu hình trong .env');
  }
  return url;
}

export interface CreatePaymentParams {
  orderId: number;
  orderCode: string;
  amount: number;
  ipAddr: string;
}

export function createPaymentUrl(params: CreatePaymentParams): string {
  return getVnpay().buildPaymentUrl({
    vnp_Amount: params.amount,
    vnp_IpAddr: params.ipAddr,
    vnp_TxnRef: params.orderCode,
    vnp_OrderInfo: `Thanh toan don hang ${params.orderCode}`,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: getReturnUrl(),
    vnp_Locale: VnpLocale.VN,
  });
}

export function verifyReturnUrl(query: ReturnQueryFromVNPay): VerifyReturnUrl {
  return getVnpay().verifyReturnUrl(query);
}
