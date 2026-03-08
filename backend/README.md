# Backend - TechMart API

## Structure

This backend follows Clean Architecture principles:

### Layers

1. **Domain Layer** (`src/domain/`)
   - Pure business logic
   - Entity definitions
   - Repository interfaces
   - No external dependencies

2. **Application Layer** (`src/application/`)
   - Use cases (business rules)
   - DTOs for data transfer
   - Orchestrates domain objects

3. **Infrastructure Layer** (`src/infrastructure/`)
   - Database connections
   - Repository implementations
   - External service integrations

4. **Presentation Layer** (`src/presentation/`)
   - HTTP controllers
   - Routes
   - Middleware
   - Request/Response handling

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=techmart_db
# DB_USER=root
# DB_PASSWORD=your_password

# Create database
mysql -u root -p < src/infrastructure/database/schema.sql

# Run development server
npm run dev
```

## API Routes

### Public Routes
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/slug/:slug` - Get product by slug

### Protected Routes (Require Authentication)
- `GET /api/auth/profile` - Get user profile
- `GET /api/orders/my-orders` - Get user orders
- `POST /api/orders` - Create order

### Admin Routes (Require Admin Role)
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/orders` - Get all orders
- `PATCH /api/orders/:id/status` - Update order status

## Development

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Run production server
```

## Database Schema

See `src/infrastructure/database/schema.sql` for the complete database schema.

### Main Tables
- `users` - User accounts
- `products` - Product catalog
- `categories` - Product categories
- `orders` - Customer orders

## Authentication

Uses JWT tokens for authentication. Include token in Authorization header:
```
Authorization: Bearer <token>
```
