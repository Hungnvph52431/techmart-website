import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Lazy initialization — tránh đọc env trước khi dotenv.config() chạy
let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    });
  }
  return _transporter;
}

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
  return amount.toLocaleString("vi-VN") + "đ";
}

function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    cod: "Thanh toán khi nhận hàng (COD)",
    bank_transfer: "Chuyển khoản ngân hàng",
    momo: "Ví MoMo",
    vnpay: "VNPay",
    wallet: "Ví TechMart",
    deposit: "Đặt cọc (Ví + COD)",
  };
  return map[method] || method;
}

export async function sendPaymentSuccessEmail(
  data: PaymentSuccessData,
): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.warn("[Email] SMTP_USER chưa cấu hình — bỏ qua gửi email");
    return;
  }

  const fromName = process.env.SMTP_FROM_NAME || "TechMart";
  const fromEmail = process.env.SMTP_USER;

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.productName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.price)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.subtotal)}</td>
      </tr>`,
    )
    .join("");

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
    await getTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.customerEmail,
      subject: `[TechMart] Thanh toán thành công — Đơn hàng #${data.orderCode}`,
      html,
    });
    console.log(
      `[Email] Đã gửi email thanh toán thành công cho ${data.customerEmail} (đơn ${data.orderCode})`,
    );
  } catch (error) {
    console.error("[Email] Lỗi gửi email:", error);
  }
}

// ──────────────────────────────────────────────────────────────
// Gửi email thông báo đặt hàng thành công (ngay khi tạo đơn)
// ──────────────────────────────────────────────────────────────
interface OrderCreatedData {
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

export async function sendOrderCreatedEmail(
  data: OrderCreatedData,
): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.warn("[Email] SMTP_USER chưa cấu hình — bỏ qua gửi email");
    return;
  }

  const fromName = process.env.SMTP_FROM_NAME || "TechMart";
  const fromEmail = process.env.SMTP_USER;

  const paymentNote =
    data.paymentMethod === "cod"
      ? '<p style="color:#f59e0b;font-weight:bold;">Bạn sẽ thanh toán khi nhận hàng (COD).</p>'
      : data.paymentMethod === "wallet"
        ? '<p style="color:#10b981;font-weight:bold;">Đã thanh toán bằng Ví TechMart.</p>'
        : `<p style="color:#f59e0b;font-weight:bold;">Vui lòng hoàn tất thanh toán qua ${getPaymentMethodLabel(data.paymentMethod)} để đơn hàng được xử lý.</p>`;

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.productName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.price)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.subtotal)}</td>
      </tr>`,
    )
    .join("");

  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#333;">
    <div style="background:#10b981;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Đặt hàng thành công!</h1>
    </div>
    <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p>Xin chào <strong>${data.customerName}</strong>,</p>
      <p>Cảm ơn bạn đã đặt hàng tại TechMart! Đơn hàng <strong>#${data.orderCode}</strong> đã được ghi nhận thành công.</p>

      ${paymentNote}

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
          <td style="padding:8px 12px;color:#10b981;font-weight:bold;font-size:18px;">${formatCurrency(data.total)}</td>
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
        Bạn có thể theo dõi trạng thái đơn hàng trong mục <strong>Đơn hàng của tôi</strong> trên website.
        Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ hotline <strong>1900 1234</strong>.
      </p>
    </div>
  </div>`;

  try {
    await getTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.customerEmail,
      subject: `[TechMart] Đặt hàng thành công — Đơn hàng #${data.orderCode}`,
      html,
    });
    console.log(
      `[Email] Đã gửi email đặt hàng thành công cho ${data.customerEmail} (đơn ${data.orderCode})`,
    );
  } catch (error) {
    console.error("[Email] Lỗi gửi email đặt hàng:", error);
  }
}

// ──────────────────────────────────────────────────────────────
// Gửi email thông báo nạp ví thành công
// ──────────────────────────────────────────────────────────────
interface WalletTopupSuccessData {
  customerName: string;
  customerEmail: string;
  referenceCode: string;
  amount: number;
  newBalance: number;
}

export async function sendWalletTopupEmail(
  data: WalletTopupSuccessData,
): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.warn("[Email] SMTP_USER chưa cấu hình — bỏ qua gửi email");
    return;
  }

  const fromName = process.env.SMTP_FROM_NAME || "TechMart";
  const fromEmail = process.env.SMTP_USER;

  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#333;">
    <div style="background:#f97316;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Nạp ví thành công!</h1>
    </div>
    <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p>Xin chào <strong>${data.customerName}</strong>,</p>
      <p>Ví TechMart của bạn đã được nạp thành công.</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Mã giao dịch</strong></td>
          <td style="padding:8px 12px;">${data.referenceCode}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;"><strong>Số tiền nạp</strong></td>
          <td style="padding:8px 12px;color:#f97316;font-weight:bold;font-size:18px;">+${formatCurrency(data.amount)}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Số dư hiện tại</strong></td>
          <td style="padding:8px 12px;color:#2563eb;font-weight:bold;font-size:18px;">${formatCurrency(data.newBalance)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;"><strong>Phương thức</strong></td>
          <td style="padding:8px 12px;">VNPay</td>
        </tr>
      </table>

      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
      <p style="font-size:13px;color:#6b7280;">
        Cảm ơn bạn đã sử dụng ví TechMart! Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ hotline <strong>1900 1234</strong>.
      </p>
    </div>
  </div>`;

  try {
    await getTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.customerEmail,
      subject: `[TechMart] Nạp ví thành công — ${data.referenceCode}`,
      html,
    });
    console.log(
      `[Email] Đã gửi email nạp ví thành công cho ${data.customerEmail} (${data.referenceCode})`,
    );
  } catch (error) {
    console.error("[Email] Lỗi gửi email nạp ví:", error);
  }
}

// ──────────────────────────────────────────────────────────────
// Gửi OTP cho Quên mật khẩu
// ──────────────────────────────────────────────────────────────
interface ForgotPasswordOtpData {
  customerName: string;
  customerEmail: string;
  otp: string;
  expiresInMinutes: number;
}

export async function sendForgotPasswordOtpEmail(
  data: ForgotPasswordOtpData,
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      "[Email] SMTP_USER hoặc SMTP_PASS chưa được cấu hình — bỏ qua gửi OTP",
    );
    throw new Error(
      "Cấu hình email chưa hoàn tất. Vui lòng kiểm tra biến môi trường.",
    );
  }

  const fromName = process.env.SMTP_FROM_NAME || "TechMart";
  const fromEmail = process.env.SMTP_USER;

  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#333;background:#f9fafb;padding:20px;">
    <div style="background:#ef4444;padding:30px 24px;text-align:center;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">Mã OTP đặt lại mật khẩu</h1>
    </div>
    
    <div style="padding:30px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
      <p style="margin-bottom:16px;">Xin chào <strong>${data.customerName}</strong>,</p>
      <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản TechMart.</p>
      
      <div style="background:#fef2f2;border:2px dashed #ef4444;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
        <p style="margin:0 0 12px 0;color:#ef4444;font-size:13px;font-weight:600;letter-spacing:1px;">MÃ OTP CỦA BẠN</p>
        <h2 style="margin:0;font-size:48px;letter-spacing:12px;color:#111827;font-weight:900;">${data.otp}</h2>
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:14px;">
          Hiệu lực trong <strong>${data.expiresInMinutes} phút</strong>
        </p>
      </div>

      <div style="background:#fff7ed;border-left:4px solid #f59e0b;padding:12px 16px;margin:20px 0;font-size:13px;color:#b45309;">
        <strong>Lưu ý:</strong> Không chia sẻ mã này với bất kỳ ai. 
        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
      </div>

      <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;">

      <p style="font-size:13px;color:#6b7280;text-align:center;">
        Cảm ơn bạn đã sử dụng dịch vụ của TechMart!<br>
        Hotline hỗ trợ: <strong>1900 1234</strong>
      </p>
    </div>
  </div>`;

  try {
    await getTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.customerEmail,
      subject: `[TechMart] Mã OTP đặt lại mật khẩu - ${data.otp}`,
      html,
    });

    console.log(`[Email] ✓ Đã gửi OTP thành công cho ${data.customerEmail}`);
  } catch (error: any) {
    console.error("[Email] ✗ Lỗi gửi OTP:", error.message || error);
    throw new Error(
      `Không thể gửi OTP qua email: ${error.message || "Lỗi không xác định"}`,
    );
  }
}
