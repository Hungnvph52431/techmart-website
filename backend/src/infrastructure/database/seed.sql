-- ==================================================
-- MOBILE SHOP - SEED DATA
-- Dữ liệu mẫu để test hệ thống
-- ==================================================

USE mobile_shop;

-- ==================================================
-- 1. USERS - Người dùng mẫu
-- ==================================================
INSERT INTO users (email, password, name, phone, role, status, points, membership_level) VALUES
('admin@mobileshop.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Quản trị viên', '0901234567', 'admin', 'active', 0, 'platinum'),
('staff@mobileshop.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Nhân viên', '0902234567', 'staff', 'active', 0, 'bronze'),
('warehouse@mobileshop.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Quản lý kho', '0903234567', 'warehouse', 'active', 0, 'bronze'),
('customer1@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Nguyễn Văn A', '0904234567', 'customer', 'active', 150, 'silver'),
('customer2@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Trần Thị B', '0905234567', 'customer', 'active', 450, 'gold'),
('customer3@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Lê Văn C', '0906234567', 'customer', 'active', 80, 'bronze');

-- ==================================================
-- 2. ADDRESSES - Địa chỉ
-- ==================================================
INSERT INTO addresses (user_id, full_name, phone, address_line, ward, district, city, is_default) VALUES
(4, 'Nguyễn Văn A', '0904234567', '123 Nguyễn Huệ', 'Phường Bến Nghé', 'Quận 1', 'TP. Hồ Chí Minh', TRUE),
(4, 'Nguyễn Văn A', '0904234567', '456 Lê Lợi', 'Phường Bến Thành', 'Quận 1', 'TP. Hồ Chí Minh', FALSE),
(5, 'Trần Thị B', '0905234567', '789 Trần Hưng Đạo', 'Phường Cầu Kho', 'Quận 1', 'TP. Hồ Chí Minh', TRUE),
(6, 'Lê Văn C', '0906234567', '321 Võ Văn Tần', 'Phường 5', 'Quận 3', 'TP. Hồ Chí Minh', TRUE);

-- ==================================================
-- 3. BRANDS - Thương hiệu
-- ==================================================
INSERT INTO brands (name, slug, description, is_active) VALUES
('Apple', 'apple', 'Thương hiệu công nghệ hàng đầu thế giới', TRUE),
('Samsung', 'samsung', 'Tập đoàn điện tử đa quốc gia Hàn Quốc', TRUE),
('Xiaomi', 'xiaomi', 'Thương hiệu điện tử thông minh Trung Quốc', TRUE),
('OPPO', 'oppo', 'Thương hiệu điện tử Trung Quốc', TRUE),
('Vivo', 'vivo', 'Thương hiệu smartphone Trung Quốc', TRUE),
('Realme', 'realme', 'Thương hiệu smartphone giá trị', TRUE),
('Nokia', 'nokia', 'Thương hiệu điện thoại cổ điển', TRUE),
('Asus', 'asus', 'Thương hiệu laptop và gaming', TRUE),
('Dell', 'dell', 'Thương hiệu máy tính hàng đầu', TRUE),
('HP', 'hp', 'Thương hiệu máy tính và thiết bị văn phòng', TRUE);

-- ==================================================
-- 4. CATEGORIES - Danh mục
-- ==================================================
INSERT INTO categories (name, slug, description, parent_id, display_order, is_active) VALUES
('Điện thoại', 'dien-thoai', 'Điện thoại di động các loại', NULL, 1, TRUE),
('Laptop', 'laptop', 'Máy tính xách tay', NULL, 2, TRUE),
('Tablet', 'tablet', 'Máy tính bảng', NULL, 3, TRUE),
('Phụ kiện', 'phu-kien', 'Phụ kiện điện thoại và thiết bị', NULL, 4, TRUE),
('Đồng hồ thông minh', 'dong-ho-thong-minh', 'Smartwatch và wearable', NULL, 5, TRUE);

-- Danh mục con
INSERT INTO categories (name, slug, description, parent_id, display_order, is_active) VALUES
('iPhone', 'iphone', 'Điện thoại iPhone', 1, 1, TRUE),
('Samsung Galaxy', 'samsung-galaxy', 'Điện thoại Samsung', 1, 2, TRUE),
('Xiaomi', 'xiaomi-phone', 'Điện thoại Xiaomi', 1, 3, TRUE),
('OPPO', 'oppo-phone', 'Điện thoại OPPO', 1, 4, TRUE),
('Tai nghe', 'tai-nghe', 'Tai nghe các loại', 4, 1, TRUE),
('Sạc dự phòng', 'sac-du-phong', 'Pin sạc dự phòng', 4, 2, TRUE),
('Ốp lưng', 'op-lung', 'Ốp lưng bảo vệ', 4, 3, TRUE),
('Cáp sạc', 'cap-sac', 'Cáp sạc và truyền dữ liệu', 4, 4, TRUE);

-- ==================================================
-- 5. PRODUCTS - Sản phẩm
-- ==================================================
INSERT INTO products (name, slug, sku, category_id, brand_id, price, sale_price, description, specifications, stock_quantity, sold_quantity, is_featured, is_new, is_bestseller, status) VALUES
-- iPhone
('iPhone 15 Pro Max', 'iphone-15-pro-max', 'IP15PM-001', 6, 1, 29990000, 28990000, 
'iPhone 15 Pro Max - Đỉnh cao công nghệ với chip A17 Pro, camera 48MP, titan thiết kế',
'{"screen": "6.7 inch", "chip": "A17 Pro", "ram": "8GB", "storage": ["256GB", "512GB", "1TB"], "camera": "48MP + 12MP + 12MP", "battery": "4422mAh"}',
50, 120, TRUE, TRUE, TRUE, 'active'),

('iPhone 14 Pro', 'iphone-14-pro', 'IP14P-001', 6, 1, 25990000, 24490000,
'iPhone 14 Pro - Chip A16 Bionic, Dynamic Island, camera 48MP',
'{"screen": "6.1 inch", "chip": "A16 Bionic", "ram": "6GB", "storage": ["128GB", "256GB", "512GB"], "camera": "48MP + 12MP + 12MP", "battery": "3200mAh"}',
80, 250, TRUE, FALSE, TRUE, 'active'),

('iPhone 13', 'iphone-13', 'IP13-001', 6, 1, 17990000, 16990000,
'iPhone 13 - Hiệu năng mạnh mẽ, pin trâu, camera kép xuất sắc',
'{"screen": "6.1 inch", "chip": "A15 Bionic", "ram": "4GB", "storage": ["128GB", "256GB", "512GB"], "camera": "12MP + 12MP", "battery": "3240mAh"}',
100, 450, TRUE, FALSE, TRUE, 'active'),

-- Samsung
('Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'SS24U-001', 7, 2, 29990000, 28490000,
'Galaxy S24 Ultra - Snapdragon 8 Gen 3, camera 200MP, S Pen tích hợp',
'{"screen": "6.8 inch", "chip": "Snapdragon 8 Gen 3", "ram": "12GB", "storage": ["256GB", "512GB", "1TB"], "camera": "200MP + 50MP + 12MP + 10MP", "battery": "5000mAh"}',
60, 180, TRUE, TRUE, TRUE, 'active'),

('Samsung Galaxy A54 5G', 'samsung-galaxy-a54-5g', 'SSA54-001', 7, 2, 9990000, 9490000,
'Galaxy A54 5G - Thiết kế cao cấp, màn hình 120Hz, camera 50MP',
'{"screen": "6.4 inch", "chip": "Exynos 1380", "ram": "8GB", "storage": ["128GB", "256GB"], "camera": "50MP + 12MP + 5MP", "battery": "5000mAh"}',
150, 520, TRUE, FALSE, TRUE, 'active'),

('Samsung Galaxy Z Fold5', 'samsung-galaxy-z-fold5', 'SSZF5-001', 7, 2, 40990000, 38990000,
'Galaxy Z Fold5 - Điện thoại gập cao cấp, màn hình Dynamic AMOLED',
'{"screen": "7.6 inch", "chip": "Snapdragon 8 Gen 2", "ram": "12GB", "storage": ["256GB", "512GB", "1TB"], "camera": "50MP + 12MP + 10MP", "battery": "4400mAh"}',
30, 85, TRUE, TRUE, FALSE, 'active'),

-- Xiaomi
('Xiaomi 14 Pro', 'xiaomi-14-pro', 'XM14P-001', 8, 3, 19990000, 18990000,
'Xiaomi 14 Pro - Snapdragon 8 Gen 3, camera Leica, sạc nhanh 120W',
'{"screen": "6.73 inch", "chip": "Snapdragon 8 Gen 3", "ram": "12GB", "storage": ["256GB", "512GB"], "camera": "50MP + 50MP + 50MP", "battery": "4880mAh"}',
70, 210, TRUE, TRUE, TRUE, 'active'),

('Xiaomi Redmi Note 13 Pro', 'xiaomi-redmi-note-13-pro', 'RN13P-001', 8, 3, 7990000, 7490000,
'Redmi Note 13 Pro - Camera 200MP, sạc nhanh 67W, pin 5000mAh',
'{"screen": "6.67 inch", "chip": "Snapdragon 7s Gen 2", "ram": "8GB", "storage": ["128GB", "256GB"], "camera": "200MP + 8MP + 2MP", "battery": "5000mAh"}',
200, 850, TRUE, FALSE, TRUE, 'active'),

-- OPPO
('OPPO Find X6 Pro', 'oppo-find-x6-pro', 'OPX6P-001', 9, 4, 22990000, 21990000,
'OPPO Find X6 Pro - Camera Hasselblad, Snapdragon 8 Gen 2',
'{"screen": "6.82 inch", "chip": "Snapdragon 8 Gen 2", "ram": "12GB", "storage": ["256GB", "512GB"], "camera": "50MP + 50MP + 50MP", "battery": "5000mAh"}',
50, 95, TRUE, TRUE, FALSE, 'active'),

('OPPO Reno10 5G', 'oppo-reno10-5g', 'OPR10-001', 9, 4, 9490000, 8990000,
'OPPO Reno10 5G - Thiết kế mỏng nhẹ, camera chân dung chuyên nghiệp',
'{"screen": "6.7 inch", "chip": "MediaTek Dimensity 7050", "ram": "8GB", "storage": ["256GB"], "camera": "64MP + 32MP + 8MP", "battery": "5000mAh"}',
120, 380, TRUE, FALSE, TRUE, 'active'),

-- Laptop
('MacBook Air M2', 'macbook-air-m2', 'MBA-M2-001', 2, 1, 27990000, 26990000,
'MacBook Air M2 - Siêu mỏng nhẹ, chip M2 mạnh mẽ, pin 18 giờ',
'{"screen": "13.6 inch", "chip": "Apple M2", "ram": "8GB", "storage": ["256GB", "512GB"], "graphics": "8-core GPU", "weight": "1.24kg"}',
40, 150, TRUE, FALSE, TRUE, 'active'),

('Dell XPS 13', 'dell-xps-13', 'DXP13-001', 2, 9, 32990000, 31490000,
'Dell XPS 13 - Thiết kế premium, màn hình InfinityEdge',
'{"screen": "13.4 inch", "chip": "Intel Core i7-1355U", "ram": "16GB", "storage": ["512GB", "1TB"], "graphics": "Intel Iris Xe", "weight": "1.17kg"}',
35, 85, TRUE, FALSE, FALSE, 'active'),

-- Phụ kiện
('AirPods Pro 2', 'airpods-pro-2', 'APP2-001', 10, 1, 6490000, 5990000,
'AirPods Pro 2 - Chống ồn chủ động, âm thanh không gian',
'{"type": "In-ear", "connection": "Bluetooth 5.3", "battery": "30 giờ", "features": ["Chống ồn ANC", "Âm thanh không gian", "Chống nước IPX4"]}',
200, 450, TRUE, FALSE, TRUE, 'active'),

('Samsung Galaxy Buds2 Pro', 'samsung-galaxy-buds2-pro', 'SGB2P-001', 10, 2, 4490000, 3990000,
'Galaxy Buds2 Pro - Âm thanh Hi-Fi 24bit, chống ồn thông minh',
'{"type": "In-ear", "connection": "Bluetooth 5.3", "battery": "29 giờ", "features": ["Chống ồn ANC", "360 Audio", "Chống nước IPX7"]}',
150, 320, TRUE, FALSE, TRUE, 'active'),

('Anker PowerBank 20000mAh', 'anker-powerbank-20000mah', 'ANK-PB20-001', 11, 10, 990000, 890000,
'Sạc dự phòng Anker 20000mAh - Sạc nhanh 22.5W, 2 cổng USB',
'{"capacity": "20000mAh", "input": "USB-C", "output": ["USB-C", "USB-A"], "fast_charge": "22.5W", "weight": "342g"}',
300, 1200, FALSE, FALSE, TRUE, 'active');

-- ==================================================
-- 6. PRODUCT_VARIANTS - Biến thể sản phẩm
-- ==================================================
INSERT INTO product_variants (product_id, variant_name, sku, attributes, price_adjustment, stock_quantity, is_active) VALUES
-- iPhone 15 Pro Max variants
(1, 'iPhone 15 Pro Max 256GB - Titan Tự Nhiên', 'IP15PM-256-TN', '{"storage": "256GB", "color": "Titan Tự Nhiên"}', 0, 20, TRUE),
(1, 'iPhone 15 Pro Max 512GB - Titan Tự Nhiên', 'IP15PM-512-TN', '{"storage": "512GB", "color": "Titan Tự Nhiên"}', 5000000, 15, TRUE),
(1, 'iPhone 15 Pro Max 256GB - Titan Trắng', 'IP15PM-256-TT', '{"storage": "256GB", "color": "Titan Trắng"}', 0, 15, TRUE),

-- iPhone 14 Pro variants
(2, 'iPhone 14 Pro 128GB - Tím', 'IP14P-128-T', '{"storage": "128GB", "color": "Tím"}', 0, 30, TRUE),
(2, 'iPhone 14 Pro 256GB - Tím', 'IP14P-256-T', '{"storage": "256GB", "color": "Tím"}', 3000000, 25, TRUE),
(2, 'iPhone 14 Pro 128GB - Đen', 'IP14P-128-D', '{"storage": "128GB", "color": "Đen"}', 0, 25, TRUE),

-- Samsung Galaxy S24 Ultra variants
(4, 'Galaxy S24 Ultra 256GB - Titan Xám', 'SS24U-256-TX', '{"storage": "256GB", "color": "Titan Xám"}', 0, 25, TRUE),
(4, 'Galaxy S24 Ultra 512GB - Titan Xám', 'SS24U-512-TX', '{"storage": "512GB", "color": "Titan Xám"}', 4000000, 20, TRUE),
(4, 'Galaxy S24 Ultra 256GB - Titan Tím', 'SS24U-256-TT', '{"storage": "256GB", "color": "Titan Tím"}', 0, 15, TRUE),

-- MacBook Air M2 variants
(11, 'MacBook Air M2 256GB - Midnight', 'MBA-M2-256-MN', '{"storage": "256GB", "color": "Midnight"}', 0, 20, TRUE),
(11, 'MacBook Air M2 512GB - Midnight', 'MBA-M2-512-MN', '{"storage": "512GB", "color": "Midnight"}', 3000000, 10, TRUE),
(11, 'MacBook Air M2 256GB - Starlight', 'MBA-M2-256-ST', '{"storage": "256GB", "color": "Starlight"}', 0, 10, TRUE);

-- ==================================================
-- 7. PRODUCT_IMAGES - Hình ảnh sản phẩm
-- ==================================================
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES
(1, '/images/products/iphone-15-pro-max-1.jpg', 'iPhone 15 Pro Max mặt trước', 1, TRUE),
(1, '/images/products/iphone-15-pro-max-2.jpg', 'iPhone 15 Pro Max mặt sau', 2, FALSE),
(1, '/images/products/iphone-15-pro-max-3.jpg', 'iPhone 15 Pro Max camera', 3, FALSE),

(2, '/images/products/iphone-14-pro-1.jpg', 'iPhone 14 Pro mặt trước', 1, TRUE),
(2, '/images/products/iphone-14-pro-2.jpg', 'iPhone 14 Pro Dynamic Island', 2, FALSE),

(4, '/images/products/galaxy-s24-ultra-1.jpg', 'Galaxy S24 Ultra mặt trước', 1, TRUE),
(4, '/images/products/galaxy-s24-ultra-2.jpg', 'Galaxy S24 Ultra với S Pen', 2, FALSE),

(11, '/images/products/macbook-air-m2-1.jpg', 'MacBook Air M2 màn hình', 1, TRUE),
(11, '/images/products/macbook-air-m2-2.jpg', 'MacBook Air M2 thiết kế', 2, FALSE);

-- ==================================================
-- 8. COUPONS - Mã giảm giá
-- ==================================================
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_discount_amount, usage_limit, valid_from, valid_to, is_active) VALUES
('WELCOME2024', 'Giảm 10% cho đơn hàng đầu tiên', 'percentage', 10, 5000000, 500000, 1000, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), TRUE),
('FLASH50', 'Flash Sale giảm 50K', 'fixed_amount', 50000, 1000000, NULL, 5000, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), TRUE),
('MEMBER200', 'Giảm 200K cho thành viên', 'fixed_amount', 200000, 10000000, NULL, 2000, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE),
('NEWYEAR15', 'Tết 2024 giảm 15%', 'percentage', 15, 3000000, 1000000, 10000, NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY), TRUE);

-- ==================================================
-- 9. PROMOTIONS - Chương trình khuyến mãi
-- ==================================================
INSERT INTO promotions (name, description, promotion_type, discount_type, discount_value, applicable_to, valid_from, valid_to, is_active) VALUES
('Flash Sale Cuối Tuần', 'Giảm giá sốc các sản phẩm hot', 'flash_sale', 'percentage', 20, 'product', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), TRUE),
('Deal iPhone', 'Giảm giá đặc biệt cho iPhone', 'deal', 'percentage', 10, 'product', NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY), TRUE),
('Mua Laptop Tặng Phụ Kiện', 'Mua laptop tặng chuột + túi xách', 'gift', 'fixed_amount', 0, 'category', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE);

-- ==================================================
-- 10. PROMOTION_PRODUCTS - Sản phẩm khuyến mãi
-- ==================================================
INSERT INTO promotion_products (promotion_id, product_id) VALUES
(1, 3), (1, 5), (1, 8), (1, 10),
(2, 1), (2, 2), (2, 3);

-- ==================================================
-- 11. BANNERS - Banner quảng cáo
-- ==================================================
INSERT INTO banners (title, image_url, link_url, position, display_order, is_active, valid_from, valid_to) VALUES
('iPhone 15 Pro Max - Ra Mắt', '/images/banners/iphone-15-banner.jpg', '/products/iphone-15-pro-max', 'home_slider', 1, TRUE, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)),
('Flash Sale Cuối Tuần', '/images/banners/flash-sale-banner.jpg', '/promotions/flash-sale', 'home_slider', 2, TRUE, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
('Samsung Galaxy S24 Ultra', '/images/banners/s24-ultra-banner.jpg', '/products/samsung-galaxy-s24-ultra', 'home_slider', 3, TRUE, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)),
('Giảm giá phụ kiện', '/images/banners/phu-kien-banner.jpg', '/categories/phu-kien', 'home_middle', 1, TRUE, NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY));

-- ==================================================
-- 12. ORDERS - Đơn hàng mẫu
-- ==================================================
INSERT INTO orders (order_code, user_id, shipping_name, shipping_phone, shipping_address, shipping_ward, shipping_district, shipping_city, subtotal, shipping_fee, discount_amount, total, payment_method, payment_status, status, order_date) VALUES
('ORD240101001', 4, 'Nguyễn Văn A', '0904234567', '123 Nguyễn Huệ', 'Phường Bến Nghé', 'Quận 1', 'TP. Hồ Chí Minh', 16990000, 0, 0, 16990000, 'cod', 'pending', 'delivered', DATE_SUB(NOW(), INTERVAL 30 DAY)),
('ORD240101002', 5, 'Trần Thị B', '0905234567', '789 Trần Hưng Đạo', 'Phường Cầu Kho', 'Quận 1', 'TP. Hồ Chí Minh', 28990000, 0, 2000000, 26990000, 'bank_transfer', 'paid', 'delivered', DATE_SUB(NOW(), INTERVAL 25 DAY)),
('ORD240101003', 4, 'Nguyễn Văn A', '0904234567', '123 Nguyễn Huệ', 'Phường Bến Nghé', 'Quận 1', 'TP. Hồ Chí Minh', 7490000, 30000, 0, 7520000, 'momo', 'paid', 'delivered', DATE_SUB(NOW(), INTERVAL 20 DAY)),
('ORD240101004', 6, 'Lê Văn C', '0906234567', '321 Võ Văn Tần', 'Phường 5', 'Quận 3', 'TP. Hồ Chí Minh', 5990000, 30000, 0, 6020000, 'cod', 'paid', 'shipping', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('ORD240101005', 5, 'Trần Thị B', '0905234567', '789 Trần Hưng Đạo', 'Phường Cầu Kho', 'Quận 1', 'TP. Hồ Chí Minh', 18990000, 0, 0, 18990000, 'vnpay', 'paid', 'processing', NOW());

-- ==================================================
-- 13. ORDER_DETAILS - Chi tiết đơn hàng
-- ==================================================
INSERT INTO order_details (order_id, product_id, product_name, sku, price, quantity, subtotal) VALUES
(1, 3, 'iPhone 13', 'IP13-001', 16990000, 1, 16990000),
(2, 1, 'iPhone 15 Pro Max', 'IP15PM-001', 28990000, 1, 28990000),
(3, 8, 'Xiaomi Redmi Note 13 Pro', 'RN13P-001', 7490000, 1, 7490000),
(4, 13, 'AirPods Pro 2', 'APP2-001', 5990000, 1, 5990000),
(5, 7, 'Xiaomi 14 Pro', 'XM14P-001', 18990000, 1, 18990000);

-- ==================================================
-- 14. REVIEWS - Đánh giá sản phẩm
-- ==================================================
INSERT INTO reviews (product_id, user_id, order_id, rating, title, comment, is_verified_purchase, status) VALUES
(3, 4, 1, 5, 'Sản phẩm tuyệt vời', 'iPhone 13 vẫn rất mượt, pin trâu, camera đẹp. Giá cả hợp lý!', TRUE, 'approved'),
(1, 5, 2, 5, 'Đỉnh cao công nghệ', 'iPhone 15 Pro Max xứng đáng là flagship 2024. Camera xuất sắc, hiệu năng khủng!', TRUE, 'approved'),
(8, 4, 3, 4, 'Tốt trong tầm giá', 'Camera 200MP rất ấn tượng, pin khỏe. Tuy nhiên màn hình hơi kém so với giá tiền.', TRUE, 'approved'),
(13, 6, 4, 5, 'Tai nghe đáng mua', 'Chất lượng âm thanh tuyệt vời, chống ồn rất tốt. Xứng đáng!', TRUE, 'approved');

-- ==================================================
-- 15. POSTS - Bài viết
-- ==================================================
INSERT INTO posts (title, slug, content, excerpt, author_id, category, is_published, published_at) VALUES
('iPhone 15 Pro Max: Đánh giá chi tiết sau 1 tháng sử dụng', 'iphone-15-pro-max-danh-gia-chi-tiet', 
'<p>Sau 1 tháng trải nghiệm iPhone 15 Pro Max, đây là những chia sẻ của chúng tôi...</p>', 
'Đánh giá toàn diện về iPhone 15 Pro Max sau thời gian sử dụng thực tế', 
1, 'review', TRUE, DATE_SUB(NOW(), INTERVAL 5 DAY)),

('Top 5 smartphone đáng mua nhất tháng 1/2024', 'top-5-smartphone-dang-mua-2024', 
'<p>Tổng hợp 5 smartphone tốt nhất hiện nay với mọi phân khúc giá...</p>', 
'Danh sách smartphone được đánh giá cao nhất đầu năm 2024', 
1, 'guide', TRUE, DATE_SUB(NOW(), INTERVAL 3 DAY)),

('Flash Sale cuối tuần: Giảm giá sốc đến 30%', 'flash-sale-cuoi-tuan', 
'<p>Chương trình Flash Sale hấp dẫn với hàng loạt sản phẩm hot...</p>', 
'Khuyến mãi đặc biệt cuối tuần này', 
1, 'promotion', TRUE, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ==================================================
-- 16. WISHLISTS - Yêu thích
-- ==================================================
INSERT INTO wishlists (user_id, product_id) VALUES
(4, 1), (4, 4), (4, 11),
(5, 2), (5, 7),
(6, 1), (6, 5), (6, 13);

-- ==================================================
-- 17. PRODUCT_VIEWS - Lượt xem
-- ==================================================
INSERT INTO product_views (user_id, product_id, viewed_at) VALUES
(4, 1, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(4, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(5, 1, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(5, 4, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(6, 3, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ==================================================
-- 18. SETTINGS - Cấu hình hệ thống
-- ==================================================
INSERT INTO settings (setting_key, setting_value, description, data_type, is_public) VALUES
('site_name', 'Mobile Shop', 'Tên website', 'string', TRUE),
('site_description', 'Chuyên cung cấp điện thoại, laptop, phụ kiện chính hãng', 'Mô tả website', 'string', TRUE),
('free_shipping_threshold', '5000000', 'Ngưỡng miễn phí ship (VNĐ)', 'number', TRUE),
('default_shipping_fee', '30000', 'Phí ship mặc định (VNĐ)', 'number', TRUE),
('contact_phone', '1900-xxxx', 'Hotline', 'string', TRUE),
('contact_email', 'support@mobileshop.com', 'Email hỗ trợ', 'string', TRUE),
('currency', 'VND', 'Đơn vị tiền tệ', 'string', TRUE),
('points_per_vnd', '1', 'Tỷ lệ tích điểm (1 điểm / x VNĐ)', 'number', FALSE);

-- ==================================================
-- Cập nhật rating trung bình cho sản phẩm
-- ==================================================
UPDATE products p
SET rating_avg = (
    SELECT AVG(rating) 
    FROM reviews r 
    WHERE r.product_id = p.product_id AND r.status = 'approved'
),
review_count = (
    SELECT COUNT(*) 
    FROM reviews r 
    WHERE r.product_id = p.product_id AND r.status = 'approved'
);

-- ==================================================
-- END OF SEED DATA
-- ==================================================
