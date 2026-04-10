import { IWishlistRepository } from '../../domain/repositories/IWishlistRepository';

export class WishlistUseCase {
  constructor(private wishlistRepository: IWishlistRepository) {}

  async getMyWishlistProductIds(userId: number): Promise<number[]> {
    return this.wishlistRepository.findProductIdsByUserId(userId);
  }

  async getMyWishlist(userId: number) {
    const [productIds, products] = await Promise.all([
      this.wishlistRepository.findProductIdsByUserId(userId),
      this.wishlistRepository.findProductsByUserId(userId),
    ]);

    return {
      productIds,
      products,
    };
  }

  async addToWishlist(userId: number, productId: number) {
    this.assertValidProductId(productId);

    const productExists = await this.wishlistRepository.productExists(productId);
    if (!productExists) {
      throw new Error('Sản phẩm không tồn tại');
    }

    await this.wishlistRepository.add(userId, productId);

    return {
      productId,
      isFavorite: true,
    };
  }

  async removeFromWishlist(userId: number, productId: number) {
    this.assertValidProductId(productId);

    await this.wishlistRepository.remove(userId, productId);

    return {
      productId,
      isFavorite: false,
    };
  }

  private assertValidProductId(productId: number) {
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error('Mã sản phẩm không hợp lệ');
    }
  }
}
