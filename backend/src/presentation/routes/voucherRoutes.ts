import { Router } from "express";
import { VoucherController } from "../controllers/VoucherController";
// Import middleware giống hệt User để bảo vệ quyền Admin
import { authMiddleware, adminMiddleware } from "../middlewares/auth.middleware";

export const createVoucherRoutes = (voucherController: VoucherController) => {
    const router = Router();
    
    // Yêu cầu đăng nhập và phải là Admin mới được thao tác Voucher
    router.use(authMiddleware, adminMiddleware);

    // Dùng bind() hoặc arrow function để không bị mất context 'this'
    router.get('/', (req, res) => voucherController.getAll(req, res));
    router.post('/', (req, res) => voucherController.create(req, res));
    router.delete('/:id', (req, res) => voucherController.delete(req, res));

    // Tôi tạo sẵn bộ khung cho các tính năng tương lai, bạn có thể mở comment khi cần:
    // router.get('/:id', (req, res) => voucherController.getById(req, res));
    // router.put('/:id', (req, res) => voucherController.update(req, res));
    // router.delete('/:id', (req, res) => voucherController.delete(req, res));

    return router;
};