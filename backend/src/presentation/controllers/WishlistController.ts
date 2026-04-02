import { Response } from 'express';
import { WishlistUseCase } from '../../application/use-cases/WishlistUseCase';
import { AuthRequest } from '../middlewares/auth.middleware';

export class WishlistController {
  constructor(private wishlistUseCase: WishlistUseCase) {}

  getMyWishlist = async (req: AuthRequest, res: Response) => {
    try {
      const wishlist = await this.wishlistUseCase.getMyWishlist(
        req.user.userId
      );

      res.json(wishlist);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Không thể tải danh sách yêu thích' });
    }
  };

  addToWishlist = async (req: AuthRequest, res: Response) => {
    try {
      const productId = Number(req.body.productId);
      const result = await this.wishlistUseCase.addToWishlist(req.user.userId, productId);

      res.status(201).json(result);
    } catch (error: any) {
      this.respondWithError(res, error);
    }
  };

  removeFromWishlist = async (req: AuthRequest, res: Response) => {
    try {
      const productId = Number(req.params.productId);
      const result = await this.wishlistUseCase.removeFromWishlist(
        req.user.userId,
        productId
      );

      res.json(result);
    } catch (error: any) {
      this.respondWithError(res, error);
    }
  };

  private respondWithError(res: Response, error: any) {
    const message = error?.message || 'Không thể cập nhật danh sách yêu thích';

    if (message === 'Mã sản phẩm không hợp lệ') {
      return res.status(400).json({ message });
    }

    if (message === 'Sản phẩm không tồn tại') {
      return res.status(404).json({ message });
    }

    return res.status(500).json({ message });
  }
}
