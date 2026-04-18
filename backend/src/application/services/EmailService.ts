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

function getBackendPublicUrl(): string {
  const explicitUrl = process.env.BACKEND_PUBLIC_URL || process.env.API_PUBLIC_URL;
  if (explicitUrl) {
    return explicitUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  // Frontend local dev của dự án đang truy cập backend qua cổng 5001.
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:5001";
  }

  return `http://localhost:${process.env.PORT || 5000}`.replace(/\/$/, "");
}

function toAbsoluteAssetUrl(assetPath?: string): string | undefined {
  if (!assetPath) return undefined;
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }
  return `${getBackendPublicUrl()}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`;
}

// ──────────────────────────────────────────────────────────────
// Gửi email thông báo thanh toán thành công
// ──────────────────────────────────────────────────────────────
interface PaymentSuccessData {
  customerName: string;
  customerEmail: string;
  orderCode: string;
  orderId: number;
  orderUrl?: string;
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
  voucherCode?: string;
  discountAmount?: number;
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
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const orderUrl = data.orderUrl || `${frontendUrl}/orders/${data.orderId}`;

  const voucherRowHtml = data.voucherCode && data.discountAmount
    ? `<tr>
          <td style="padding:8px 12px;"><strong>Mã giảm giá</strong></td>
          <td style="padding:8px 12px;color:#059669;">${data.voucherCode} (−${formatCurrency(data.discountAmount)})</td>
        </tr>`
    : '';

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
        ${voucherRowHtml}
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

      <div style="text-align:center;margin:28px 0;">
        <a href="${orderUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Xem chi tiết đơn hàng
        </a>
      </div>

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
  orderUrl?: string;
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
  voucherCode?: string;
  discountAmount?: number;
}

interface OrderCancelledData {
  customerName: string;
  customerEmail: string;
  orderCode: string;
  orderId: number;
  orderUrl?: string;
  cancelReason: string;
  refundMessage?: string;
}

interface OrderReturnRefundedData {
  customerName: string;
  customerEmail: string;
  orderCode: string;
  orderId: number;
  orderUrl?: string;
  requestCode: string;
  refundAmount: number;
  refundDestination: 'wallet' | 'bank_account';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  refundBankName?: string;
  refundAccountNumberMasked?: string;
  receiptImageUrl?: string;
  adminNote?: string;
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

  const frontendUrl2 = process.env.FRONTEND_URL || "http://localhost:5173";
  const orderUrl2 = data.orderUrl || `${frontendUrl2}/orders/${data.orderId}`;

  const paymentNote =
    data.paymentMethod === "cod"
      ? '<p style="color:#f59e0b;font-weight:bold;">Bạn sẽ thanh toán khi nhận hàng (COD).</p>'
      : data.paymentMethod === "wallet"
        ? '<p style="color:#10b981;font-weight:bold;">Đã thanh toán bằng Ví TechMart.</p>'
        : `<p style="color:#f59e0b;font-weight:bold;">Vui lòng hoàn tất thanh toán qua ${getPaymentMethodLabel(data.paymentMethod)} để đơn hàng được xử lý.</p>`;

  const voucherRowHtml2 = data.voucherCode && data.discountAmount
    ? `<tr>
          <td style="padding:8px 12px;"><strong>Mã giảm giá</strong></td>
          <td style="padding:8px 12px;color:#059669;">${data.voucherCode} (−${formatCurrency(data.discountAmount)})</td>
        </tr>`
    : '';

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
        ${voucherRowHtml2}
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

      <div style="text-align:center;margin:28px 0;">
        <a href="${orderUrl2}" style="display:inline-block;background:#10b981;color:#fff;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Xem chi tiết đơn hàng
        </a>
      </div>

      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
      <p style="font-size:13px;color:#6b7280;">
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

export async function sendOrderCancelledEmail(
  data: OrderCancelledData,
): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.warn("[Email] SMTP_USER chưa cấu hình — bỏ qua gửi email");
    return;
  }

  const fromName = process.env.SMTP_FROM_NAME || "TechMart";
  const fromEmail = process.env.SMTP_USER;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const orderUrl = data.orderUrl || `${frontendUrl}/orders/${data.orderId}`;
  const refundHtml = data.refundMessage
    ? `<p style="margin:12px 0 0;color:#2563eb;font-weight:600;">${data.refundMessage}</p>`
    : "";

  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#333;">
    <div style="background:#ef4444;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Đơn hàng đã bị hủy</h1>
    </div>
    <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p>Xin chào <strong>${data.customerName}</strong>,</p>
      <p>TechMart rất tiếc phải thông báo đơn hàng <strong>#${data.orderCode}</strong> của bạn đã được hủy bởi bộ phận vận hành.</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Mã đơn hàng</strong></td>
          <td style="padding:8px 12px;">${data.orderCode}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;vertical-align:top;"><strong>Lý do hủy</strong></td>
          <td style="padding:8px 12px;color:#b91c1c;font-weight:600;">${data.cancelReason}</td>
        </tr>
      </table>

      ${refundHtml}

      <div style="text-align:center;margin:28px 0;">
        <a href="${orderUrl}" style="display:inline-block;background:#ef4444;color:#fff;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Xem chi tiết đơn hàng
        </a>
      </div>

      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
      <p style="font-size:13px;color:#6b7280;">
        Nếu cần hỗ trợ thêm, vui lòng liên hệ hotline <strong>1900 1234</strong> hoặc truy cập mục <strong>Đơn hàng của tôi</strong> để xem chi tiết.
      </p>
    </div>
  </div>`;

  try {
    await getTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.customerEmail,
      subject: `[TechMart] Đơn hàng #${data.orderCode} đã bị hủy`,
      html,
    });
    console.log(
      `[Email] Đã gửi email hủy đơn cho ${data.customerEmail} (đơn ${data.orderCode})`,
    );
  } catch (error) {
    console.error("[Email] Lỗi gửi email:", error);
  }
}

export async function sendOrderReturnRefundedEmail(
  data: OrderReturnRefundedData,
): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.warn("[Email] SMTP_USER chưa cấu hình — bỏ qua gửi email");
    return;
  }

  const fromName = process.env.SMTP_FROM_NAME || "TechMart";
  const fromEmail = process.env.SMTP_USER;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const orderUrl = data.orderUrl || `${frontendUrl}/orders/${data.orderId}`;
  const receiptUrl = toAbsoluteAssetUrl(data.receiptImageUrl);

  const receiptBlock = receiptUrl
    ? `
      <div style="margin:20px 0;padding:16px;border:1px solid #dbeafe;background:#eff6ff;border-radius:12px;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#1d4ed8;">Biên lai chuyển khoản</p>
        <p style="margin:0 0 12px;font-size:13px;color:#475569;">
          TechMart đã cập nhật ảnh biên lai cho khoản hoàn tiền của bạn.
        </p>
        <a href="${receiptUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-weight:bold;font-size:14px;padding:12px 20px;border-radius:8px;text-decoration:none;">
          Xem ảnh biên lai
        </a>
      </div>`
    : "";

  const payoutBlock =
    data.refundDestination === "bank_account"
      ? `
        <tr>
          <td style="padding:8px 12px;"><strong>Hình thức hoàn tiền</strong></td>
          <td style="padding:8px 12px;">Chuyển khoản ngân hàng</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Ngân hàng nhận</strong></td>
          <td style="padding:8px 12px;">${data.refundBankName || "Tài khoản liên kết"}${data.refundAccountNumberMasked ? ` - ${data.refundAccountNumberMasked}` : ""}</td>
        </tr>`
      : `
        <tr>
          <td style="padding:8px 12px;"><strong>Hình thức hoàn tiền</strong></td>
          <td style="padding:8px 12px;">Ví TechMart</td>
        </tr>`;

  const noteRow = data.adminNote
    ? `<tr>
         <td style="padding:8px 12px;"><strong>Ghi chú</strong></td>
         <td style="padding:8px 12px;">${data.adminNote}</td>
       </tr>`
    : "";

  const statusMessage =
    data.paymentStatus === "refunded"
      ? data.refundDestination === "bank_account"
        ? "TechMart đã hoàn tiền thành công về tài khoản ngân hàng liên kết của bạn."
        : "TechMart đã hoàn tiền thành công vào ví TechMart của bạn."
      : "Yêu cầu hoàn trả của bạn đã được xử lý, nhưng đơn hàng chưa phát sinh thanh toán nên không có khoản tiền cần hoàn lại.";

  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#333;">
    <div style="background:#16a34a;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Hoàn tiền yêu cầu trả hàng thành công</h1>
    </div>
    <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p>Xin chào <strong>${data.customerName}</strong>,</p>
      <p>${statusMessage}</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Mã đơn hàng</strong></td>
          <td style="padding:8px 12px;">${data.orderCode}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;"><strong>Mã yêu cầu hoàn trả</strong></td>
          <td style="padding:8px 12px;">${data.requestCode}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Số tiền hoàn</strong></td>
          <td style="padding:8px 12px;color:#16a34a;font-weight:bold;font-size:18px;">${formatCurrency(data.refundAmount)}</td>
        </tr>
        ${payoutBlock}
        ${noteRow}
      </table>

      ${receiptBlock}

      <div style="text-align:center;margin:28px 0;">
        <a href="${orderUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Xem chi tiết đơn hàng
        </a>
      </div>
    </div>
  </div>`;

  try {
    await getTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.customerEmail,
      subject: `[TechMart] Hoàn tiền thành công — ${data.requestCode}`,
      html,
    });
  } catch (error) {
    console.error("[Email] Lỗi gửi email hoàn tiền trả hàng:", error);
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

interface WalletWithdrawalRequestedData {
  customerName: string;
  customerEmail: string;
  referenceCode: string;
  amount: number;
  bankName: string;
  accountNumberMasked: string;
  currentBalance: number;
}

interface WalletWithdrawalStatusData {
  customerName: string;
  customerEmail: string;
  referenceCode: string;
  amount: number;
  bankName: string;
  accountNumberMasked: string;
  status: 'approved' | 'paid' | 'rejected';
  adminNote?: string;
  receiptImageUrl?: string;
  currentBalance?: number;
}

export async function sendWalletWithdrawalRequestedEmail(
  data: WalletWithdrawalRequestedData,
): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.warn('[Email] SMTP_USER chưa cấu hình — bỏ qua gửi email');
    return;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'TechMart';
  const fromEmail = process.env.SMTP_USER;

  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#333;">
    <div style="background:#2563eb;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Yêu cầu rút tiền đã được ghi nhận</h1>
    </div>
    <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p>Xin chào <strong>${data.customerName}</strong>,</p>
      <p>TechMart đã ghi nhận yêu cầu rút tiền từ ví của bạn và đang chờ xử lý.</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Mã yêu cầu</strong></td>
          <td style="padding:8px 12px;">${data.referenceCode}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;"><strong>Số tiền rút</strong></td>
          <td style="padding:8px 12px;color:#dc2626;font-weight:bold;font-size:18px;">-${formatCurrency(data.amount)}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Ngân hàng nhận</strong></td>
          <td style="padding:8px 12px;">${data.bankName} - ${data.accountNumberMasked}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;"><strong>Số dư ví còn lại</strong></td>
          <td style="padding:8px 12px;color:#2563eb;font-weight:bold;">${formatCurrency(data.currentBalance)}</td>
        </tr>
      </table>

      <p style="font-size:13px;color:#6b7280;">Khi yêu cầu được duyệt hoặc bị từ chối, TechMart sẽ gửi thông báo tiếp theo cho bạn.</p>
    </div>
  </div>`;

  try {
    await getTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.customerEmail,
      subject: `[TechMart] Đã nhận yêu cầu rút tiền — ${data.referenceCode}`,
      html,
    });
  } catch (error) {
    console.error('[Email] Lỗi gửi email yêu cầu rút tiền:', error);
  }
}

export async function sendWalletWithdrawalStatusEmail(
  data: WalletWithdrawalStatusData,
): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.warn('[Email] SMTP_USER chưa cấu hình — bỏ qua gửi email');
    return;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'TechMart';
  const fromEmail = process.env.SMTP_USER;

  const titleMap = {
    approved: 'Yêu cầu rút tiền đã được duyệt',
    paid: 'Tiền rút ví đã được chuyển khoản',
    rejected: 'Yêu cầu rút tiền bị từ chối',
  } as const;

  const descriptionMap = {
    approved: 'Yêu cầu rút tiền của bạn đã được duyệt và đang chờ chuyển khoản.',
    paid: 'TechMart đã đánh dấu yêu cầu rút tiền của bạn là đã chuyển khoản thành công.',
    rejected: 'Yêu cầu rút tiền của bạn đã bị từ chối.',
  } as const;

  const colorMap = {
    approved: '#2563eb',
    paid: '#16a34a',
    rejected: '#dc2626',
  } as const;

  const balanceRow = typeof data.currentBalance === 'number'
    ? `<tr>
          <td style="padding:8px 12px;"><strong>Số dư ví hiện tại</strong></td>
          <td style="padding:8px 12px;color:#2563eb;font-weight:bold;">${formatCurrency(data.currentBalance)}</td>
        </tr>`
    : '';

  const noteRow = data.adminNote
    ? `<tr>
          <td style="padding:8px 12px;"><strong>Ghi chú</strong></td>
          <td style="padding:8px 12px;">${data.adminNote}</td>
        </tr>`
    : '';

  const receiptUrl = toAbsoluteAssetUrl(data.receiptImageUrl);
  const receiptRow =
    data.status === 'paid' && receiptUrl
      ? `<tr style="background:#f9fafb;">
           <td style="padding:8px 12px;"><strong>Biên lai chuyển khoản</strong></td>
           <td style="padding:8px 12px;"><a href="${receiptUrl}" style="color:#2563eb;font-weight:700;text-decoration:none;">Xem ảnh biên lai</a></td>
         </tr>`
      : '';

  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#333;">
    <div style="background:${colorMap[data.status]};padding:24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:22px;">${titleMap[data.status]}</h1>
    </div>
    <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p>Xin chào <strong>${data.customerName}</strong>,</p>
      <p>${descriptionMap[data.status]}</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Mã yêu cầu</strong></td>
          <td style="padding:8px 12px;">${data.referenceCode}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;"><strong>Số tiền</strong></td>
          <td style="padding:8px 12px;font-weight:bold;">${formatCurrency(data.amount)}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;"><strong>Ngân hàng nhận</strong></td>
          <td style="padding:8px 12px;">${data.bankName} - ${data.accountNumberMasked}</td>
        </tr>
        ${receiptRow}
        ${noteRow}
        ${balanceRow}
      </table>
    </div>
  </div>`;

  try {
    await getTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.customerEmail,
      subject: `[TechMart] ${titleMap[data.status]} — ${data.referenceCode}`,
      html,
    });
  } catch (error) {
    console.error('[Email] Lỗi gửi email trạng thái rút tiền:', error);
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
<div style="max-width:600px; margin:0 auto; font-family:'Segoe UI', system-ui, Arial, sans-serif; color:#333; background:#f9fafb; padding:20px;">
    
    <div style="background: linear-gradient(135deg, #b91c1c 0%, #ef4444 100%); padding: 40px 24px; text-align: center; border-radius: 16px 16px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
            Đặt Lại Mật Khẩu
        </h1>
        <p style="color: #fee2e2; margin: 10px 0 0 0; font-size: 16px;">
            Mã OTP xác thực tài khoản TechMart
        </p>
    </div>

    <!-- Body -->
    <div style="background: #ffffff; padding: 40px 32px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);">

        <p style="margin-bottom: 16px;">Xin chào <strong style="color:#b91c1c;">${data.customerName}</strong>,</p>
        
        <p style="font-size: 15.5px; color: #374151; line-height: 1.6;">
            Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản TechMart. 
            Vui lòng sử dụng mã OTP dưới đây để tiếp tục:
        </p>

        <div style="margin: 32px 0; text-align: center;">
            <div style="background: #fef2f2; 
                        border: 4px dashed #ef4444; 
                        border-radius: 16px; 
                        padding: 32px 20px;">
                
                <p style="margin: 0 0 12px 0; color: #b91c1c; font-size: 13.5px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                    MÃ OTP CỦA BẠN
                </p>
                
                <div style="font-size: 54px; 
                            font-weight: 800; 
                            letter-spacing: 18px; 
                            color: #991b1b; 
                            background: #ffffff; 
                            padding: 18px 32px; 
                            border-radius: 12px; 
                            display: inline-block; 
                            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">
                    ${data.otp}
                </div>
                
                <p style="margin: 20px 0 0 0; color: #ef4444; font-size: 15px; font-weight: 600;">
                    Hiệu lực trong <strong>${data.expiresInMinutes} phút</strong>
                </p>
            </div>
        </div>

        <div style="background:#fff7ed; border-left: 5px solid #f59e0b; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14.5px; color: #b45309; line-height: 1.6;">
                <strong>⚠️ Lưu ý quan trọng:</strong><br>
                Không chia sẻ mã OTP này với bất kỳ ai. 
                TechMart sẽ <strong>không bao giờ</strong> yêu cầu bạn cung cấp mã qua điện thoại hoặc tin nhắn.
            </p>
        </div>

        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">

        <div style="text-align: center;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
                Cảm ơn bạn đã sử dụng dịch vụ của <strong>TechMart</strong>.
            </p>
            <p style="color: #94a3b8; font-size: 13px; margin: 12px 0 0 0;">
                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ ngay với chúng tôi.
            </p>

            <div style="margin-top: 24px;">
                <a href="tel:19001234" 
                   style="color: #ef4444; text-decoration: none; font-weight: 700; font-size: 15px;">
                    Hotline hỗ trợ: 1900 1234
                </a>
            </div>
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #94a3b8; font-size: 12.5px;">
                © ${new Date().getFullYear()} TechMart. All rights reserved.
            </p>
        </div>
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
