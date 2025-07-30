import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'hsstm.shop',
  user: 'root',
  password: '11032020',
  database: 'omada_dev',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function createTables() {
  const connection = await pool.getConnection();
  
  try {
    // Drop existing tables if they exist (in correct order due to foreign keys)
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('DROP TABLE IF EXISTS user_sites');
    await connection.execute('DROP TABLE IF EXISTS user_site_access');
    await connection.execute('DROP TABLE IF EXISTS sales');
    await connection.execute('DROP TABLE IF EXISTS vouchers');
    await connection.execute('DROP TABLE IF EXISTS plans');
    await connection.execute('DROP TABLE IF EXISTS sites');
    await connection.execute('DROP TABLE IF EXISTS omada_credentials');
    await connection.execute('DROP TABLE IF EXISTS users');
    await connection.execute('DROP TABLE IF EXISTS session');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    // Create tables
    await connection.execute(`
      CREATE TABLE users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('master', 'admin', 'vendedor') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.execute(`
      CREATE TABLE omada_credentials (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        omada_url VARCHAR(255) NOT NULL,
        omadac_id VARCHAR(255) NOT NULL,
        client_id VARCHAR(255) NOT NULL,
        client_secret VARCHAR(255) NOT NULL,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    await connection.execute(`
      CREATE TABLE sites (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        omada_site_id VARCHAR(255),
        location VARCHAR(255),
        controller_ip VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.execute(`
      CREATE TABLE plans (
        id VARCHAR(36) PRIMARY KEY,
        site_id VARCHAR(36) NOT NULL,
        nome VARCHAR(100) NOT NULL,
        comprimento_voucher INT NOT NULL,
        tipo_codigo ENUM('digits', 'mixed', 'letters') NOT NULL,
        tipo_limite ENUM('unlimited', 'duration', 'data') NOT NULL,
        code_form VARCHAR(50),
        duration INT,
        down_limit INT,
        up_limit INT,
        unit_price DECIMAL(10,2) NOT NULL,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    await connection.execute(`
      CREATE TABLE vouchers (
        id VARCHAR(36) PRIMARY KEY,
        plan_id VARCHAR(36) NOT NULL,
        voucher_code VARCHAR(50) NOT NULL,
        status ENUM('active', 'used', 'expired') DEFAULT 'active',
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES plans(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    await connection.execute(`
      CREATE TABLE sales (
        id VARCHAR(36) PRIMARY KEY,
        voucher_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        customer_name VARCHAR(100),
        customer_phone VARCHAR(20),
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    await connection.execute(`
      CREATE TABLE user_sites (
        user_id VARCHAR(36) NOT NULL,
        site_id VARCHAR(36) NOT NULL,
        PRIMARY KEY (user_id, site_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (site_id) REFERENCES sites(id)
      )
    `);
    
    await connection.execute(`
      CREATE TABLE session (
        sid VARCHAR(36) PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL,
        INDEX IDX_session_expire (expire)
      )
    `);
    
    console.log('✅ All tables created successfully!');
    
    // Insert master user
    await connection.execute(`
      INSERT INTO users (id, username, email, password, role) VALUES 
      (UUID(), 'master', 'master@omada.com', 'ccb73e1d069de1912febc2caf6d691fa15aa5537da3052c0da99565e13836e7e8c5f2c0633109b1503b8eb993586e5a223cbe32b1132746be013fe74dec7c054.ca9cbff9408dd44f9211c78257bdfeeb', 'master')
    `);
    
    console.log('✅ Master user created!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    connection.release();
    await pool.end();
  }
}

createTables();