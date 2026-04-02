import { Router, Request, Response } from 'express';
import { AdminProductController } from '../../controllers/AdminProductController';
import { adminMiddleware, authMiddleware, warehouseMiddleware } from '../../middlewares/auth.middleware';
import { uploadImage } from '../../middlewares/upload.middleware';
export const createAdminProductRoutes = (
  adminProductController: AdminProductController
) => {
  const router = Router();
  router.use(authMiddleware);

  // Admin + Warehouse: xem và quản lý sản phẩm/tồn kho
  router.get('/', warehouseMiddleware, adminProductController.getAll);
  router.get('/:id', warehouseMiddleware, adminProductController.getById);
  router.post('/', warehouseMiddleware, adminProductController.create);
  router.put('/:id', warehouseMiddleware, adminProductController.update);
  router.patch('/:id/archive', warehouseMiddleware, adminProductController.archive);

  // ✅ Upload ảnh sản phẩm — trả về URL để dùng trong form
  router.post('/upload/image', uploadImage.single('image'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Không có file được upload' });
      }
      const imageUrl = `/images/products/${req.file.filename}`;
      return res.json({ imageUrl });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  return router;
};