import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './infrastructure/database/connection';

// Repositories
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { ProductRepository } from './infrastructure/repositories/ProductRepository';
import { OrderRepository } from './infrastructure/repositories/OrderRepository';
import { CategoryRepository } from './infrastructure/repositories/CategoryRepository';
import { AttributeRepository } from './infrastructure/repositories/AttributeRepository';

// Use Cases
import { AuthUseCase } from './application/use-cases/AuthUseCase';
import { ProductUseCase } from './application/use-cases/ProductUseCase';
import { OrderUseCase } from './application/use-cases/OrderUseCase';
import { UserUseCase } from './application/use-cases/UserUseCase';
import { CategoryUseCase } from './application/use-cases/CategoryUseCase';
import { AttributeUseCase } from './application/use-cases/AttributeUseCase';

// Controllers
import { AuthController } from './presentation/controllers/AuthController';
import { ProductController } from './presentation/controllers/ProductController';
import { AdminProductController } from './presentation/controllers/AdminProductController';
import { OrderController } from './presentation/controllers/OrderController';
import { UserController } from './presentation/controllers/UserControllers';
import { CategoryController } from './presentation/controllers/CategoryController';
import { AttributeController } from './presentation/controllers/AttributeController';

// Routes
import { createAuthRoutes } from './presentation/routes/auth.routes';
import { createProductRoutes } from './presentation/routes/product.routes';
import { createOrderRoutes } from './presentation/routes/order.routes';
import { createUserRoutes } from './presentation/routes/user.routes';
import { createCategoryRoutes } from './presentation/routes/category.routes';
import { createAdminProductRoutes } from './presentation/routes/admin/product.routes';
import { createAdminCategoryRoutes } from './presentation/routes/admin/category.routes';
import { createAdminAttributeRoutes } from './presentation/routes/admin/attribute.routes';

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
const attributeRepository = new AttributeRepository();

const authUseCase = new AuthUseCase(userRepository);
const productUseCase = new ProductUseCase(productRepository);
const orderUseCase = new OrderUseCase(orderRepository, productRepository);
const userUseCase = new UserUseCase(userRepository);
const categoryUseCase = new CategoryUseCase(categoryRepository);
const attributeUseCase = new AttributeUseCase(attributeRepository);

const authController = new AuthController(authUseCase);
const productController = new ProductController(productUseCase);
const adminProductController = new AdminProductController(productUseCase);
const orderController = new OrderController(orderUseCase);
const userController = new UserController(userUseCase);
const categoryController = new CategoryController(categoryUseCase);
const attributeController = new AttributeController(attributeUseCase);

// Routes
app.use('/api/auth', createAuthRoutes(authController));
app.use('/api/products', createProductRoutes(productController));
app.use('/api/categories', createCategoryRoutes(categoryController));
app.use('/api/orders', createOrderRoutes(orderController));
app.use('/api/users', createUserRoutes(userController));
app.use('/api/admin/products', createAdminProductRoutes(adminProductController));
app.use('/api/admin/categories', createAdminCategoryRoutes(categoryController));
app.use('/api/admin/attributes', createAdminAttributeRoutes(attributeController));

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
