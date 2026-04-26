-- Tính năng tích điểm khách hàng:
--   - Khách hàng được +1 điểm cho mỗi 1.000đ chi tiêu (tính trên subtotal — không tính phí ship)
--   - Điểm được cộng khi đơn chuyển sang status 'completed'
--   - Khi refund, điểm tương ứng bị trừ lại
--   - Tổng điểm tích lũy quyết định hạng membership: bronze < 10k ≤ silver < 50k ≤ gold < 200k ≤ platinum

-- Bảng audit lịch sử thay đổi điểm
CREATE TABLE user_points_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    change_amount INT NOT NULL,
    balance_after INT NOT NULL,
    reason ENUM('order_completed', 'order_refunded', 'admin_adjust') NOT NULL,
    order_id INT NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL,
    INDEX idx_user (user_id, created_at),
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
