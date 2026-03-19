# TechMart - Website Bán Điện Thoại

Website thương mại điện tử bán điện thoại được xây dựng với React (Frontend) và Node.js + Express (Backend) sử dụng Clean Architecture.

## Kiến Trúc

### Backend - Clean Architecture
```
backend/
├── src/
│   ├── domain/              # Domain Layer
│   │   ├── entities/        # Business entities
│   │   └── repositories/    # Repository interfaces
│   ├── application/         # Application Layer
│   │   ├── use-cases/       # Business logic
│   │   ├── services/        # EmailService, etc.
│   │   └── mappers/         # Data mappers / presenters
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
│   ├── components/          # Shared components (Layout, Header, Footer)
│   ├── features/            # Feature modules
│   │   ├── products/        # Product listing & detail
│   │   ├── cart/            # Cart feature
│   │   ├── auth/            # Authentication
│   │   ├── orders/          # Orders (checkout, history, detail)
│   │   ├── admin/           # Admin dashboard & management
│   │   ├── payment/         # VNPay payment result
│   │   └── wallet/          # TechMart wallet
│   ├── pages/               # Static pages (FAQ, Policy...)
│   ├── services/            # API services
│   ├── store/               # State management (Zustand)
│   └── types/               # TypeScript types
```

## Công Nghệ Sử Dụng

### Backend
- **Node.js** + **Express** + **TypeScript**
- **MySQL 8.0** - Database
- **JWT** - Authentication
- **VNPay SDK** (`vnpay@2.4.4`) - Thanh toán online
- **Nodemailer** - Gửi email tự động
- **Multer** - Upload ảnh sản phẩm
- **Bcrypt** - Mã hóa mật khẩu

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router v6** - Routing
- **React Hook Form** + **Zod** - Form validation
- **Chart.js** - Biểu đồ dashboard
- **Axios** - HTTP client

## Yêu Cầu Hệ Thống

- **Docker** >= 20.x + Docker Compose >= 2.x (khuyến nghị)
- Hoặc: Node.js >= 18.x + MySQL >= 8.x

---

## Cài Đặt & Chạy Ứng Dụng

### 1. Clone Repository
```bash
git clone https://github.com/Hungnvph52431/techmart-website.git
cd techmart-website
```

### 2. Chạy bằng Docker (Khuyến nghị)
```bash
docker-compose up -d
```

Services sẽ chạy tại:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001
- MySQL: localhost:3306

### 3. Chạy thủ công
```bash
# Backend
cd backend
npm install
cp .env.example .env   # Sửa cấu hình trong .env
npm run dev             # http://localhost:5001

# Frontend
cd frontend
npm install
npm run dev             # http://localhost:5173
```

---

## Cấu Hình VNPay (Thanh toán online)

### Bước 1: Đăng ký VNPay Sandbox (Môi trường test)

1. Truy cập: https://sandbox.vnpayment.vn/devreg/
2. Điền thông tin đăng ký Merchant test:
   - **Tên doanh nghiệp**: TechMart (hoặc tên bất kỳ)
   - **Email**: email của bạn
   - **SĐT**: số điện thoại
   - **Website URL**: `http://localhost:5173`
3. Sau khi đăng ký, VNPay sẽ gửi email chứa:
   - **TMN Code** (Mã website): ví dụ `LGZKF5XY`
   - **Hash Secret** (Khóa bí mật): ví dụ `L25C1P0I1GSXW0TBC49HYQZ5QS95ZZA6`
4. Đăng nhập quản lý Merchant tại: https://sandbox.vnpayment.vn/merchantv2/

### Bước 2: Cài đặt Ngrok (Tạo domain public cho localhost)

VNPay cần gọi callback về server của bạn, nhưng `localhost` không thể truy cập từ internet. Ngrok tạo một URL public trỏ về localhost.

**Cài đặt Ngrok:**

```bash
# Windows (dùng Chocolatey)
choco install ngrok

# Hoặc tải trực tiếp tại: https://ngrok.com/download
# Giải nén và thêm vào PATH
```

**Đăng ký tài khoản Ngrok (miễn phí):**

1. Truy cập: https://dashboard.ngrok.com/signup
2. Đăng ký bằng Google/GitHub/Email
3. Sau khi đăng nhập, copy **Authtoken** tại: https://dashboard.ngrok.com/get-started/your-authtoken
4. Cấu hình authtoken:
```bash
ngrok config add-authtoken <YOUR_AUTH_TOKEN>
```

**Chạy Ngrok để tạo tunnel cho backend:**

```bash
# Tạo tunnel cho backend port 5001
ngrok http 5001
```

Ngrok sẽ hiển thị URL dạng:
```
Forwarding  https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:5001
```

**Lưu ý quan trọng:**
- URL miễn phí thay đổi mỗi lần restart ngrok
- Ngrok có plan trả phí với **static domain** (cố định URL): https://dashboard.ngrok.com/domains
- Nếu dùng static domain: `ngrok http --domain=your-domain.ngrok-free.app 5001`

### Bước 3: Cấu hình biến môi trường

Mở file `backend/.env` và cập nhật:

```env
# ══════════════════════════════════════════════
# VNPay Configuration
# ══════════════════════════════════════════════

# TMN Code - Lấy từ email VNPay sau khi đăng ký sandbox
VNPAY_TMN_CODE=YOUR_TMN_CODE

# Hash Secret - Lấy từ email VNPay
VNPAY_HASH_SECRET=YOUR_HASH_SECRET

# VNPay Return URL - URL VNPay redirect user về sau khi thanh toán
# Thay <ngrok-url> bằng URL ngrok của bạn
VNPAY_RETURN_URL=https://<ngrok-url>.ngrok-free.app/api/payment/vnpay/return

# Frontend URL - Để backend redirect về trang kết quả thanh toán
FRONTEND_URL=http://localhost:5173

# CORS - Thêm ngrok URL vào danh sách cho phép
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,https://<ngrok-url>.ngrok-free.app
```

### Bước 4: Tài khoản test thanh toán VNPay

Khi test thanh toán trên sandbox, sử dụng thông tin thẻ giả lập:

| Thông tin | Giá trị |
|---|---|
| **Ngân hàng** | NCB |
| **Số thẻ** | `9704198526191432198` |
| **Tên chủ thẻ** | `NGUYEN VAN A` |
| **Ngày phát hành** | `07/15` |
| **Mật khẩu OTP** | `123456` |

### Luồng thanh toán VNPay trong hệ thống

```
1. User chọn thanh toán VNPay → Frontend gọi POST /api/payment/vnpay/create
2. Backend tạo URL thanh toán VNPay → redirect user sang cổng VNPay
3. User nhập thông tin thẻ test → thanh toán
4. VNPay redirect về: GET /api/payment/vnpay/return?vnp_ResponseCode=00&...
5. Backend verify chữ ký → cập nhật trạng thái đơn hàng → redirect về Frontend
6. Frontend hiển thị kết quả tại /payment/result
```

---

## Cấu Hình SMTP Gmail (Gửi email tự động)

Hệ thống sử dụng Gmail SMTP để gửi email thông báo thanh toán thành công, xác nhận đơn hàng, v.v.

### Bước 1: Bật xác minh 2 bước cho Gmail

1. Truy cập: https://myaccount.google.com/security
2. Kéo xuống phần **"Cách bạn đăng nhập vào Google"**
3. Bật **"Xác minh 2 bước"** (2-Step Verification)
4. Làm theo hướng dẫn (xác nhận bằng SĐT)

### Bước 2: Tạo App Password

**Quan trọng: Phải bật xác minh 2 bước trước mới có mục này!**

1. Truy cập: https://myaccount.google.com/apppasswords
2. Tên ứng dụng: nhập `TechMart` (hoặc tên bất kỳ)
3. Nhấn **"Tạo"**
4. Google sẽ hiển thị mật khẩu ứng dụng 16 ký tự, ví dụ: `abcd efgh ijkl mnop`
5. **Copy mật khẩu này** (chỉ hiện 1 lần!)

### Bước 3: Cấu hình biến môi trường

Mở file `backend/.env` và cập nhật:

```env
# ══════════════════════════════════════════════
# Email SMTP Configuration (Gmail)
# ══════════════════════════════════════════════

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Gmail của bạn
SMTP_USER=youremail@gmail.com

# App Password từ bước 2 (KHÔNG phải mật khẩu Gmail!)
SMTP_PASS=abcd efgh ijkl mnop

# Tên hiển thị khi gửi email
SMTP_FROM_NAME=TechMart
```

### Email được gửi khi nào?

| Sự kiện | Nội dung email |
|---|---|
| Thanh toán VNPay thành công | Xác nhận đơn hàng + chi tiết sản phẩm + tổng tiền |
| Nạp ví TechMart thành công | Xác nhận nạp tiền + số dư mới |

---

## Tài Khoản Demo

### Admin
- Email: `admin@mobileshop.com`
- Password: `password`
- Truy cập: http://localhost:5173/admin

### Khách hàng
- Email: `customer1@gmail.com` / `customer2@gmail.com` / `customer3@gmail.com`
- Password: `password`

> Tất cả mật khẩu đã được mã hóa bằng bcrypt.

---

## Database

- **Database**: `mobile_shop` (MySQL 8.0)
- **Host**: `localhost` (hoặc `mysql` trong Docker)
- **Port**: `3306`
- **User**: `techmart_user` / Password: `techmart123`

Chi tiết schema: [backend/src/infrastructure/database/README.md](backend/src/infrastructure/database/README.md)

---

## Tính Năng

### Khách hàng
- Xem, tìm kiếm, lọc sản phẩm theo danh mục / thương hiệu / giá
- Chi tiết sản phẩm với biến thể (màu sắc, dung lượng, RAM)
- Giỏ hàng (Zustand + localStorage)
- Đặt hàng (COD / VNPay / Ví TechMart)
- Áp mã giảm giá (coupon/voucher)
- Quản lý đơn hàng (xem, hủy, xác nhận nhận hàng)
- Đánh giá sản phẩm sau khi nhận hàng
- Yêu cầu hoàn/trả hàng (upload ảnh bằng chứng)
- Ví TechMart (nạp tiền qua VNPay, thanh toán)
- Quản lý hồ sơ cá nhân, sổ địa chỉ

### Admin Dashboard
- Thống kê: doanh thu, đơn hàng, sản phẩm, khách hàng
- Biểu đồ doanh thu 7 ngày, biểu đồ trạng thái đơn
- Top sản phẩm bán chạy, cảnh báo tồn kho
- Quản lý: sản phẩm, đơn hàng, khách hàng, danh mục, thuộc tính
- Quản lý: mã giảm giá, banner, đánh giá, hoàn/trả hàng
- Sidebar thu gọn/mở rộng

---

## Docker Commands

```bash
docker-compose up -d              # Start tất cả services
docker-compose down               # Stop
docker-compose logs -f backend    # Xem logs backend
docker-compose restart backend    # Restart backend sau khi sửa code
docker-compose up -d --build      # Rebuild sau khi thay đổi code
```

## License

ISC
