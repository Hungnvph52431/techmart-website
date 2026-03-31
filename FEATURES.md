# TechMart - Tài liệu tính năng đầy đủ

> Website thương mại điện tử chuyên bán điện thoại & phụ kiện công nghệ.
> Stack: React + TypeScript (Frontend) | Node.js + Express + MySQL (Backend)

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Tính năng khách hàng (Customer)](#2-tính-năng-khách-hàng)
3. [Tính năng quản trị (Admin)](#3-tính-năng-quản-trị)
4. [Luồng đơn hàng](#4-luồng-đơn-hàng)
5. [Hệ thống thanh toán](#5-hệ-thống-thanh-toán)
6. [API Endpoints](#6-api-endpoints)
7. [Cơ sở dữ liệu](#7-cơ-sở-dữ-liệu)
8. [Hướng dẫn cài đặt & chạy Docker](#8-hướng-dẫn-cài-đặt--chạy-docker)

---

## 1. Tổng quan hệ thống

### Kiến trúc
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand (state management)
- **Backend**: Node.js, Express, TypeScript, MySQL 8.0
- **Thanh toán**: VNPay Sandbox, Ví TechMart
- **Email**: Nodemailer (Gmail SMTP)
- **Deploy**: Docker Compose (dev + production)

### Vai trò người dùng
| Vai trò | Mô tả |
|---------|--------|
| `customer` | Khách hàng (mặc định khi đăng ký) |
| `admin` | Quản trị viên - toàn quyền |
| `staff` | Nhân viên (dự phòng) |
| `warehouse` | Quản lý kho (dự phòng) |

---

## 2. Tính năng khách hàng

### 2.1 Trang chủ (`/`)
- Banner slider quảng cáo (tự động xoay)
- Sản phẩm nổi bật, bán chạy, mới nhất
- Săn deal giá sốc (sản phẩm đang giảm giá)
- Danh mục sản phẩm
- Thương hiệu nổi bật

### 2.2 Sản phẩm

#### Danh sách sản phẩm (`/products`)
- Tìm kiếm theo tên sản phẩm
- Lọc theo:
  - Danh mục (Điện thoại, Tablet, ...)
  - Thương hiệu (Apple, Samsung, ...)
  - Khoảng giá (min - max)
  - RAM, Dung lượng, Chip, Tính năng
- Sắp xếp: Giá tăng/giảm, Mới nhất, Đánh giá cao
- Phân trang (12 sản phẩm/trang)

#### Chi tiết sản phẩm (`/products/:slug`)
- Gallery ảnh sản phẩm (nhiều ảnh, zoom)
- Thông tin: Tên, giá gốc, giá sale, % giảm
- Chọn biến thể: Màu sắc, Dung lượng (128GB, 256GB, ...)
- Số lượng tồn kho theo biến thể
- Thông số kỹ thuật (RAM, chip, pin, màn hình, ...)
- Đánh giá & bình luận từ người mua
- Sản phẩm liên quan
- Nút "Thêm vào giỏ" / "Mua ngay"

#### Modal chọn biến thể (VariantPickerModal)
- Khi bấm "Thêm vào giỏ" từ trang chủ/danh sách → hiện popup
- Chọn màu sắc + dung lượng
- Chọn số lượng
- Hiển thị giá thay đổi theo biến thể
- Tự động fetch chi tiết sản phẩm (variants) từ API

### 2.3 Giỏ hàng (`/cart`)
- Xem danh sách sản phẩm trong giỏ
- Mỗi biến thể hiển thị riêng biệt (VD: iPhone 14 Pro 128GB và 256GB là 2 dòng khác nhau)
- Hiển thị: Tên biến thể, giá riêng, tồn kho riêng
- Chọn/bỏ chọn từng sản phẩm hoặc tất cả
- Tăng/giảm số lượng (giới hạn theo tồn kho)
- Xoá sản phẩm khỏi giỏ
- Tóm tắt đơn hàng: Tạm tính, phí vận chuyển, tổng cộng
- Dữ liệu lưu localStorage (giữ khi tắt trình duyệt)

### 2.4 Thanh toán (`/checkout`)
- Chọn/thêm địa chỉ giao hàng
- Áp mã giảm giá (coupon/voucher)
- Chọn phương thức thanh toán:
  - **COD** - Thanh toán khi nhận hàng
  - **Ví TechMart** - Trừ số dư ví
  - **VNPay** - Thanh toán qua cổng VNPay
- Xem tóm tắt đơn hàng trước khi đặt
- Xác nhận đặt hàng

### 2.5 Quản lý đơn hàng (`/orders`)
- Xem danh sách đơn hàng theo trạng thái:
  - Tất cả | Chờ xử lý | Đã xác nhận | Đang giao | Đã giao | Hoàn thành | Đã huỷ | Hoàn trả
- Thống kê số đơn theo từng trạng thái

#### Chi tiết đơn hàng (`/orders/:id`)
- Thông tin đầy đủ: Sản phẩm, số lượng, giá, biến thể
- Địa chỉ giao hàng
- Phương thức & trạng thái thanh toán (highlight màu)
- Timeline trạng thái đơn hàng
- Các thao tác:
  - **Xác nhận đã nhận hàng** (khi đơn ở trạng thái "Đã giao")
  - **Huỷ đơn** (khi đơn chưa giao)
  - **Yêu cầu hoàn trả** (trong 7 ngày sau khi nhận)
  - **Viết đánh giá** (khi đơn delivered/completed)

### 2.6 Yêu cầu hoàn trả
- Chọn lý do hoàn trả
- Upload ảnh bằng chứng (tối đa 5 ảnh)
- Mô tả chi tiết vấn đề
- Theo dõi trạng thái: Đã yêu cầu → Đã duyệt → Đã nhận hàng → Đã hoàn tiền → Đóng

### 2.7 Đánh giá sản phẩm
- Chấm sao (1-5 sao)
- Viết nhận xét
- Upload ảnh đánh giá
- Chỉ đánh giá được khi đã mua & nhận hàng
- Badge "Đã mua hàng" (verified purchase)

### 2.8 Tài khoản & Hồ sơ (`/profile`)
- Xem/sửa thông tin cá nhân: Tên, email, SĐT
- Upload ảnh đại diện
- Quản lý địa chỉ giao hàng:
  - Thêm/sửa/xoá địa chỉ
  - Chọn Tỉnh/Quận/Phường (API địa chỉ Việt Nam)
  - Đặt địa chỉ mặc định
- Xem cấp thành viên: Đồng, Bạc, Vàng, Kim cương

### 2.9 Ví TechMart (`/wallet`)
- Xem số dư ví
- Nạp tiền qua VNPay (chọn nhanh: 50K, 100K, 200K, 500K, 1M, 2M)
- Lịch sử giao dịch:
  - Nạp ví | Thanh toán | Hoàn tiền | Điều chỉnh
  - Thời gian, số tiền, trạng thái

### 2.10 Đăng ký / Đăng nhập
- **Đăng ký** (`/register`): Email, mật khẩu, họ tên, SĐT
- **Đăng nhập** (`/login`): Email + mật khẩu → JWT token
- Tự động chuyển hướng admin/customer theo vai trò

### 2.11 Trang thông tin
| Trang | Đường dẫn | Nội dung |
|-------|-----------|----------|
| Giới thiệu | `/about` | Thông tin công ty, FAQ |
| Liên hệ | `/contact` | Form liên hệ, feedback |
| Chính sách bảo hành | `/policy` | Điều kiện bảo hành |
| Chính sách vận chuyển | `/shipping` | Phí ship, thời gian giao |
| Chính sách đổi trả | `/return` | Điều kiện đổi trả 7 ngày |
| Phương thức thanh toán | `/payment` | Hướng dẫn thanh toán |
| Câu hỏi thường gặp | `/faq` | FAQ đặt hàng, ship, trả hàng |

---

## 3. Tính năng quản trị

### 3.1 Dashboard (`/admin`)
- Thống kê tổng quan:
  - Tổng đơn hàng, tổng người dùng, tổng sản phẩm, tổng doanh thu
- Biểu đồ:
  - Donut chart: Phân bố trạng thái đơn hàng
  - Line chart: Xu hướng doanh thu
  - Bar chart: Xu hướng đơn hàng
- Cảnh báo sản phẩm sắp hết hàng
- Đơn hàng gần đây
- Top khách hàng & sản phẩm bán chạy

### 3.2 Quản lý sản phẩm (`/admin/products`)
- Danh sách sản phẩm: Tìm kiếm, lọc theo danh mục/trạng thái
- Trạng thái: Đang bán | Ngừng bán | Hết hàng | Đặt trước

#### Thêm/Sửa sản phẩm (`/admin/products/new`, `/admin/products/edit/:id`)
- Thông tin cơ bản: Tên, slug (tự sinh), mô tả
- Danh mục & thương hiệu
- Giá: Giá gốc, giá sale, giá vốn
- Tồn kho
- Thông số kỹ thuật (RAM, chip, màn hình, pin, ...)
- Upload nhiều ảnh sản phẩm
- Quản lý biến thể (màu, dung lượng, giá chênh lệch, tồn kho riêng)
- Thuộc tính sản phẩm
- SEO: Meta title, description, keywords
- Đánh dấu: Nổi bật, Mới, Bán chạy

### 3.3 Quản lý danh mục (`/admin/categories`)
- Cây danh mục phân cấp (cha - con)
- Thêm/sửa/xoá danh mục
- Kéo thả sắp xếp thứ tự
- Trường: Tên, slug, mô tả, ảnh, trạng thái

### 3.4 Quản lý thương hiệu (`/admin/brands`)
- Thêm/sửa/xoá thương hiệu
- Trường: Tên, slug, mô tả, trạng thái

### 3.5 Quản lý thuộc tính (`/admin/attributes`)
- Tạo thuộc tính sản phẩm (RAM, Màu sắc, Dung lượng, ...)
- Loại input: Text, Number, Boolean, Select, Multi-select, Color
- Phạm vi: Product-level hoặc Variant-level
- Gán thuộc tính vào danh mục
- Đánh dấu: Bắt buộc, Có thể lọc, Là trục biến thể

### 3.6 Quản lý đơn hàng (`/admin/orders`)
- Danh sách đơn: Tìm kiếm, lọc theo trạng thái
- Thao tác trạng thái:
  - Chờ xử lý → Xác nhận
  - Xác nhận → Đang giao
  - Đang giao → Đã giao
  - Huỷ đơn (trước khi giao)

#### Chi tiết đơn hàng (`/admin/orders/:id`)
- Thông tin khách hàng & địa chỉ
- Danh sách sản phẩm (ảnh, tên, giá, số lượng)
- Timeline đơn hàng
- Cập nhật trạng thái thanh toán
- Xử lý yêu cầu hoàn trả

### 3.7 Quản lý hoàn trả (`/admin/returns`)
- Danh sách yêu cầu hoàn trả
- Trạng thái: Đã yêu cầu | Đã duyệt | Từ chối | Đã nhận hàng | Đã hoàn tiền | Đóng
- Thao tác:
  - Duyệt / Từ chối yêu cầu
  - Xác nhận đã nhận hàng trả
  - Xử lý hoàn tiền (hoàn vào ví)
  - Đóng yêu cầu
- Xem ảnh bằng chứng từ khách hàng

### 3.8 Quản lý mã giảm giá (`/admin/vouchers`)
- Tạo/sửa/xoá voucher
- Trường:
  - Mã code
  - Loại giảm: Cố định (VNĐ) hoặc Phần trăm (%)
  - Giá trị giảm
  - Đơn hàng tối thiểu
  - Giảm tối đa
  - Giới hạn sử dụng (tổng & mỗi người)
  - Thời hạn hiệu lực (từ ngày - đến ngày)
  - Trạng thái: Hoạt động / Tắt

### 3.9 Quản lý banner (`/admin/banners`)
- Thêm/sửa/xoá banner quảng cáo
- Vị trí: Slider trang chủ | Giữa trang | Cuối trang | Sidebar
- Upload ảnh, đặt link
- Kéo thả sắp xếp thứ tự
- Bật/tắt hiển thị

### 3.10 Quản lý đánh giá (`/admin/reviews`)
- Danh sách đánh giá: Lọc theo trạng thái, sản phẩm, số sao
- Trạng thái: Chờ duyệt | Đã duyệt | Từ chối
- Thao tác: Duyệt / Từ chối / Xoá đánh giá
- Xem ảnh đính kèm

### 3.11 Quản lý người dùng (`/admin/users`)
- Danh sách: Tìm kiếm, lọc theo vai trò/trạng thái/cấp thành viên
- Thêm/sửa/xoá người dùng
- Thay đổi vai trò (customer, admin, staff, warehouse)
- Trạng thái: Hoạt động | Tắt | Cấm
- Điều chỉnh điểm thưởng

### 3.12 Quản lý nạp ví (`/admin/wallet-topups`)
- Lịch sử nạp ví của tất cả người dùng
- Lọc theo thời gian (7/14/30 ngày)
- Thống kê tổng nạp

---

## 4. Luồng đơn hàng

### 4.1 Trạng thái đơn hàng

```
Chờ xử lý (pending)
    ↓
Đã xác nhận (confirmed)
    ↓
Đang giao hàng (shipping)
    ↓
Đã giao (delivered)
    ↓
Hoàn thành (completed)
```

Ngoại lệ:
- **Huỷ đơn** (cancelled): Có thể huỷ khi chưa giao hàng
- **Hoàn trả** (returned): Sau khi nhận hàng, trong 7 ngày

### 4.2 Tự động chuyển trạng thái (Scheduler - chạy mỗi 5 phút)

| Phương thức | Luồng tự động |
|-------------|---------------|
| **COD** | pending → confirmed (30 phút) → shipping (2 giờ) |
| **VNPay/Ví** | Thanh toán xong → confirmed → shipping (2 giờ) |
| **Tất cả** | delivered → completed (3 ngày nếu khách không xác nhận) |

### 4.3 Luồng hoàn trả

```
Khách yêu cầu (requested)
    ↓
Admin duyệt (approved) / Từ chối (rejected)
    ↓
Admin nhận hàng trả (received)
    ↓
Admin hoàn tiền vào ví (refunded)
    ↓
Đóng yêu cầu (closed)
```

---

## 5. Hệ thống thanh toán

### 5.1 Phương thức thanh toán

| Phương thức | Mô tả | Trạng thái thanh toán |
|-------------|--------|----------------------|
| **COD** | Thanh toán khi nhận hàng | pending → paid (khi giao) |
| **Ví TechMart** | Trừ số dư ví ngay lập tức | paid (ngay) |
| **VNPay** | Chuyển hướng sang cổng VNPay | pending → paid (callback) |

### 5.2 Ví TechMart
- Nạp tiền qua VNPay
- Mức nạp nhanh: 50.000đ, 100.000đ, 200.000đ, 500.000đ, 1.000.000đ, 2.000.000đ
- Hoặc nhập số tiền tuỳ ý
- Tiền hoàn trả được cộng vào ví

### 5.3 Trạng thái thanh toán
| Trạng thái | Màu hiển thị | Mô tả |
|------------|-------------|--------|
| Chờ thanh toán (pending) | Vàng | Chưa thanh toán |
| Đã thanh toán (paid) | Xanh lá | Thanh toán thành công |
| Thất bại (failed) | Đỏ | Thanh toán lỗi |
| Đã hoàn tiền (refunded) | Tím | Đã hoàn tiền |

### 5.4 Mã giảm giá
- **Coupon**: Giảm theo % hoặc số tiền cố định
- **Voucher**: Tương tự coupon, quản lý riêng
- Validate: Đơn tối thiểu, giới hạn sử dụng, thời hạn hiệu lực

---

## 6. API Endpoints

### Auth (`/api/auth`)
| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| POST | `/login` | Đăng nhập | Không |
| POST | `/register` | Đăng ký | Không |
| GET | `/profile` | Lấy thông tin cá nhân | Có |

### Sản phẩm (`/api/products`)
| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| GET | `/` | Danh sách sản phẩm (lọc, tìm kiếm) | Không |
| GET | `/slug/:slug` | Chi tiết theo slug | Không |
| GET | `/:id` | Chi tiết theo ID | Không |
| GET | `/:id/variants` | Lấy biến thể | Không |
| POST | `/validate-cart` | Kiểm tra giỏ hàng hợp lệ | Không |
| POST | `/` | Tạo sản phẩm | Admin |
| PUT | `/:id` | Sửa sản phẩm | Admin |
| DELETE | `/:id` | Xoá sản phẩm | Admin |

### Đơn hàng (`/api/orders`)
| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| GET | `/my-orders` | Đơn hàng của tôi | Có |
| GET | `/my-orders/:id` | Chi tiết đơn | Có |
| GET | `/my-orders/:id/timeline` | Timeline đơn | Có |
| POST | `/` | Tạo đơn hàng | Có |
| POST | `/my-orders/:id/cancel` | Huỷ đơn | Có |
| POST | `/my-orders/:id/confirm-delivered` | Xác nhận nhận hàng | Có |
| POST | `/my-orders/:id/returns` | Yêu cầu hoàn trả | Có |
| GET | `/stats` | Thống kê đơn hàng | Admin |
| PATCH | `/:id/status` | Cập nhật trạng thái | Admin |

### Danh mục (`/api/categories`)
| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| GET | `/` | Danh sách danh mục | Không |
| GET | `/tree` | Cây danh mục | Không |
| POST | `/` | Tạo danh mục | Admin |
| PUT | `/:id` | Sửa danh mục | Admin |
| DELETE | `/:id` | Xoá danh mục | Admin |

### Thương hiệu (`/api/brands`)
| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| GET | `/` | Danh sách | Không |
| POST | `/` | Tạo | Admin |
| PUT | `/:id` | Sửa | Admin |
| DELETE | `/:id` | Xoá | Admin |

### Thanh toán (`/api/payment`)
| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| POST | `/vnpay/create` | Tạo link thanh toán VNPay | Có |
| GET | `/vnpay/return` | VNPay redirect callback | Không |
| GET | `/vnpay/ipn` | VNPay server callback | Không |

### Ví (`/api/wallet`)
| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| GET | `/balance` | Xem số dư | Có |
| GET | `/transactions` | Lịch sử giao dịch | Có |
| POST | `/topup/vnpay` | Nạp ví qua VNPay | Có |

### Địa chỉ (`/api/addresses`)
| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| GET | `/` | Danh sách địa chỉ | Có |
| POST | `/` | Thêm địa chỉ | Có |
| PUT | `/:id` | Sửa địa chỉ | Có |
| PATCH | `/:id/default` | Đặt mặc định | Có |
| DELETE | `/:id` | Xoá địa chỉ | Có |

### Đánh giá (`/api/reviews`)
| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| GET | `/product/:productId` | Đánh giá theo sản phẩm | Không |
| GET | `/can-review/:productId` | Kiểm tra quyền đánh giá | Có |
| POST | `/` | Viết đánh giá | Có |

### Banner (`/api/banners`)
| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| GET | `/` | Banner đang hiển thị | Không |

### Voucher (`/api/vouchers`)
| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| POST | `/validate` | Kiểm tra mã giảm giá | Có |
| GET | `/` | Danh sách (admin) | Admin |
| POST | `/` | Tạo voucher | Admin |
| DELETE | `/:id` | Xoá voucher | Admin |

---

## 7. Cơ sở dữ liệu

### Danh sách bảng (22 bảng)

| Bảng | Mô tả |
|------|--------|
| `users` | Người dùng (khách hàng, admin) |
| `user_addresses` | Địa chỉ giao hàng |
| `products` | Sản phẩm |
| `product_images` | Ảnh sản phẩm |
| `product_variants` | Biến thể sản phẩm (màu, dung lượng) |
| `product_attributes` | Thuộc tính sản phẩm |
| `product_attribute_options` | Giá trị thuộc tính |
| `category_attributes` | Gán thuộc tính vào danh mục |
| `categories` | Danh mục sản phẩm |
| `brands` | Thương hiệu |
| `orders` | Đơn hàng |
| `order_details` | Chi tiết đơn hàng (sản phẩm trong đơn) |
| `order_events` | Lịch sử thay đổi đơn hàng |
| `order_returns` | Yêu cầu hoàn trả |
| `order_return_items` | Sản phẩm hoàn trả |
| `coupons` | Mã giảm giá (coupon) |
| `vouchers` | Mã giảm giá (voucher) |
| `product_reviews` | Đánh giá sản phẩm |
| `order_feedback` | Phản hồi đơn hàng |
| `banners` | Banner quảng cáo |
| `wallet_transactions` | Giao dịch ví |
| `wallet_topup_requests` | Yêu cầu nạp ví |

---

## 8. Hướng dẫn cài đặt & chạy Docker

### Yêu cầu
- Docker & Docker Compose đã cài đặt

### Chạy môi trường Development

```bash
# Clone repo
git clone https://github.com/Hungnvph52431/techmart-website.git
cd techmart-website

# Chạy (không cần cấu hình gì thêm)
docker compose up -d
```

Truy cập:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001/api
- MySQL: localhost:3306

### Chạy môi trường Production

```bash
# Copy file env mẫu
cp .env.example .env

# Sửa giá trị trong .env (mật khẩu DB, JWT secret, VNPay, SMTP, ...)
nano .env

# Chạy production
docker compose -f docker-compose.prod.yml up -d --build
```

Truy cập:
- Website: http://localhost (port 80)
- Backend API: http://localhost/api (proxy qua Nginx)

### Tài khoản mặc định (từ seed data)
- Xem file `backend/src/infrastructure/database/seed.sql` để biết tài khoản admin/customer mẫu

### Biến môi trường quan trọng

| Biến | Mô tả | Mặc định |
|------|--------|----------|
| `DB_HOST` | Host MySQL | `mysql` (container) |
| `DB_NAME` | Tên database | `mobile_shop` |
| `DB_USER` | User MySQL | `techmart_user` |
| `DB_PASSWORD` | Mật khẩu MySQL | `techmart123` |
| `JWT_SECRET` | Secret key JWT | `techmart_jwt_secret_key_2026` |
| `VNPAY_TMN_CODE` | Mã TMN VNPay | (bỏ trống nếu không dùng) |
| `VNPAY_HASH_SECRET` | Secret VNPay | (bỏ trống nếu không dùng) |
| `SMTP_USER` | Email gửi mail | (bỏ trống nếu không dùng) |
| `SMTP_PASS` | App password Gmail | (bỏ trống nếu không dùng) |
| `VITE_API_URL` | URL API cho frontend | `http://localhost:5001/api` |
