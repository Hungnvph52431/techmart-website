# 🐳 TechMart Docker Setup - Quick Start

## ✅ Đã tạo các file Docker:

### Development Files:
- ✅ `backend/Dockerfile` - Backend container development
- ✅ `frontend/Dockerfile` - Frontend container development  
- ✅ `docker-compose.yml` - Docker Compose cho development
- ✅ `.dockerignore` files - Ignore unnecessary files

### Production Files:
- ✅ `backend/Dockerfile.prod` - Backend optimized build
- ✅ `frontend/Dockerfile.prod` - Frontend with Nginx
- ✅ `frontend/nginx.conf` - Nginx configuration
- ✅ `docker-compose.prod.yml` - Production stack
- ✅ `.env.docker` - Production environment template

### Documentation:
- ✅ `DOCKER.md` - Chi tiết Docker commands và troubleshooting
- ✅ `Makefile` - Shortcuts cho Docker commands
- ✅ Updated `README.md` - Docker instructions

## 🚀 Cách Sử Dụng:

### Bước 1: Khởi động Docker Desktop
Đảm bảo Docker Desktop đang chạy trên máy của bạn.

### Bước 2: Chạy Development Stack

**Cách 1: Sử dụng Makefile (Đơn giản nhất)**
```bash
make dev
```

**Cách 2: Sử dụng Docker Compose trực tiếp**
```bash
docker-compose up -d
```

**Cách 3: Xem logs trong khi start**
```bash
docker-compose up
```

### Bước 3: Truy cập Application

- 🌐 **Frontend**: http://localhost:5173
- 🔧 **Backend API**: http://localhost:5001/api
- 💾 **MySQL**: localhost:3306
  - Database: `techmart_db`
  - User: `techmart_user`
  - Password: `techmart123`

### Bước 4: Xem Logs

```bash
# Tất cả logs
docker-compose logs -f

# Hoặc sử dụng Makefile
make logs

# Logs của service cụ thể
make logs-backend
make logs-frontend
make logs-mysql
```

## 📊 Services trong Docker Stack:

1. **MySQL 8.0**
   - Port: 3306
   - Auto-import schema từ `backend/src/infrastructure/database/schema.sql`
   - Health check enabled
   - Persistent volume cho data

2. **Backend (Node.js + Express)**
   - Port: 5001
   - Hot reload enabled (code changes auto-reload)
   - Kết nối với MySQL container
   - JWT authentication configured

3. **Frontend (React + Vite)**
   - Port: 5173
   - Hot reload enabled
   - Proxy API requests tới backend
   - Tailwind CSS configured

## 📦 Dữ Liệu Mẫu:

Database đã được seed với dữ liệu mẫu:
- 👤 **Admin Account**: 
  - Email: `admin@techmart.com`
  - Password: `admin123`
- 📱 **12 Sản phẩm**: iPhone, Samsung, Xiaomi, OPPO, Vivo
- 🏷️ **5 Categories**: iPhone, Samsung, Xiaomi, OPPO, Vivo

## 🔧 Useful Commands:

```bash
# Xem trạng thái containers
make status
# hoặc
docker-compose ps

# Restart services
make restart

# Dừng services (giữ data)
make down

# Xóa toàn bộ và reset
make clean

# Rebuild containers sau khi thay đổi Dockerfile
make build

# Truy cập MySQL shell
make db-shell

# Backup database
make db-backup
```

## 🏗️ Architecture:

```
┌─────────────────────────────────────────┐
│         Docker Network Bridge           │
│  ┌───────────┐  ┌──────────┐ ┌────────┐│
│  │  MySQL    │  │ Backend  │ │Frontend││
│  │  :3306    │←─│  :5001   │←│ :5173  ││
│  └───────────┘  └──────────┘ └────────┘│
│                                         │
└─────────────────────────────────────────┘
        ↑           ↑            ↑
     Port 3306   Port 5001   Port 5173
        │           │            │
  ┌─────┴───────────┴────────────┴──────┐
  │         Host Machine (macOS)         │
  └──────────────────────────────────────┘
```

## 🎯 Benefits của Docker Setup:

✅ **Quick Setup**: Chỉ cần `make dev` để chạy toàn bộ stack
✅ **Consistent Environment**: Same trên mọi máy, mọi OS
✅ **Isolated**: Không conflict với services khác trên máy
✅ **Auto Database**: MySQL tự động tạo database và import schema
✅ **Hot Reload**: Code changes tự động reload
✅ **Production Ready**: Có sẵn production configuration với Nginx
✅ **Easy Cleanup**: `make clean` để xóa toàn bộ

## 📝 Next Steps:

1. ✅ Khởi động Docker Desktop
2. ✅ Chạy `make dev` hoặc `docker-compose up -d`
3. ✅ Truy cập http://localhost:5173
4. ✅ Test đăng nhập với admin account:
   - Email: `admin@techmart.com`
   - Password: `admin123`

## 🐛 Troubleshooting:

**Nếu gặp lỗi port đã được sử dụng:**
```bash
# Kiểm tra port nào đang bị chiếm
lsof -i :5001
lsof -i :5173
lsof -i :3306

# Kill process hoặc thay đổi ports trong docker-compose.yml
```

**Lưu ý về Port 5000:**
Port 5000 thường bị macOS ControlCenter sử dụng, do đó backend đã được cấu hình chạy trên port 5001 để tránh conflict.

**Nếu MySQL không kết nối được:**
```bash
# Chờ MySQL health check hoàn thành (khoảng 20-30s)
docker-compose logs mysql
```

**Xem chi tiết troubleshooting**: Đọc file `DOCKER.md`

## 📚 Documentation:

- **DOCKER.md**: Chi tiết về Docker setup, commands, troubleshooting
- **README.md**: Tổng quan project và installation
- **Makefile**: Shortcuts commands (chạy `make help`)

---

Giờ bạn đã sẵn sàng để chạy TechMart với Docker! 🚀
