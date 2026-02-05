# TechMart - Website Bán Điện Thoại

Website thương mại điện tử bán điện thoại được xây dựng với React (Frontend) và Node.js + Express (Backend) sử dụng Clean Architecture.

## 🏗️ Kiến Trúc

### Backend - Clean Architecture
```
backend/
├── src/
│   ├── domain/              # Domain Layer
│   │   ├── entities/        # Business entities
│   │   └── repositories/    # Repository interfaces
│   ├── application/         # Application Layer
│   │   ├── use-cases/       # Business logic
│   │   └── dtos/            # Data transfer objects
│   ├── infrastructure/      # Infrastructure Layer
│   │   ├── database/        # Database connection & schema
│   │   └── repositories/    # Repository implementations
│   └── presentation/        # Presentation Layer
│       ├── controllers/     # HTTP controllers
│       ├── routes/          # Route definitions
│       └── middlewares/     # Middleware functions
```

### Frontend - Feature-Based Architecture
```
frontend/
├── src/
│   ├── components/          # Shared components
│   │   ├── layout/          # Layout components
│   │   └── common/          # Common components
│   ├── features/            # Feature modules
│   │   ├── products/        # Product feature
│   │   ├── cart/            # Cart feature
│   │   ├── auth/            # Authentication
│   │   └── orders/          # Orders feature
│   ├── pages/               # Page components
│   ├── services/            # API services
│   ├── store/               # State management (Zustand)
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
```

## 🚀 Công Nghệ Sử Dụng

### Backend
- **Node.js** + **Express**: Web framework
- **TypeScript**: Type safety
- **MySQL**: Database
- **JWT**: Authentication
- **Bcrypt**: Password hashing

### Frontend
- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Zustand**: State management
- **React Router**: Routing
- **Axios**: HTTP client
- **React Hot Toast**: Notifications

## 📋 Yêu Cầu Hệ Thống

### Chạy với Docker (Khuyến nghị)
- Docker >= 20.x
- Docker Compose >= 2.x

### Chạy thủ công
- Node.js >= 18.x
- MySQL >= 8.x
- npm hoặc yarn

## ⚙️ Cài Đặt

### 1. Clone Repository
```bash
git clone <repository-url>
cd techmart-website
```

### 2. Cài Đặt Backend

```bash
cd backend

# Cài đặt dependencies
npm install

# Copy file .env
cp .env.example .env

# Cấu hình database trong file .env
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=techmart_db
# DB_USER=root
# DB_PASSWORD=your_password
```

### 3. Tạo Database

```bash
# Đăng nhập MySQL
mysql -u root -p

# Import schema
source src/infrastructure/database/schema.sql
```

### 4. Cài Đặt Frontend

```bash
cd ../frontend

# Cài đặt dependencies
npm install

# Copy file .env
cp .env.example .env
```

## 🎯 Chạy Ứng Dụng

### Cách 1: Docker (Khuyến nghị) 🐳

**Yêu cầu**: Docker và Docker Compose đã được cài đặt

#### Sử dụng Script Helper (Dễ nhất):
```bash
./start-docker.sh
# Script sẽ tự động:
# - Kiểm tra Docker có chạy không
# - Tự động khởi động Docker Desktop nếu cần
# - Start tất cả services
```

#### Hoặc sử dụng Makefile:
```bash
make dev
```

#### Hoặc Docker Compose trực tiếp:
```bash
# Khởi động toàn bộ stack (MySQL + Backend + Frontend)
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng các services
docker-compose down

# Dừng và xóa volumes (xóa database)
docker-compose down -v
```

**Các services sẽ chạy tại:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001
- MySQL: localhost:3306

> **Lưu ý**: Backend chạy ở port 5001 thay vì 5000 để tránh conflict với macOS ControlCenter.

### Cách 2: Chạy Thủ Công

#### Chạy Backend
```bash
cd backend
npm run dev
# Server chạy tại: http://localhost:5001
```

#### Chạy Frontend
```bash
cd frontend
npm run dev
# App chạy tại: http://localhost:5173
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/profile` - Lấy thông tin user (cần token)

### Products
- `GET /api/products` - Lấy danh sách sản phẩm
- `GET /api/products/:id` - Lấy chi tiết sản phẩm
- `GET /api/products/slug/:slug` - Lấy sản phẩm theo slug
- `POST /api/products` - Tạo sản phẩm (admin)
- `PUT /api/products/:id` - Cập nhật sản phẩm (admin)
- `DELETE /api/products/:id` - Xóa sản phẩm (admin)

### Orders
- `GET /api/orders` - Lấy tất cả đơn hàng (admin)
- `GET /api/orders/my-orders` - Lấy đơn hàng của user
- `GET /api/orders/:id` - Lấy chi tiết đơn hàng
- `POST /api/orders` - Tạo đơn hàng
- `PATCH /api/orders/:id/status` - Cập nhật trạng thái đơn (admin)

## 💾 Database

**Database**: `mobile_shop` (MySQL 8.0)

**Cấu trúc**: 23 bảng đầy đủ cho hệ thống Mobile Shop chuyên nghiệp

**Đọc thêm**: [backend/src/infrastructure/database/README.md](backend/src/infrastructure/database/README.md)

### Thông tin kết nối:
- Host: `localhost` (hoặc `mysql` trong Docker network)
- Port: `3306`
- Database: `mobile_shop`
- User: `techmart_user`
- Password: `techmart123`

**Dữ liệu hiện có**:
- 👤 Users: 6 (admin, staff, warehouse, 3 customers)
- 📱 Products: 15 sản phẩm
- 🏷️ Brands: 10 thương hiệu
- 📋 Categories: 13 danh mục
- 📦 Orders: 5 đơn hàng mẫu
- ⭐ Reviews: 4 đánh giá
- 🎫 Coupons: 4 mã giảm giá
- 🖼️ Product Variants: 12 biến thể

## �🔑 Tài Khoản Demo

### Admin
- Email: `admin@mobileshop.com`
- Password: `password`

### Staff  
- Email: `staff@mobileshop.com`
- Password: `password`

### Warehouse
- Email: `warehouse@mobileshop.com`
- Password: `password`

### Customers
- Email: `customer1@gmail.com` / `customer2@gmail.com` / `customer3@gmail.com`
- Password: `password` (cho tất cả)

> **Lưu ý**: Tất cả mật khẩu đã được mã hóa bằng bcrypt trong database.

## 📦 Dữ Liệu Mẫu

Database đã được seed với dữ liệu mẫu đầy đủ khi chạy Docker:
- 👤 **6 Users**: 1 admin, 1 staff, 1 warehouse, 3 customers
- 📱 **15 Sản phẩm**: 
  - 3 iPhone (15 Pro Max, 14 Pro, 13)
  - 3 Samsung (S24 Ultra, Z Fold5, A54 5G)
  - 2 Xiaomi (14, Redmi Note 13 Pro)
  - 2 OPPO (Find N3, Reno11 F 5G)
  - 2 Vivo (V29e 5G, Y100)
  - 3 Phụ kiện (Laptop Dell XPS 13, MacBook Pro M3, iPad Pro)
- 🏷️ **10 Brands**: Apple, Samsung, Xiaomi, OPPO, Vivo, Nokia, Realme, OnePlus, Dell, Asus
- 📋 **13 Categories**: Điện thoại, Laptop, Tablet, Phụ kiện, và các danh mục con
- 📦 **5 Orders**: Đơn hàng mẫu với đầy đủ thông tin
- ⭐ **4 Reviews**: Đánh giá sản phẩm
- 🎫 **4 Coupons**: Mã giảm giá còn hiệu lực
- 🖼️ **12 Product Variants**: Biến thể sản phẩm (màu sắc, dung lượng)

## 🎨 Tính Năng

### Khách hàng
- ✅ Xem danh sách sản phẩm
- ✅ Tìm kiếm và lọc sản phẩm
- ✅ Xem chi tiết sản phẩm
- ✅ Thêm vào giỏ hàng
- ✅ Quản lý giỏ hàng
- ✅ Đăng ký/Đăng nhập
- ✅ Đặt hàng
- ✅ Xem lịch sử đơn hàng

### Admin
- ✅ Quản lý sản phẩm (CRUD)
- ✅ Quản lý đơn hàng
- ✅ Quản lý người dùng
- ✅ Xem thống kê

## 🔧 Docker Commands

```bash
# Development
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f [service]  # View logs
docker-compose restart [service]  # Restart service
docker-compose ps                 # List running services

# Production
docker-compose -f docker-compose.prod.yml up -d    # Start production
docker-compose -f docker-compose.prod.yml down     # Stop production

# Rebuild services after code changes
docker-compose up -d --build
```

## 🔧 NPM Scripts

### Backend
```bash
npm run dev      # Chạy development server
npm run build    # Build production
npm start        # Chạy production server
```

### Frontend
```bash
npm run dev      # Chạy development server
npm run build    # Build production
npm run preview  # Preview production build
```

## 📦 Build Production

### Cách 1: Docker (Khuyến nghị)
```bash
# Build và chạy production với Docker
docker-compose -f docker-compose.prod.yml up -d --build
```

### Cách 2: Build Thủ Công

#### Backend
```bash
cd backend
npm run build
npm start
```

#### Frontend
```bash
cd frontend
npm run build
# Files build sẽ ở trong thư mục dist/
```

## 🤝 Đóng Góp

Mọi đóng góp đều được chào đón! Vui lòng tạo Pull Request hoặc Issue.

## 📄 License

ISC

## 📞 Liên Hệ

Email: support@techmart.com
