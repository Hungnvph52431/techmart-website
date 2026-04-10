import { Router } from 'express';
import { WishlistController } from '../controllers/WishlistController';
import { authMiddleware } from '../middlewares/auth.middleware';

export const createWishlistRoutes = (wishlistController: WishlistController) => {
  const router = Router();

  router.use(authMiddleware);

  router.get('/', wishlistController.getMyWishlist);
  router.post('/', wishlistController.addToWishlist);
  router.delete('/:productId', wishlistController.removeFromWishlist);

  return router;
};
