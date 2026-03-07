import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './infrastructure/database/connection';

// Repositories
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { ProductRepository } from './infrastructure/repositories/ProductRepository';
import { OrderRepository } from './infrastructure/repositories/OrderRepository';
import { CategoryRepository } from './infrastructure/repositories/CategoryRepository';
import { BrandRepository } from './infrastructure/repositories/BrandRepository';

// Use Cases
import { AuthUseCase } from './application/use-cases/AuthUseCase';
import { ProductUseCase } from './application/use-cases/ProductUseCase';
import { OrderUseCase } from './application/use-cases/OrderUseCase';
import { CategoryUseCase } from './application/use-cases/CategoryUseCase';
import { BrandUseCase } from './application/use-cases/BrandUseCase';

// Controllers
import { AuthController } from './presentation/controllers/AuthController';
import { ProductController } from './presentation/controllers/ProductController';
import { OrderController } from './presentation/controllers/OrderController';
import { CategoryController } from './presentation/controllers/CategoryController';
import { BrandController } from './presentation/controllers/BrandController';

// Routes
import { createAuthRoutes } from './presentation/routes/auth.routes';
import { createProductRoutes } from './presentation/routes/product.routes';
import { createOrderRoutes } from './presentation/routes/order.routes';
import { createBrandRoutes } from './presentation/routes/brand.routes';
import { createCategoryRoutes } from './presentation/routes/category.routes';

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
const categoryRepository = new CategoryRepository();
const brandRepository = new BrandRepository();

const authUseCase = new AuthUseCase(userRepository);
const productUseCase = new ProductUseCase(productRepository);
const orderUseCase = new OrderUseCase(orderRepository, productRepository);
const categoryUseCase = new CategoryUseCase(categoryRepository);
const brandUseCase = new BrandUseCase(brandRepository);

const authController = new AuthController(authUseCase);
const productController = new ProductController(productUseCase);
const orderController = new OrderController(orderUseCase);
const categoryController = new CategoryController(categoryUseCase);
const brandController = new BrandController(brandUseCase);

// Routes
app.use('/api/auth', createAuthRoutes(authController));
app.use('/api/products', createProductRoutes(productController));
app.use('/api/orders', createOrderRoutes(orderController));
app.use('/api/categories', createCategoryRoutes(categoryController));
app.use('/api/brands', createBrandRoutes(brandController));

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
