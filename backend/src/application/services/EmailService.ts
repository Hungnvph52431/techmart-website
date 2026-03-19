import nodemailer from 'nodemailer';

// Cấu hình transporter từ biến môi trường
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const FROM_NAME = process.env.SMTP_FROM_NAME || 'TechMart';
const FROM_EMAIL = process.env.SMTP_USER || 'noreply@techmart.vn';

// ──────────────────────────────────────────────────────────────
// Gửi email thông báo thanh toán thành công
// ──────────────────────────────────────────────────────────────
interface PaymentSuccessData {
  customerName: string;
  customerEmail: string;
  orderCode: string;
  orderId: number;
  total: number;
  paymentMethod: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank_transfer: 'Chuyển khoản ngân hàng',
    momo: 'Ví MoMo',
    vnpay: 'VNPay',
    wallet: 'Ví TechMart',
  };
  return map[method] || method;
}

export async function sendPaymentSuccessEmail(data: PaymentSuccessData): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.warn('[Email] SMTP_USER chưa cấu hình — bỏ qua gửi email');
    return;
  }

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.productName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.price)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.subtotal)}</td>
      </tr>`
    )
    .join('');

  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#333;">
    <div style="background:#2563eb;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Thanh toán thành công!</h1>
    </div>
    <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p>Xin chào <strong>${data.customerName}</strong>,</p>
      <p>Đơn hàng <strong>#${data.orderCode}</strong> của bạn đã được thanh toán thành công.</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Mã đơn hàng</strong></td>
          <td style="padding:8px 12px;">${data.orderCode}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;"><strong>Phương thức thanh toán</strong></td>
          <td style="padding:8px 12px;">${getPaymentMethodLabel(data.paymentMethod)}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Tổng tiền</strong></td>
          <td style="padding:8px 12px;color:#2563eb;font-weight:bold;font-size:18px;">${formatCurrency(data.total)}</td>
        </tr>
      </table>

      <h3 style="margin:20px 0 8px;font-size:16px;">Chi tiết đơn hàng</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;">Sản phẩm</th>
            <th style="padding:8px 12px;text-align:center;">SL</th>
            <th style="padding:8px 12px;text-align:right;">Đơn giá</th>
            <th style="padding:8px 12px;text-align:right;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <h3 style="margin:20px 0 8px;font-size:16px;">Thông tin giao hàng</h3>
      <p style="margin:4px 0;"><strong>${data.shippingName}</strong> — ${data.shippingPhone}</p>
      <p style="margin:4px 0;">${data.shippingAddress}, ${data.shippingCity}</p>

      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
      <p style="font-size:13px;color:#6b7280;">
        Cảm ơn bạn đã mua sắm tại TechMart! Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ hotline <strong>1900 1234</strong>.
      </p>
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `[TechMart] Thanh toán thành công — Đơn hàng #${data.orderCode}`,
      html,
    });
    console.log(`[Email] Đã gửi email thanh toán thành công cho ${data.customerEmail} (đơn ${data.orderCode})`);
  } catch (error) {
    // Không throw — email là tính năng phụ, không được chặn flow chính
    console.error('[Email] Lỗi gửi email:', error);
  }
}
