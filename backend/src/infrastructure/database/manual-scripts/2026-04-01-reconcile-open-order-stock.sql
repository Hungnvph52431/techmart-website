-- One-time reconciliation after moving stock deduction from order creation to delivery time.
-- Run exactly once per environment right after deploying the code change.

START TRANSACTION;

SET @migration_key := 'inventory.reconcile_open_order_stock_2026_04_01';
SET @migration_note := 'Reconcile open-order stock after moving stock deduction to delivered';

-- Guard against running this script twice.
INSERT INTO settings (setting_key, setting_value, description, data_type)
VALUES (
  @migration_key,
  'in_progress',
  'One-time stock reconciliation for open orders after delivery-time deduction rollout',
  'string'
);

CREATE TEMPORARY TABLE tmp_open_product_stock AS
SELECT od.product_id, SUM(od.quantity) AS quantity
FROM order_details od
JOIN orders o ON o.order_id = od.order_id
WHERE o.deleted_at IS NULL
  AND o.status IN ('pending', 'confirmed', 'processing', 'shipping')
GROUP BY od.product_id;

CREATE TEMPORARY TABLE tmp_open_variant_stock AS
SELECT od.variant_id, SUM(od.quantity) AS quantity
FROM order_details od
JOIN orders o ON o.order_id = od.order_id
WHERE od.variant_id IS NOT NULL
  AND o.deleted_at IS NULL
  AND o.status IN ('pending', 'confirmed', 'processing', 'shipping')
GROUP BY od.variant_id;

UPDATE products p
JOIN tmp_open_product_stock t ON t.product_id = p.product_id
SET p.stock_quantity = p.stock_quantity + t.quantity;

UPDATE product_variants pv
JOIN tmp_open_variant_stock t ON t.variant_id = pv.variant_id
SET pv.stock_quantity = pv.stock_quantity + t.quantity;

INSERT INTO inventory_transactions (
  product_id,
  variant_id,
  transaction_type,
  quantity,
  reference_type,
  reference_id,
  notes,
  created_by
)
SELECT
  t.product_id,
  NULL,
  'adjustment',
  t.quantity,
  'migration',
  20260401,
  @migration_note,
  NULL
FROM tmp_open_product_stock t;

INSERT INTO inventory_transactions (
  product_id,
  variant_id,
  transaction_type,
  quantity,
  reference_type,
  reference_id,
  notes,
  created_by
)
SELECT
  pv.product_id,
  t.variant_id,
  'adjustment',
  t.quantity,
  'migration',
  20260401,
  @migration_note,
  NULL
FROM tmp_open_variant_stock t
JOIN product_variants pv ON pv.variant_id = t.variant_id;

UPDATE settings
SET setting_value = 'done'
WHERE setting_key = @migration_key;

DROP TEMPORARY TABLE IF EXISTS tmp_open_product_stock;
DROP TEMPORARY TABLE IF EXISTS tmp_open_variant_stock;

COMMIT;
