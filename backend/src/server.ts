import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './infrastructure/database/connection';

// Repositories
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { ProductRepository } from './infrastructure/repositories/ProductRepository';
import { OrderRepository } from './infrastructure/repositories/OrderRepository';
import { VoucherRepository } from './infrastructure/repositories/VoucherRepository';
// Use Cases
import { AuthUseCase } from './application/use-cases/AuthUseCase';
import { ProductUseCase } from './application/use-cases/ProductUseCase';
import { OrderUseCase } from './application/use-cases/OrderUseCase';
import { UserUseCase } from './application/use-cases/UserUseCase';
import { VoucherUseCase } from './application/use-cases/VoucherUseCase';
// Controllers
import { AuthController } from './presentation/controllers/AuthController';
import { ProductController } from './presentation/controllers/ProductController';
import { OrderController } from './presentation/controllers/OrderController';
import { UserController } from './presentation/controllers/UserControllers';
import { VoucherController } from './presentation/controllers/VoucherController';
// Routes
import { createAuthRoutes } from './presentation/routes/auth.routes';
import { createProductRoutes } from './presentation/routes/product.routes';
import { createOrderRoutes } from './presentation/routes/order.routes';
import { createUserRoutes } from './presentation/routes/user.routes';
import { createVoucherRoutes } from './presentation/routes/voucherRoutes';
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dependency Injection
const userRepository = new UserRepository();
const productRepository = new ProductRepository();
const orderRepository = new OrderRepository();
const voucherRepo = new VoucherRepository();

const authUseCase = new AuthUseCase(userRepository);
const productUseCase = new ProductUseCase(productRepository);
const orderUseCase = new OrderUseCase(orderRepository, productRepository);
const userUseCase = new UserUseCase(userRepository);
const voucherUseCase = new VoucherUseCase(voucherRepo);

const authController = new AuthController(authUseCase);
const productController = new ProductController(productUseCase);
const orderController = new OrderController(orderUseCase);
const userController = new UserController(userUseCase);
const voucherController = new VoucherController(voucherUseCase);

// Routes
app.use('/api/auth', createAuthRoutes(authController));
app.use('/api/products', createProductRoutes(productController));
app.use('/api/orders', createOrderRoutes(orderController));
app.use('/api/users', createUserRoutes(userController));
app.use('/api/coupons', createVoucherRoutes(voucherController));
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'TechMart API is running' });
});

// Start server
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
