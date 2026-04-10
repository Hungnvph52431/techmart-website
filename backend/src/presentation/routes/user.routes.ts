import { Router } from "express";
import { UserController } from "../controllers/UserControllers";
import { authMiddleware, adminMiddleware, staffMiddleware } from "../middlewares/auth.middleware";
import { uploadAvatar, uploadBanner } from "../middlewares/upload.middleware";
import pool  from "../../infrastructure/database/connection";
import type { AuthRequest } from "../middlewares/auth.middleware";
import type { Response } from "express";

export const createUserRoutes = (userController: UserController) => {
  const router = Router();

  // ✅ Route upload avatar/banner — chỉ cần đăng nhập, KHÔNG cần admin
  router.post('/me/avatar', authMiddleware, uploadAvatar.single('image'), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'Không có file được upload' });
      const avatarUrl = `/images/avatars/${req.file.filename}`;
      await pool.execute('UPDATE users SET avatar_url = ? WHERE user_id = ?', [avatarUrl, req.user.userId]);
      return res.json({ avatarUrl });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.post('/me/banner', authMiddleware, uploadBanner.single('image'), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'Không có file được upload' });
      const bannerUrl = `/images/banners/user/${req.file.filename}`;
      await pool.execute('UPDATE users SET banner_url = ? WHERE user_id = ?', [bannerUrl, req.user.userId]);
      return res.json({ bannerUrl });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ✅ Route tự cập nhật profile — chỉ cần đăng nhập
  router.put('/me/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.userId;
      // Chỉ cho phép sửa các field an toàn
      const { fullName, email, phone } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      if (fullName !== undefined) { updates.push('full_name = ?'); values.push(fullName); }
      if (email !== undefined) { updates.push('email = ?'); values.push(email); }
      if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
      if (updates.length === 0) return res.status(400).json({ message: 'Không có gì để cập nhật' });
      values.push(userId);
      await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, values);
      return res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.patch('/me/password', authMiddleware, userController.changeMyPassword);

  // Tất cả role nội bộ: xem stats (dùng cho Dashboard)
  router.get('/stats', authMiddleware, userController.getStats);

  // Staff + Admin: xem danh sách & chi tiết khách hàng (chăm sóc khách hàng)
  router.get('/', authMiddleware, staffMiddleware, userController.getAll);
  router.get('/:id', authMiddleware, staffMiddleware, userController.getById);

  // Admin only: tạo/sửa/xoá, thay đổi trạng thái, điểm, mật khẩu
  router.use(authMiddleware, adminMiddleware);
  router.post('/', userController.create);
  router.put('/:id', userController.update);
  router.delete('/:id', userController.delete);
  router.patch('/:id/status', userController.updateStatus);
  router.patch('/:id/points', userController.updatePoints);
  router.patch('/:id/password', userController.changePassword);

  return router;
};
