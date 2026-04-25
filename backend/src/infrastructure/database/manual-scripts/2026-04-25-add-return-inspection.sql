-- Thêm bước "Kiểm tra hàng" (inspection) vào luồng hoàn/trả hàng.
-- Sau khi admin nhận hàng (received), phải kiểm tra tình trạng từng sản phẩm
-- (tốt / lỗi / khách làm hỏng) trước khi quyết định hoàn tiền + cộng kho.

-- 1) Thêm state 'inspected' giữa 'received' và 'refunded'
ALTER TABLE order_returns
  MODIFY COLUMN status
  ENUM('requested', 'approved', 'rejected', 'received', 'inspected', 'refunded', 'closed', 'cancelled')
  DEFAULT 'requested';

-- 2) Thêm các cột phục vụ inspection
ALTER TABLE order_returns
  ADD COLUMN inspected_at TIMESTAMP NULL AFTER received_at,
  ADD COLUMN inspected_by INT NULL AFTER inspected_at,
  ADD COLUMN inspection_note TEXT NULL AFTER inspected_by,
  ADD COLUMN inspection_evidence_images JSON NULL AFTER inspection_note,
  ADD COLUMN refund_amount DECIMAL(12,2) NULL AFTER inspection_evidence_images,
  ADD CONSTRAINT fk_return_inspected_by
    FOREIGN KEY (inspected_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- 3) Thêm kết quả kiểm tra per-item + ghi chú riêng từng item
ALTER TABLE order_return_items
  ADD COLUMN inspection_result ENUM('good', 'defective', 'damaged_by_customer') NULL AFTER restock_action,
  ADD COLUMN inspection_note TEXT NULL AFTER inspection_result,
  ADD COLUMN refund_amount DECIMAL(12,2) NULL AFTER inspection_note;

-- 4) Thêm event 'return_inspected' cho timeline
ALTER TABLE order_events
  MODIFY COLUMN event_type ENUM(
    'order_created',
    'status_changed',
    'payment_status_changed',
    'order_cancelled',
    'return_requested',
    'return_approved',
    'return_rejected',
    'return_received',
    'return_inspected',
    'return_refunded',
    'return_closed',
    'return_cancelled'
  ) NOT NULL;

-- 5) Backfill: các đơn return đã ở trạng thái 'refunded' hoặc 'closed' trước khi migration
--    được coi là đã inspect với kết quả 'good' (giữ tương đương hành vi cũ là cộng kho ở warehouse receipt)
UPDATE order_returns
  SET inspected_at = COALESCE(received_at, refunded_at, closed_at)
  WHERE status IN ('refunded', 'closed')
    AND inspected_at IS NULL;

UPDATE order_return_items ori
  JOIN order_returns r ON r.order_return_id = ori.order_return_id
  SET ori.inspection_result = 'good'
  WHERE r.status IN ('refunded', 'closed')
    AND ori.inspection_result IS NULL;
