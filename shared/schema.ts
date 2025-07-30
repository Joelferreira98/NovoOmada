import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["master", "admin", "vendedor"]);
export const planStatusEnum = pgEnum("plan_status", ["active", "inactive"]);
export const voucherStatusEnum = pgEnum("voucher_status", ["available", "used", "expired"]);
export const siteStatusEnum = pgEnum("site_status", ["active", "inactive", "syncing"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const omadaCredentials = pgTable("omada_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controllerUrl: text("controller_url").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  siteId: text("site_id").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sites = pgTable("sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location"),
  omadaSiteId: text("omada_site_id"),
  status: siteStatusEnum("status").default("active").notNull(),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSiteAccess = pgTable("user_site_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  siteId: varchar("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  comprimentoVoucher: integer("comprimento_voucher").notNull(),
  tipoCodigo: text("tipo_codigo").notNull(),
  tipoLimite: text("tipo_limite").notNull(),
  codeForm: text("code_form").notNull(),
  duration: integer("duration").notNull(), // in minutes
  downLimit: integer("down_limit").notNull(), // in Mbps
  upLimit: integer("up_limit").notNull(), // in Mbps
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  status: planStatusEnum("status").default("active").notNull(),
  siteId: varchar("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vouchers = pgTable("vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  planId: varchar("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  siteId: varchar("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  status: voucherStatusEnum("status").default("available").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voucherId: varchar("voucher_id").notNull().references(() => vouchers.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  siteId: varchar("site_id").notNull().references(() => sites.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  siteAccess: many(userSiteAccess),
  createdPlans: many(plans),
  createdVouchers: many(vouchers),
  sales: many(sales),
}));

export const sitesRelations = relations(sites, ({ many }) => ({
  userAccess: many(userSiteAccess),
  plans: many(plans),
  vouchers: many(vouchers),
  sales: many(sales),
}));

export const userSiteAccessRelations = relations(userSiteAccess, ({ one }) => ({
  user: one(users, { fields: [userSiteAccess.userId], references: [users.id] }),
  site: one(sites, { fields: [userSiteAccess.siteId], references: [sites.id] }),
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
  site: one(sites, { fields: [plans.siteId], references: [sites.id] }),
  createdBy: one(users, { fields: [plans.createdBy], references: [users.id] }),
  vouchers: many(vouchers),
}));

export const vouchersRelations = relations(vouchers, ({ one, many }) => ({
  plan: one(plans, { fields: [vouchers.planId], references: [plans.id] }),
  site: one(sites, { fields: [vouchers.siteId], references: [sites.id] }),
  createdBy: one(users, { fields: [vouchers.createdBy], references: [users.id] }),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  voucher: one(vouchers, { fields: [sales.voucherId], references: [vouchers.id] }),
  seller: one(users, { fields: [sales.sellerId], references: [users.id] }),
  site: one(sites, { fields: [sales.siteId], references: [sites.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSiteSchema = createInsertSchema(sites).omit({
  id: true,
  createdAt: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
});

export const insertVoucherSchema = createInsertSchema(vouchers).omit({
  id: true,
  createdAt: true,
});

export const insertOmadaCredentialsSchema = createInsertSchema(omadaCredentials).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type OmadaCredentials = typeof omadaCredentials.$inferSelect;
export type InsertOmadaCredentials = z.infer<typeof insertOmadaCredentialsSchema>;
export type Sale = typeof sales.$inferSelect;
