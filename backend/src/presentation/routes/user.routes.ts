import { Router } from "express";
import { UserController } from "../controllers/UserControllers";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.middleware";
import { uploadImage } from "../middlewares/upload.middleware";
import pool  from "../../infrastructure/database/connection";
import type { AuthRequest } from "../middlewares/auth.middleware";
import type { Response } from "express";

export const createUserRoutes = (userController: UserController) => {
  const router = Router();

  // ✅ Route upload avatar/banner — chỉ cần đăng nhập, KHÔNG cần admin
  router.post('/me/avatar', authMiddleware, uploadImage.single('image'), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'Không có file được upload' });
      const avatarUrl = `/images/avatars/${req.file.filename}`;
      await pool.execute('UPDATE users SET avatar_url = ? WHERE user_id = ?', [avatarUrl, req.user.userId]);
      return res.json({ avatarUrl });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.post('/me/banner', authMiddleware, uploadImage.single('image'), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'Không có file được upload' });
      const bannerUrl = `/images/banners/user/${req.file.filename}`;
      await pool.execute('UPDATE users SET banner_url = ? WHERE user_id = ?', [bannerUrl, req.user.userId]);
      return res.json({ bannerUrl });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ✅ Các route admin — áp dụng adminMiddleware từ đây trở xuống
  router.use(authMiddleware, adminMiddleware);
  router.get('/', userController.getAll);
  router.get('/stats', userController.getStats);
  router.get('/:id', userController.getById);
  router.post('/', userController.create);
  router.put('/:id', userController.update);
  router.delete('/:id', userController.delete);
  router.patch('/:id/status', userController.updateStatus);
  router.patch('/:id/points', userController.updatePoints);
  router.patch('/:id/password', userController.changePassword);

  return router;
};