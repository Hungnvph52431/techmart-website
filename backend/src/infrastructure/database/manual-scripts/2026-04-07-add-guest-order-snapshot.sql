ALTER TABLE orders
  MODIFY COLUMN user_id INT NULL;

ALTER TABLE orders
  ADD COLUMN customer_name VARCHAR(255) NULL AFTER user_id,
  ADD COLUMN customer_email VARCHAR(255) NULL AFTER customer_name,
  ADD COLUMN customer_phone VARCHAR(20) NULL AFTER customer_email;

UPDATE orders o
LEFT JOIN users u ON u.user_id = o.user_id
SET
  o.customer_name = COALESCE(o.customer_name, u.name, o.shipping_name),
  o.customer_email = COALESCE(o.customer_email, u.email),
  o.customer_phone = COALESCE(o.customer_phone, u.phone, o.shipping_phone)
WHERE
  o.customer_name IS NULL
  OR o.customer_email IS NULL
  OR o.customer_phone IS NULL;

CREATE INDEX idx_orders_customer_email ON orders (customer_email);
