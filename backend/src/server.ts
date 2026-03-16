import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './infrastructure/database/connection';

// --- REPOSITORIES ---
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { ProductRepository } from './infrastructure/repositories/ProductRepository';
import { OrderRepository } from './infrastructure/repositories/OrderRepository';
import { VoucherRepository } from './infrastructure/repositories/VoucherRepository'; //
import { CategoryRepository } from './infrastructure/repositories/CategoryRepository'; 
import { AttributeRepository } from './infrastructure/repositories/AttributeRepository'; //
import { ReviewRepository } from './infrastructure/repositories/ReviewRepository'; //
import { BrandRepository } from './infrastructure/repositories/BrandRepository'; //
import { CouponRepository } from './infrastructure/repositories/CouponRepository'; //
import { BannerRepository } from './infrastructure/repositories/BannerRepository';

// --- USE CASES ---
import { AuthUseCase } from './application/use-cases/AuthUseCase';
import { ProductUseCase } from './application/use-cases/ProductUseCase';
import { OrderUseCase } from './application/use-cases/OrderUseCase';
import { UserUseCase } from './application/use-cases/UserUseCase';
import { VoucherUseCase } from './application/use-cases/VoucherUseCase';
import { CategoryUseCase } from './application/use-cases/CategoryUseCase';
import { AttributeUseCase } from './application/use-cases/AttributeUseCase';
import { ReviewUseCase } from './application/use-cases/ReviewUseCase';
import { BrandUseCase } from './application/use-cases/BrandUseCase'; //
import { CouponUseCase } from './application/use-cases/CouponUseCase'; //
import { BannerUseCase } from './application/use-cases/BannerUseCase';

// --- CONTROLLERS ---
import { AuthController } from './presentation/controllers/AuthController';
import { ProductController } from './presentation/controllers/ProductController';
import { AdminProductController } from './presentation/controllers/AdminProductController';
import { OrderController } from './presentation/controllers/OrderController';
import { AdminOrderController } from './presentation/controllers/AdminOrderController';
import { UserController } from './presentation/controllers/UserControllers';
import { VoucherController } from './presentation/controllers/VoucherController';
import { CategoryController } from './presentation/controllers/CategoryController';
import { AttributeController } from './presentation/controllers/AttributeController';
import { ReviewController } from './presentation/controllers/ReviewController';
import { BrandController } from './presentation/controllers/BrandController'; //
import { CouponController } from './presentation/controllers/CouponController'; //
import { BannerController } from './presentation/controllers/BannerController';

// --- ROUTES ---
import { createAuthRoutes } from './presentation/routes/auth.routes';
import { createProductRoutes } from './presentation/routes/product.routes';
import { createOrderRoutes } from './presentation/routes/order.routes';
import { createUserRoutes } from './presentation/routes/user.routes';
import { createVoucherRoutes } from './presentation/routes/voucherRoutes';
import { createCategoryRoutes } from './presentation/routes/category.routes';
import { createAdminProductRoutes } from './presentation/routes/admin/product.routes';
import { createAdminCategoryRoutes } from './presentation/routes/admin/category.routes';
import { createAdminAttributeRoutes } from './presentation/routes/admin/attribute.routes';
import { createAdminOrderRoutes } from './presentation/routes/admin/order.routes';
import { createOrderReviewRoutes } from './presentation/routes/order-review.routes';
import { createBrandRoutes } from './presentation/routes/brand.routes'; //
import { createCouponRoutes } from './presentation/routes/coupon.routes'; //
import { createBannerRoutes, createAdminBannerRoutes } from './presentation/routes/banner.routes';
import path from 'path';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));


// Logger "tự chế" của Khanh để soi Log Docker
app.use((req, _res, next) => {
  console.log(`>>> [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// --- DEPENDENCY INJECTION ---
// Repositories
const userRepository = new UserRepository();
const productRepository = new ProductRepository();
const orderRepository = new OrderRepository();
const voucherRepo = new VoucherRepository();
const categoryRepository = new CategoryRepository();
const attributeRepository = new AttributeRepository();
const reviewRepository = new ReviewRepository();
const brandRepository = new BrandRepository(); //
const couponRepository = new CouponRepository(); //
const bannerRepository = new BannerRepository(); // db là pool MySQL của bạn

// Use Cases
const authUseCase = new AuthUseCase(userRepository);
const productUseCase = new ProductUseCase(productRepository);
const orderUseCase = new OrderUseCase(orderRepository, productRepository);
const userUseCase = new UserUseCase(userRepository);
const voucherUseCase = new VoucherUseCase(voucherRepo);
const categoryUseCase = new CategoryUseCase(categoryRepository);
const attributeUseCase = new AttributeUseCase(attributeRepository);
const reviewUseCase = new ReviewUseCase(reviewRepository, orderRepository);
const brandUseCase = new BrandUseCase(brandRepository); //
const couponUseCase = new CouponUseCase(couponRepository); //
const bannerUseCase = new BannerUseCase(bannerRepository);

// Controllers
const authController = new AuthController(authUseCase);
const productController = new ProductController(productUseCase);
const adminProductController = new AdminProductController(productUseCase);
const orderController = new OrderController(orderUseCase);
const adminOrderController = new AdminOrderController(orderUseCase);
const userController = new UserController(userUseCase);
const voucherController = new VoucherController(voucherUseCase);
const categoryController = new CategoryController(categoryUseCase);
const attributeController = new AttributeController(attributeUseCase);
const reviewController = new ReviewController(reviewUseCase);
const brandController = new BrandController(brandUseCase); //
const couponController = new CouponController(couponUseCase); //
const bannerController = new BannerController(bannerUseCase);

// --- ROUTES MOUNTING ---
// Public & Customer Routes
app.use('/api/auth', createAuthRoutes(authController));
app.use('/api/products', createProductRoutes(productController));
app.use('/api/categories', createCategoryRoutes(categoryController));
app.use('/api/orders', createOrderRoutes(orderController));
app.use('/api/orders', createOrderReviewRoutes(reviewController));
app.use('/api/users', createUserRoutes(userController));
app.use('/api/vouchers', createVoucherRoutes(voucherController));
app.use('/api/brands', createBrandRoutes(brandController)); //
app.use('/api/coupons', createCouponRoutes(couponController)); //
app.use('/api/banners', createBannerRoutes(bannerController));

// Admin Routes
app.use('/api/admin/products', createAdminProductRoutes(adminProductController));
app.use('/api/admin/categories', createAdminCategoryRoutes(categoryController));
app.use('/api/admin/attributes', createAdminAttributeRoutes(attributeController));
app.use('/api/admin/orders', createAdminOrderRoutes(adminOrderController));
app.use('/api/admin/banners', createAdminBannerRoutes(bannerController));

// --- HEALTH CHECK ---
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', message: 'TechMart API is running' });
});

// --- START SERVER ---
const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;