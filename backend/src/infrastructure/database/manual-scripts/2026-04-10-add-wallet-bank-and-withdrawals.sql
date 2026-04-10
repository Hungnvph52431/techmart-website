ALTER TABLE users
  ADD COLUMN withdraw_pin_hash VARCHAR(255) NULL AFTER wallet_balance,
  ADD COLUMN withdraw_pin_set_at TIMESTAMP NULL AFTER withdraw_pin_hash;

ALTER TABLE wallet_transactions
  MODIFY COLUMN type ENUM('topup', 'payment', 'refund', 'admin_adjust', 'withdraw_request', 'withdraw_reversal', 'withdraw_complete') NOT NULL;

CREATE TABLE user_bank_accounts (
  bank_account_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bank_code VARCHAR(50) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_holder_name VARCHAR(255) NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY uniq_user_bank_account (user_id),
  INDEX idx_bank_code (bank_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wallet_withdrawal_requests (
  withdrawal_request_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bank_account_id INT NOT NULL,
  reference_code VARCHAR(50) NOT NULL UNIQUE,
  amount DECIMAL(15,2) NOT NULL,
  status ENUM('pending', 'approved', 'paid', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  bank_code VARCHAR(50) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_holder_name VARCHAR(255) NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  customer_note TEXT,
  admin_note TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  paid_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  processed_by INT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES user_bank_accounts(bank_account_id) ON DELETE RESTRICT,
  FOREIGN KEY (processed_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_user_status (user_id, status),
  INDEX idx_requested_at (requested_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
