ALTER TABLE reviews
  MODIFY COLUMN user_id INT NULL;

ALTER TABLE order_returns
  DROP FOREIGN KEY order_returns_ibfk_2;

ALTER TABLE order_returns
  MODIFY COLUMN requested_by INT NULL;

ALTER TABLE order_returns
  ADD CONSTRAINT order_returns_ibfk_2
  FOREIGN KEY (requested_by) REFERENCES users(user_id) ON DELETE SET NULL;
