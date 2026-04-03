import { Request, Response } from "express";
import { OrderUseCase } from "../../application/use-cases/OrderUseCase";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  toOrderDetail,
  toOrderListItem,
} from "../../application/mappers/OrderPresenter";

export class OrderController {
  constructor(private orderUseCase: OrderUseCase) {}

  // --- DÀNH CHO KHÁCH HÀNG (MY ORDERS) ---

  /** Lấy danh sách đơn hàng của tôi */
  getMine = async (req: AuthRequest, res: Response) => {
    try {
      const orders = await this.orderUseCase.getMyOrders(
        req.user.userId,
        req.query.status as any,
      );
      // Sử dụng Mapper để trả về định dạng chuẩn cho khách hàng
      res.json(orders.map((order) => toOrderListItem(order, "customer")));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  /** Lấy chi tiết đơn hàng của tôi */
  getMyById = async (req: AuthRequest, res: Response) => {
    try {
      const aggregate = await this.orderUseCase.getMyOrderDetail(
        Number(req.params.id),
        req.user.userId,
      );

      if (!aggregate) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      res.json(toOrderDetail(aggregate, "customer"));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  /** Lấy dòng thời gian (Timeline) đơn hàng của tôi */
  getMyTimeline = async (req: AuthRequest, res: Response) => {
    try {
      const timeline = await this.orderUseCase.getMyOrderTimeline(
        Number(req.params.id),
        req.user.userId,
      );

      if (!timeline) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy lịch sử đơn hàng" });
      }

      res.json(timeline);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getReturns = async (req: AuthRequest, res: Response) => {
    try {
      const returns = await this.orderUseCase.getOrderReturns(
        Number(req.params.id),
        req.user.userId,
      );

      if (!returns) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy thông tin hoàn trả" });
      }

      res.json(returns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getReturnById = async (req: AuthRequest, res: Response) => {
    try {
      const orderReturn = await this.orderUseCase.getOrderReturn(
        Number(req.params.id),
        Number(req.params.returnId),
        req.user.userId,
      );

      if (!orderReturn) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy phiếu hoàn trả" });
      }

      res.json(orderReturn);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // --- THAO TÁC ĐƠN HÀNG ---

  /** Tạo đơn hàng mới */
  create = async (req: AuthRequest, res: Response) => {
    try {
      const order = await this.orderUseCase.createOrder({
        ...req.body,
        userId: req.user.userId, // Lấy userId từ Token đã authenticate
      });
      res.status(201).json(order);
    } catch (error: any) {
      console.error(
        "❌ [OrderController.create]",
        error.message,
        error.stack?.split("\n").slice(0, 3).join("\n"),
      );
      res.status(400).json({ message: error.message });
    }
  };

  /** Hủy đơn hàng (dành cho khách hàng) */
  cancelMine = async (req: AuthRequest, res: Response) => {
    try {
      const order = await this.orderUseCase.cancelOrder(
        Number(req.params.id),
        req.user.userId,
        req.user.role,
        req.body.reason || "",
        req.body.adminNote,
      );

      if (!order) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy đơn hàng để hủy" });
      }

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  /** Khách xác nhận đã nhận hàng */
  confirmDeliveredMine = async (req: AuthRequest, res: Response) => {
    try {
      const order = await this.orderUseCase.confirmDeliveredByCustomer(
        Number(req.params.id),
        req.user.userId,
      );

      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  /** Yêu cầu hoàn trả hàng (hỗ trợ upload ảnh bằng chứng) */
  createReturn = async (req: AuthRequest, res: Response) => {
    try {
      // Multer đã parse multipart → req.files chứa ảnh, req.body chứa JSON fields
      const files = (req.files as Express.Multer.File[]) || [];
      const evidenceImages = files.map((f) => `/images/returns/${f.filename}`);

      // Nếu items gửi dưới dạng string (FormData), parse lại
      let items = req.body.items;
      if (typeof items === "string") {
        items = JSON.parse(items);
      }

      const orderReturn = await this.orderUseCase.requestReturn(
        Number(req.params.id),
        req.user.userId,
        {
          reason: req.body.reason,
          customerNote: req.body.customerNote,
          items,
          evidenceImages:
            evidenceImages.length > 0 ? evidenceImages : undefined,
        },
      );

      if (!orderReturn) {
        return res
          .status(404)
          .json({ message: "Yêu cầu trả hàng không hợp lệ" });
      }

      res.status(201).json(orderReturn);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  // --- DÀNH CHO QUẢN TRỊ (ADMIN) ---

  /** Lấy tất cả yêu cầu hoàn trả (Admin) */
  adminListAllReturns = async (req: Request, res: Response) => {
    try {
      const returns = await this.orderUseCase.getAdminAllReturns(
        req.query as any,
      );
      res.json(returns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  /** Admin duyệt / từ chối yêu cầu hoàn trả */
  adminReviewReturn = async (req: AuthRequest, res: Response) => {
    try {
      const { decision, adminNote } = req.body;
      const result = await this.orderUseCase.reviewReturn(
        Number(req.params.id),
        Number(req.params.returnId),
        req.user.userId,
        req.user.role,
        decision,
        adminNote,
      );
      if (!result)
        return res
          .status(404)
          .json({ message: "Không tìm thấy yêu cầu hoàn trả" });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  /** Admin xác nhận đã nhận lại hàng */
  adminReceiveReturn = async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.orderUseCase.receiveReturn(
        Number(req.params.id),
        Number(req.params.returnId),
        req.user.userId,
        req.user.role,
        req.body.adminNote,
      );
      if (!result)
        return res
          .status(404)
          .json({ message: "Không tìm thấy yêu cầu hoàn trả" });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  /** Admin xác nhận đã hoàn tiền */
  adminRefundReturn = async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.orderUseCase.refundReturn(
        Number(req.params.id),
        Number(req.params.returnId),
        req.user.userId,
        req.user.role,
        req.body.adminNote,
      );
      if (!result)
        return res
          .status(404)
          .json({ message: "Không tìm thấy yêu cầu hoàn trả" });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  /** Lấy tất cả đơn hàng (Admin) */
  getAll = async (req: Request, res: Response) => {
    try {
      console.log(">>> Đã nhận yêu cầu lấy danh sách đơn hàng Admin"); // Thêm dòng này
      const orders = await this.orderUseCase.getAdminOrders(req.query as any);
      res.json(orders);
    } catch (error: any) {
      console.error("!!! LỖI NGHIÊM TRỌNG TẠI CONTROLLER:", error); // Đảm bảo có dòng này để Docker hiện chữ đỏ
      res.status(500).json({ message: error.message });
    }
  };

  /** Lấy thống kê đơn hàng cho Dashboard */
  getStats = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query as {
        startDate?: string;
        endDate?: string;
      };
      const stats = await this.orderUseCase.getOrderStats(startDate, endDate);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error("[getStats ERROR]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /** Cập nhật trạng thái đơn hàng (Admin) */
  updateStatus = async (req: Request, res: Response) => {
    try {
      const { status, actorUserId, actorRole, note } = req.body;
      const order = await this.orderUseCase.transitionOrderStatus(
        Number(req.params.id),
        status,
        actorUserId,
        actorRole,
        note,
      );

      if (!order) {
        return res
          .status(404)
          .json({ message: "Không thể cập nhật trạng thái" });
      }

      res.json({ message: "Trạng thái đơn hàng đã được cập nhật", order });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}
