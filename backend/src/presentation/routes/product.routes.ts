import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createProductRoutes = (productController: ProductController) => {
  const router = Router();

  

  // --- 2. ROUTES QUẢN TRỊ (ADMIN) ---
  // Lưu ý: /stats phải đặt trước các route có :id để không bị bắt nhầm tham số
  router.get(
    '/stats', 
    authMiddleware, 
    adminMiddleware, 
    productController.getStats
  );
// --- 1. ROUTES CÔNG KHAI (STOREFRONT) ---
  router.get('/', productController.getAll);
  router.get('/:id', productController.getById);
  router.get('/slug/:slug', productController.getBySlug);
  router.post(
    '/', 
    authMiddleware, 
    adminMiddleware, 
    productController.create
  );

  router.put(
    '/:id', 
    authMiddleware, 
    adminMiddleware, 
    productController.update
  );

  router.delete(
    '/:id', 
    authMiddleware, 
    adminMiddleware, 
    productController.delete
  );

  return router;
};