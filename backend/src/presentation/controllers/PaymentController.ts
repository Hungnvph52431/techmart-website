import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { OrderUseCase } from "../../application/use-cases/OrderUseCase";
import {
  createPaymentUrl,
  verifyReturnUrl,
} from "../../application/services/VNPayService";
import type { ReturnQueryFromVNPay } from "vnpay";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export class PaymentController {
  constructor(
    private orderUseCase: OrderUseCase,
    private walletUseCase?: any,
  ) {}

  // ─── 1. Tạo URL thanh toán ───────────────────────────────────────────────
  createVNPayUrl = async (req: AuthRequest, res: Response) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ message: "Thiếu orderId" });
      }

      const ipAddr =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
        req.socket.remoteAddress?.replace("::ffff:", "") ||
        "127.0.0.1";

      const order = await this.orderUseCase.getOrderById(Number(orderId));
      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }
      if (order.userId !== req.user.userId) {
        return res.status(403).json({ message: "Không có quyền" });
      }
      if (order.paymentStatus === "paid") {
        return res.status(400).json({ message: "Đơn đã thanh toán" });
      }
      if (order.status === "cancelled") {
        return res.status(400).json({ message: "Đơn đã bị hủy" });
      }

      const paymentUrl = createPaymentUrl({
        orderId: order.orderId,
        orderCode: order.orderCode,
        amount: order.total,
        ipAddr,
      });

      return res.json({ paymentUrl });
    } catch (error: any) {
      console.error("[Payment] createVNPayUrl error:", error);
      return res.status(500).json({ message: error.message });
    }
  };

  // ─── 2. VNPay redirect về đây sau khi thanh toán ────────────────────────
  // Backend verify chữ ký → update DB → redirect sang frontend
  vnpayReturn = async (req: Request, res: Response) => {
    const query = req.query as unknown as ReturnQueryFromVNPay;
    const orderCode = (req.query as any)["vnp_TxnRef"] as string;
    const vnpResponseCode = (req.query as any)["vnp_ResponseCode"] as string;
    const vnpTransactionNo = (req.query as any)["vnp_TransactionNo"] as string;

    // Handle wallet top-up VNPay return
    if (orderCode && orderCode.startsWith("WLT-")) {
      try {
        const verify2 = verifyReturnUrl(query);
        if (verify2.isVerified && verify2.isSuccess && this.walletUseCase) {
          await this.walletUseCase.completeVNPayTopup(
            orderCode,
            vnpTransactionNo,
          );
          return res.redirect(`${FRONTEND_URL}/wallet?topup=success`);
        } else {
          if (this.walletUseCase)
            await this.walletUseCase.failVNPayTopup(orderCode);
          return res.redirect(`${FRONTEND_URL}/wallet?topup=failed`);
        }
      } catch (err) {
        console.error("[Payment] wallet vnpay return error:", err);
        return res.redirect(`${FRONTEND_URL}/wallet?topup=error`);
      }
    }

    try {
      const verify = verifyReturnUrl(query);
      const order = await this.orderUseCase.getOrderByCode(orderCode);

      if (!order) {
        return res.redirect(`${FRONTEND_URL}/payment/result?status=error`);
      }

      // Đã thanh toán trước đó → redirect success luôn
      if (order.paymentStatus === "paid") {
        return res.redirect(
          `${FRONTEND_URL}/payment/result?status=success&orderId=${order.orderId}&orderCode=${orderCode}`,
        );
      }

      if (verify.isVerified && verify.isSuccess) {
        await this.orderUseCase.updateOrderPaymentStatus(
          order.orderId,
          "paid",
          null,
          "system" as any,
          `VNPay TxnNo: ${vnpTransactionNo}`,
        );
        return res.redirect(
          `${FRONTEND_URL}/payment/result?status=success&orderId=${order.orderId}&orderCode=${orderCode}`,
        );
      }

      const status = vnpResponseCode === "24" ? "cancel" : "failed";
      return res.redirect(
        `${FRONTEND_URL}/payment/result?status=${status}&orderId=${order.orderId}&orderCode=${orderCode}`,
      );
    } catch (error: any) {
      console.error("[Payment] vnpayReturn error:", error);
      return res.redirect(`${FRONTEND_URL}/payment/result?status=error`);
    }
  };

  // ─── 3. Frontend gọi để lấy thông tin đơn hàng sau khi redirect ─────────
  vnpayCallback = async (req: AuthRequest, res: Response) => {
    try {
      const orderCode = req.query["orderCode"] as string;
      if (!orderCode) {
        return res
          .status(400)
          .json({ success: false, message: "Thiếu orderCode" });
      }

      const order = await this.orderUseCase.getOrderByCode(orderCode);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy đơn hàng" });
      }
      if (order.userId !== req.user.userId) {
        return res
          .status(403)
          .json({ success: false, message: "Không có quyền" });
      }

      return res.json({
        success: true,
        orderId: order.orderId,
        orderCode: order.orderCode,
        paymentStatus: order.paymentStatus,
      });
    } catch (error: any) {
      console.error("[Payment] vnpayCallback error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  // ─── 4. IPN — VNPay gọi server to server ────────────────────────────────
  vnpayIpn = async (req: Request, res: Response) => {
    try {
      const query = req.query as unknown as ReturnQueryFromVNPay;
      const verify = verifyReturnUrl(query);

      if (!verify.isVerified) {
        return res.json({ RspCode: "97", Message: "Invalid signature" });
      }

      const orderCode = (req.query as any)["vnp_TxnRef"] as string;
      const vnpTransactionNo = (req.query as any)[
        "vnp_TransactionNo"
      ] as string;

      // Xử lý wallet topup qua IPN (fallback nếu browser redirect fail)
      if (orderCode && orderCode.startsWith("WLT-")) {
        try {
          if (verify.isSuccess && this.walletUseCase) {
            await this.walletUseCase.completeVNPayTopup(
              orderCode,
              vnpTransactionNo,
            );
          } else if (this.walletUseCase) {
            await this.walletUseCase.failVNPayTopup(orderCode);
          }
          return res.json({ RspCode: "00", Message: "Confirm Success" });
        } catch (err) {
          console.error("[Payment] wallet IPN error:", err);
          return res.json({ RspCode: "00", Message: "Confirm Success" });
        }
      }

      const order = await this.orderUseCase.getOrderByCode(orderCode);

      if (!order) {
        return res.json({ RspCode: "01", Message: "Order not found" });
      }
      if (order.paymentStatus === "paid") {
        return res.json({ RspCode: "02", Message: "Order already confirmed" });
      }

      const vnpAmount = Number((req.query as any)["vnp_Amount"]) / 100;
      if (Math.abs(order.total - vnpAmount) > 1) {
        return res.json({ RspCode: "04", Message: "Invalid amount" });
      }

      if (verify.isSuccess) {
        await this.orderUseCase.updateOrderPaymentStatus(
          order.orderId,
          "paid",
          null,
          "system" as any,
          `VNPay IPN TxnNo: ${vnpTransactionNo}`,
        );
      }

      return res.json({ RspCode: "00", Message: "Confirm Success" });
    } catch (error: any) {
      console.error("[Payment] vnpayIpn error:", error);
      return res.json({ RspCode: "99", Message: "Unknown error" });
    }
  };

  // ─── 5. IPN — Thanh toán lại ────────────────────────────────
  repay = async (req: AuthRequest, res: Response) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ message: "Thiếu orderId" });
      }

      const order = await this.orderUseCase.getOrderById(Number(orderId));
      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      // Kiểm tra quyền sở hữu
      if (order.userId !== req.user.userId) {
        return res
          .status(403)
          .json({ message: "Không có quyền thực hiện thao tác này" });
      }

      // Chỉ cho phép thanh toán lại khi:
      // 1. Phương thức thanh toán là vnpay
      // 2. Trạng thái thanh toán chưa hoàn thành (pending hoặc failed)
      // 3. Đơn hàng chưa bị hủy
      if (order.paymentMethod !== "vnpay") {
        return res
          .status(400)
          .json({ message: "Chỉ hỗ trợ thanh toán lại cho đơn VNPay" });
      }
      if (order.paymentStatus === "paid") {
        return res
          .status(400)
          .json({ message: "Đơn hàng này đã được thanh toán" });
      }
      if (order.status === "cancelled") {
        return res
          .status(400)
          .json({ message: "Đơn hàng đã bị hủy, không thể thanh toán lại" });
      }
      if (!["pending", "failed"].includes(order.paymentStatus)) {
        return res
          .status(400)
          .json({
            message: `Không thể thanh toán lại với trạng thái: ${order.paymentStatus}`,
          });
      }

      // Nếu paymentStatus là 'failed', reset về 'pending' để cho phép thanh toán lại
      // (PAYMENT_STATUS_TRANSITIONS: failed → pending)
      if (order.paymentStatus === "failed") {
        await this.orderUseCase.updateOrderPaymentStatus(
          order.orderId,
          "pending",
          req.user.userId,
          "customer",
          "Khách hàng yêu cầu thanh toán lại",
        );
      }

      const ipAddr =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
        req.socket.remoteAddress?.replace("::ffff:", "") ||
        "127.0.0.1";

      const paymentUrl = createPaymentUrl({
        orderId: order.orderId,
        orderCode: order.orderCode,
        amount: order.total,
        ipAddr,
      });

      return res.json({ paymentUrl });
    } catch (error: any) {
      console.error("[Payment] repay error:", error);
      return res.status(500).json({ message: error.message });
    }
  };
}
