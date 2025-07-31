-- Initialize Omada Voucher System Database

USE omada_voucher;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('master', 'admin', 'vendedor') NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    omadaSiteId VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    lastSync TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sites (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    siteId VARCHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (siteId) REFERENCES sites(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_site (userId, siteId)
);

CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(36) PRIMARY KEY,
    siteId VARCHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    comprimentoVoucher INT NOT NULL DEFAULT 8,
    tipoCodigo VARCHAR(20) DEFAULT 'mixed',
    tipoLimite VARCHAR(20) DEFAULT 'duration',
    codeForm VARCHAR(50),
    duration INT NOT NULL,
    downLimit INT DEFAULT 0,
    upLimit INT DEFAULT 0,
    unitPrice DECIMAL(10,2) NOT NULL,
    userLimit INT DEFAULT 1,
    omadaLimitType INT DEFAULT 1,
    createdBy VARCHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (siteId) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vouchers (
    id VARCHAR(36) PRIMARY KEY,
    siteId VARCHAR(36) NOT NULL,
    planId VARCHAR(36),
    code VARCHAR(20) UNIQUE NOT NULL,
    status ENUM('active', 'used', 'expired') DEFAULT 'active',
    createdBy VARCHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiresAt TIMESTAMP NULL,
    usedAt TIMESTAMP NULL,
    FOREIGN KEY (siteId) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (planId) REFERENCES plans(id) ON DELETE SET NULL,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(36) PRIMARY KEY,
    voucherId VARCHAR(36) NOT NULL,
    siteId VARCHAR(36) NOT NULL,
    sellerId VARCHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voucherId) REFERENCES vouchers(id) ON DELETE CASCADE,
    FOREIGN KEY (siteId) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS print_history (
    id VARCHAR(36) PRIMARY KEY,
    voucherId VARCHAR(36) NOT NULL,
    siteId VARCHAR(36) NOT NULL,
    userId VARCHAR(36) NOT NULL,
    printType ENUM('A4', 'thermal') NOT NULL,
    printedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voucherId) REFERENCES vouchers(id) ON DELETE CASCADE,
    FOREIGN KEY (siteId) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS omada_credentials (
    id VARCHAR(36) PRIMARY KEY,
    omadaUrl VARCHAR(255) NOT NULL,
    clientId VARCHAR(100) NOT NULL,
    clientSecret VARCHAR(255) NOT NULL,
    omadacId VARCHAR(100) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sites_omada_id ON sites(omadaSiteId);
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_vouchers_site ON vouchers(siteId);
CREATE INDEX idx_sales_site_date ON sales(siteId, createdAt);
CREATE INDEX idx_print_history_site_date ON print_history(siteId, printedAt);

-- Insert default master user (password: admin123)
INSERT IGNORE INTO users (id, username, email, password, role) VALUES 
('master-user-id', 'admin', 'admin@example.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'master');