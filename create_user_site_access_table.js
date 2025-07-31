import mysql from 'mysql2/promise';

async function createTable() {
  const connection = await mysql.createConnection({
    host: 'hsstm.shop',
    user: 'root',
    password: '11032020',
    database: 'omada_dev'
  });

  try {
    console.log('Creating user_site_access table...');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_site_access (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        site_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        UNIQUE (user_id, site_id)
      )
    `);

    console.log('Table created successfully!');
    
    // Show tables to verify
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Tables in database:', tables);
    
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await connection.end();
  }
}

createTable();