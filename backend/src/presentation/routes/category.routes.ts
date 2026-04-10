import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
// Lấy middleware bảo mật từ bản của Tuấn Anh
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createCategoryRoutes = (categoryController: CategoryController) => {
  const router = Router();

  // --- 1. ROUTES CÔNG KHAI (STOREFRONT) ---

  router.get('/', categoryController.getAll);

  // LƯU Ý: Phải đặt đường dẫn '/tree' TRƯỚC '/:id' để tránh bị bắt nhầm tham số
  router.get('/tree', categoryController.getTree);

  router.get('/deleted', categoryController.getDeleted);

  // Lấy chi tiết danh mục theo ID
  router.get('/:id', categoryController.getById);


  // --- 2. ROUTES QUẢN TRỊ (ADMIN) ---
  // Các route này yêu cầu quyền Admin từ bản của Tuấn Anh

  router.post(
    '/',
    authMiddleware,
    adminMiddleware,
    categoryController.create
  );

  router.put(
    '/:id',
    authMiddleware,
    adminMiddleware,
    categoryController.update
  );

  router.delete(
    '/:id',
    authMiddleware,
    adminMiddleware,
    categoryController.delete
  );

  return router;
};
