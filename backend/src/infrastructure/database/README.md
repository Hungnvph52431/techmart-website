# 📱 Mobile Shop Database Documentation

## 📋 Tổng quan

Database cho hệ thống web bán điện thoại và thiết bị điện tử, được thiết kế đầy đủ để hỗ trợ các tính năng:
- Quản lý sản phẩm với biến thể (màu sắc, dung lượng)
- Quản lý đơn hàng và thanh toán
- Hệ thống khuyến mãi và mã giảm giá
- Đánh giá sản phẩm
- Quản lý khách hàng và điểm thưởng
- Blog/Tin tức
- Hỗ trợ khách hàng

## 🗂️ Cấu trúc Database

### **23 bảng chính** được chia thành các nhóm:

### 👥 Quản lý người dùng
- `users` - Thông tin tài khoản người dùng
- `addresses` - Địa chỉ giao hàng của khách hàng

### 📦 Quản lý sản phẩm
- `brands` - Thương hiệu (Apple, Samsung, Xiaomi...)
- `categories` - Danh mục sản phẩm (có cấu trúc cây)
- `products` - Sản phẩm chính
- `product_variants` - Biến thể sản phẩm (màu sắc, dung lượng, cấu hình)
- `product_images` - Hình ảnh sản phẩm
- `reviews` - Đánh giá từ khách hàng

### 🛒 Giỏ hàng & Đơn hàng
- `cart` - Giỏ hàng của khách
- `orders` - Đơn hàng
- `order_details` - Chi tiết sản phẩm trong đơn hàng

### 💰 Khuyến mãi & Giảm giá
- `coupons` - Mã giảm giá
- `promotions` - Chương trình khuyến mãi
- `promotion_products` - Sản phẩm tham gia khuyến mãi

### 🎨 Nội dung & Quảng cáo
- `banners` - Banner quảng cáo
- `posts` - Bài viết/tin tức/blog

### 🔔 Tương tác người dùng
- `wishlists` - Sản phẩm yêu thích
- `product_views` - Lịch sử xem sản phẩm
- `notifications` - Thông báo cho người dùng
- `support_tickets` - Yêu cầu hỗ trợ/bảo hành

### ⚙️ Quản trị hệ thống
- `inventory_transactions` - Giao dịch nhập/xuất kho
- `audit_logs` - Nhật ký thao tác hệ thống
- `settings` - Cấu hình hệ thống

---

## 📊 Mô tả chi tiết các bảng

### 1. `users` - Người dùng
Quản lý tài khoản người dùng với phân quyền và hệ thống thành viên.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| user_id | INT | Khóa chính |
| email | VARCHAR(255) | Email đăng nhập (unique) |
| password | VARCHAR(255) | Mật khẩu đã mã hóa |
| name | VARCHAR(255) | Họ tên |
| phone | VARCHAR(20) | Số điện thoại |
| role | ENUM | customer, admin, staff, warehouse |
| status | ENUM | active, inactive, banned |
| points | INT | Điểm tích lũy |
| membership_level | ENUM | bronze, silver, gold, platinum |

**Indexes**: email, role, status

---

### 2. `addresses` - Địa chỉ giao hàng
Lưu trữ nhiều địa chỉ cho mỗi khách hàng.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| address_id | INT | Khóa chính |
| user_id | INT | Khóa ngoại → users |
| full_name | VARCHAR(255) | Tên người nhận |
| phone | VARCHAR(20) | SĐT người nhận |
| address_line | VARCHAR(500) | Địa chỉ chi tiết |
| ward, district, city | VARCHAR | Phường, quận, thành phố |
| is_default | BOOLEAN | Địa chỉ mặc định |

---

### 3. `categories` - Danh mục sản phẩm
Cấu trúc cây để tổ chức danh mục cha-con.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| category_id | INT | Khóa chính |
| name | VARCHAR(255) | Tên danh mục |
| slug | VARCHAR(255) | URL thân thiện SEO |
| parent_id | INT | Danh mục cha (tự tham chiếu) |
| display_order | INT | Thứ tự hiển thị |
| is_active | BOOLEAN | Trạng thái kích hoạt |

**Ví dụ cấu trúc**:
```
Điện thoại (parent_id: NULL)
├── iPhone (parent_id: 1)
├── Samsung Galaxy (parent_id: 1)
└── Xiaomi (parent_id: 1)
```

---

### 4. `brands` - Thương hiệu

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| brand_id | INT | Khóa chính |
| name | VARCHAR(255) | Tên thương hiệu |
| slug | VARCHAR(255) | URL thân thiện |
| logo_url | VARCHAR(500) | Logo thương hiệu |

---

### 5. `products` - Sản phẩm
Bảng trung tâm chứa thông tin sản phẩm.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| product_id | INT | Khóa chính |
| name | VARCHAR(500) | Tên sản phẩm |
| slug | VARCHAR(500) | URL thân thiện SEO |
| sku | VARCHAR(100) | Mã sản phẩm |
| category_id | INT | Khóa ngoại → categories |
| brand_id | INT | Khóa ngoại → brands |
| price | DECIMAL(15,2) | Giá niêm yết |
| sale_price | DECIMAL(15,2) | Giá khuyến mãi |
| specifications | JSON | Thông số kỹ thuật |
| stock_quantity | INT | Số lượng tồn kho |
| sold_quantity | INT | Số lượng đã bán |
| view_count | INT | Lượt xem |
| rating_avg | DECIMAL(3,2) | Điểm đánh giá TB |
| review_count | INT | Số lượng đánh giá |
| is_featured | BOOLEAN | Sản phẩm nổi bật |
| is_new | BOOLEAN | Sản phẩm mới |
| is_bestseller | BOOLEAN | Bán chạy |
| status | ENUM | active, inactive, out_of_stock, pre_order |

**Indexes**: slug, sku, category_id, brand_id, price, status, featured, new, bestseller  
**Fulltext**: name, description (để tìm kiếm)

---

### 6. `product_variants` - Biến thể sản phẩm
Quản lý các phiên bản khác nhau của cùng sản phẩm.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| variant_id | INT | Khóa chính |
| product_id | INT | Khóa ngoại → products |
| variant_name | VARCHAR(255) | Tên biến thể |
| sku | VARCHAR(100) | SKU riêng cho biến thể |
| attributes | JSON | {"color": "Đen", "storage": "256GB"} |
| price_adjustment | DECIMAL | Chênh lệch giá |
| stock_quantity | INT | Tồn kho riêng |

**Ví dụ**: 
- iPhone 15 Pro Max 256GB Titan Tự Nhiên
- iPhone 15 Pro Max 512GB Titan Trắng

---

### 7. `product_images` - Hình ảnh sản phẩm

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| image_id | INT | Khóa chính |
| product_id | INT | Khóa ngoại → products |
| image_url | VARCHAR(500) | Đường dẫn ảnh |
| display_order | INT | Thứ tự hiển thị |
| is_primary | BOOLEAN | Ảnh đại diện |

---

### 8. `reviews` - Đánh giá sản phẩm

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| review_id | INT | Khóa chính |
| product_id | INT | Khóa ngoại → products |
| user_id | INT | Khóa ngoại → users |
| order_id | INT | Đơn hàng liên quan |
| rating | INT | 1-5 sao |
| title | VARCHAR(255) | Tiêu đề đánh giá |
| comment | TEXT | Nội dung chi tiết |
| is_verified_purchase | BOOLEAN | Đã mua hàng |
| status | ENUM | pending, approved, rejected |

---

### 9. `coupons` - Mã giảm giá

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| coupon_id | INT | Khóa chính |
| code | VARCHAR(50) | Mã giảm giá (unique) |
| discount_type | ENUM | percentage, fixed_amount |
| discount_value | DECIMAL | Giá trị giảm |
| min_order_value | DECIMAL | Đơn tối thiểu |
| max_discount_amount | DECIMAL | Giảm tối đa |
| usage_limit | INT | Số lần sử dụng |
| per_user_limit | INT | Giới hạn/người |
| valid_from, valid_to | TIMESTAMP | Thời gian có hiệu lực |

---

### 10. `cart` - Giỏ hàng

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| cart_id | INT | Khóa chính |
| user_id | INT | Khóa ngoại → users |
| product_id | INT | Khóa ngoại → products |
| variant_id | INT | Khóa ngoại → product_variants |
| quantity | INT | Số lượng |
| price | DECIMAL | Giá tại thời điểm thêm |

---

### 11. `orders` - Đơn hàng

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| order_id | INT | Khóa chính |
| order_code | VARCHAR(50) | Mã đơn hàng (unique) |
| user_id | INT | Khóa ngoại → users |
| shipping_name | VARCHAR(255) | Người nhận |
| shipping_phone | VARCHAR(20) | SĐT nhận hàng |
| shipping_address | VARCHAR(500) | Địa chỉ giao hàng |
| subtotal | DECIMAL | Tổng tiền hàng |
| shipping_fee | DECIMAL | Phí vận chuyển |
| discount_amount | DECIMAL | Số tiền giảm |
| total | DECIMAL | Tổng thanh toán |
| payment_method | ENUM | cod, bank_transfer, momo, vnpay, zalopay |
| payment_status | ENUM | pending, paid, failed, refunded |
| status | ENUM | pending, confirmed, processing, shipping, delivered, cancelled, returned |
| customer_note | TEXT | Ghi chú từ khách |
| admin_note | TEXT | Ghi chú nội bộ |

**Indexes**: order_code, user_id, status, payment_status, order_date

---

### 12. `order_details` - Chi tiết đơn hàng

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| order_detail_id | INT | Khóa chính |
| order_id | INT | Khóa ngoại → orders |
| product_id | INT | Khóa ngoại → products |
| variant_id | INT | Khóa ngoại → product_variants |
| product_name | VARCHAR(500) | Tên sản phẩm (lưu cứng) |
| price | DECIMAL | Giá tại thời điểm mua |
| quantity | INT | Số lượng |
| subtotal | DECIMAL | Thành tiền |

---

### 13. `promotions` - Chương trình khuyến mãi

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| promotion_id | INT | Khóa chính |
| name | VARCHAR(255) | Tên chương trình |
| promotion_type | ENUM | flash_sale, deal, bundle, gift |
| discount_type | ENUM | percentage, fixed_amount |
| applicable_to | ENUM | all, category, product, brand |
| valid_from, valid_to | TIMESTAMP | Thời gian áp dụng |

---

### 14. `banners` - Banner quảng cáo

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| banner_id | INT | Khóa chính |
| title | VARCHAR(255) | Tiêu đề |
| image_url | VARCHAR(500) | Đường dẫn ảnh |
| link_url | VARCHAR(500) | Link khi click |
| position | ENUM | home_slider, home_top, home_middle, sidebar, category |
| display_order | INT | Thứ tự hiển thị |

---

### 15. `posts` - Bài viết/Blog

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| post_id | INT | Khóa chính |
| title | VARCHAR(500) | Tiêu đề |
| slug | VARCHAR(500) | URL thân thiện |
| content | TEXT | Nội dung HTML |
| author_id | INT | Khóa ngoại → users |
| category | ENUM | news, review, guide, promotion |
| is_published | BOOLEAN | Đã xuất bản |
| published_at | TIMESTAMP | Thời gian xuất bản |

**Fulltext**: title, content, excerpt

---

### 16. `support_tickets` - Yêu cầu hỗ trợ

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| ticket_id | INT | Khóa chính |
| user_id | INT | Khóa ngoại → users |
| order_id | INT | Đơn hàng liên quan |
| subject | VARCHAR(255) | Tiêu đề |
| type | ENUM | warranty, return, exchange, complaint, other |
| status | ENUM | open, in_progress, resolved, closed |
| priority | ENUM | low, medium, high, urgent |
| assigned_to | INT | Nhân viên phụ trách |

---

### 17. `inventory_transactions` - Giao dịch kho

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| transaction_id | INT | Khóa chính |
| product_id | INT | Khóa ngoại → products |
| transaction_type | ENUM | import, export, return, adjustment |
| quantity | INT | Số lượng (+/-) |
| reference_type | VARCHAR(50) | Loại tham chiếu |
| reference_id | INT | ID tham chiếu |
| created_by | INT | Người thực hiện |

---

### 18. `audit_logs` - Nhật ký hệ thống

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| log_id | INT | Khóa chính |
| user_id | INT | Người thực hiện |
| action | VARCHAR(100) | Hành động |
| table_name | VARCHAR(100) | Bảng bị tác động |
| record_id | INT | ID bản ghi |
| old_values | JSON | Giá trị cũ |
| new_values | JSON | Giá trị mới |
| ip_address | VARCHAR(45) | IP thực hiện |

---

## 🔗 Quan hệ giữa các bảng

```
users (1) ----< (n) addresses
users (1) ----< (n) orders
users (1) ----< (n) cart
users (1) ----< (n) reviews
users (1) ----< (n) wishlists

categories (1) ----< (n) products
brands (1) ----< (n) products
products (1) ----< (n) product_variants
products (1) ----< (n) product_images
products (1) ----< (n) reviews

orders (1) ----< (n) order_details
products (1) ----< (n) order_details

promotions (n) ----< (n) products [thông qua promotion_products]
```

---

## 🚀 Cài đặt Database

### Bước 1: Tạo database
```bash
mysql -u root -p < database/schema.sql
```

### Bước 2: Import dữ liệu mẫu
```bash
mysql -u root -p < database/seed.sql
```

### Bước 3: Kiểm tra
```sql
USE mobile_shop;
SHOW TABLES;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM orders;
```

---

## 🔍 Các truy vấn thường dùng

### Lấy sản phẩm kèm thương hiệu và danh mục
```sql
SELECT p.*, b.name as brand_name, c.name as category_name
FROM products p
LEFT JOIN brands b ON p.brand_id = b.brand_id
LEFT JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'active'
ORDER BY p.created_at DESC;
```

### Lấy đơn hàng kèm chi tiết
```sql
SELECT o.*, od.product_name, od.quantity, od.price
FROM orders o
JOIN order_details od ON o.order_id = od.order_id
WHERE o.user_id = 4
ORDER BY o.order_date DESC;
```

### Tìm kiếm sản phẩm
```sql
SELECT * FROM products
WHERE MATCH(name, description) AGAINST('iPhone' IN NATURAL LANGUAGE MODE)
AND status = 'active';
```

### Top sản phẩm bán chạy
```sql
SELECT * FROM products
WHERE status = 'active'
ORDER BY sold_quantity DESC
LIMIT 10;
```

### Thống kê doanh thu theo tháng
```sql
SELECT 
    DATE_FORMAT(order_date, '%Y-%m') as month,
    COUNT(*) as total_orders,
    SUM(total) as revenue
FROM orders
WHERE status = 'delivered'
GROUP BY month
ORDER BY month DESC;
```

---

## 📈 Tối ưu hóa

### Indexes đã tạo
- **Primary Keys**: Tất cả bảng đều có khóa chính AUTO_INCREMENT
- **Foreign Keys**: Đảm bảo tính toàn vẹn dữ liệu
- **Unique Keys**: email, slug, order_code, coupon_code
- **Regular Indexes**: Các cột thường xuyên query (status, category_id, user_id...)
- **Fulltext Indexes**: Cho tìm kiếm sản phẩm và bài viết

### Khuyến nghị
- Sử dụng **Redis** cache cho sản phẩm hot, session
- **Elasticsearch** cho tìm kiếm nâng cao
- Partition bảng `orders` và `audit_logs` theo tháng/năm
- Archive dữ liệu cũ định kỳ

---

## 🔐 Bảo mật

- Mật khẩu được hash bằng bcrypt (`$2y$10$...`)
- Foreign key constraints để đảm bảo tính toàn vẹn
- Audit logs để theo dõi mọi thay đổi quan trọng
- Soft delete cho các bảng quan trọng (sử dụng status thay vì xóa)

---

## 📝 Ghi chú

### Tài khoản test (password: `password`)
- **Admin**: admin@mobileshop.com
- **Staff**: staff@mobileshop.com  
- **Customer**: customer1@gmail.com

### Đặc điểm nổi bật
- ✅ Hỗ trợ đa biến thể sản phẩm (màu, dung lượng, cấu hình)
- ✅ Hệ thống khuyến mãi linh hoạt
- ✅ Quản lý kho hàng với inventory transactions
- ✅ Hệ thống thành viên và tích điểm
- ✅ Audit logs đầy đủ cho quản trị
- ✅ SEO-friendly với slug và meta tags
- ✅ JSON fields cho dữ liệu linh hoạt

---

## 📞 Hỗ trợ

Nếu có câu hỏi hoặc cần hỗ trợ, vui lòng liên hệ team phát triển.

**Version**: 1.0  
**Last Updated**: January 2026
