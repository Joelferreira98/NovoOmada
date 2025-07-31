CREATE TABLE IF NOT EXISTS print_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  vendedor_id VARCHAR(36) NOT NULL,
  site_id VARCHAR(36) NOT NULL,
  print_type ENUM('a4', 'thermal') NOT NULL,
  voucher_codes JSON NOT NULL,
  print_title TEXT NOT NULL,
  html_content LONGTEXT NOT NULL,
  voucher_count INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendedor_id) REFERENCES users(id),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);