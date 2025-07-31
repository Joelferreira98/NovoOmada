import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// MySQL connection pool configuration
const pool = mysql.createPool({
  host: 'hsstm.shop',
  user: 'root',
  password: '11032020',
  database: 'omada_dev',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const db = drizzle(pool, { schema, mode: 'default' });
export { pool };