-- Create database if not exists
USE omada_dev;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role ENUM('master', 'admin', 'vendedor') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create omada_credentials table
CREATE TABLE IF NOT EXISTS omada_credentials (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    omada_url TEXT NOT NULL,
    omadac_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create sites table
CREATE TABLE IF NOT EXISTS sites (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name TEXT NOT NULL,
    location TEXT,
    omada_site_id TEXT,
    status ENUM('active', 'inactive', 'syncing') DEFAULT 'active' NOT NULL,
    last_sync TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create user_site_access table
CREATE TABLE IF NOT EXISTS user_site_access (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    site_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nome TEXT NOT NULL,
    comprimento_voucher INT NOT NULL,
    tipo_codigo TEXT NOT NULL,
    tipo_limite TEXT NOT NULL,
    code_form TEXT NOT NULL,
    duration INT NOT NULL,
    down_limit INT NOT NULL,
    up_limit INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
    site_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code TEXT NOT NULL UNIQUE,
    plan_id VARCHAR(36) NOT NULL,
    site_id VARCHAR(36) NOT NULL,
    status ENUM('available', 'used', 'expired') DEFAULT 'available' NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    voucher_id VARCHAR(36) NOT NULL,
    seller_id VARCHAR(36) NOT NULL,
    site_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- Insert a default master user for testing
INSERT IGNORE INTO users (id, username, email, password, role) 
VALUES (UUID(), 'master', 'master@omada.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdoWxz1eYE8hqv2Y.', 'master');