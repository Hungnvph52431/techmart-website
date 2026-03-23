import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createProductRoutes = (productController: ProductController) => {
  const router = Router();
 router.get(
    '/stats',
    authMiddleware,
    adminMiddleware,
    productController.getStats
  );

  // Validate giỏ hàng — kiểm tra trạng thái & tồn kho SP
  router.post('/validate-cart', productController.validateCart);

  // --- 1. ROUTES CÔNG KHAI (STOREFRONT) ---
  router.get('/', productController.getAll);
  router.get('/slug/:slug', productController.getBySlug);
  router.get('/:id', productController.getById);

  // --- 2. ROUTES QUẢN LÝ ẢNH (BỔ SUNG TỪ TUẤN ANH) ---
  router.get('/:id/images', productController.getImages);
  router.post('/:id/images', authMiddleware, adminMiddleware, productController.addImage);
  router.delete('/:id/images/:imageId', authMiddleware, adminMiddleware, productController.deleteImage);

  // --- 3. ROUTES QUẢN LÝ BIẾN THỂ (BỔ SUNG TỪ TUẤN ANH) ---
  router.get('/:id/variants', productController.getVariants);
  router.post('/:id/variants', authMiddleware, adminMiddleware, productController.addVariant);
  router.put('/:id/variants/:variantId', authMiddleware, adminMiddleware, productController.updateVariant);
  router.delete('/:id/variants/:variantId', authMiddleware, adminMiddleware, productController.deleteVariant);

  // --- 4. ROUTES QUẢN TRỊ (ADMIN CRUD & STATS) ---

  // Lưu ý quan trọng: /stats phải đặt TRƯỚC các route có :id để không bị bắt nhầm tham số


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
