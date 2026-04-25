-- Xóa hoàn toàn role 'warehouse' và feature warehouse receipt khỏi hệ thống.
-- Lý do: feature kiểm tra "hàng tốt/lỗi" ở khâu warehouse đã được thay thế
-- bằng luồng inspection (xem migration 2026-04-25-add-return-inspection.sql).
-- Role 'warehouse' không có user nào sử dụng, không còn lý do tồn tại.

-- 1) Đảm bảo không còn user nào ở role 'warehouse' (nếu có thì migrate sang 'staff')
UPDATE users SET role = 'staff' WHERE role = 'warehouse';

-- 2) Bỏ 'warehouse' khỏi enum users.role
ALTER TABLE users
  MODIFY COLUMN role ENUM('customer','admin','staff','shipper') NOT NULL DEFAULT 'customer';

-- 3) Drop các cột warehouse trên bảng orders
ALTER TABLE orders
  DROP COLUMN warehouse_received_at,
  DROP COLUMN warehouse_condition;

-- 4) Bỏ 'warehouse' khỏi enum order_events.actor_role (an toàn vì không event nào dùng)
ALTER TABLE order_events
  MODIFY COLUMN actor_role ENUM('customer', 'admin', 'staff', 'shipper', 'system');
