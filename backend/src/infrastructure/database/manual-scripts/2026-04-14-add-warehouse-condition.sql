ALTER TABLE orders
  ADD COLUMN warehouse_condition ENUM('good', 'defective') NULL AFTER warehouse_received_at;
