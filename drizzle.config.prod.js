import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'omada_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'omada_voucher',
    port: parseInt(process.env.DB_PORT || '3306'),
  },
});