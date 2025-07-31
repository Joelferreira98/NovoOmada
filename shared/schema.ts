import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, pgEnum, primaryKey, json, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("role", ["master", "admin", "vendedor"]);
export const planStatusEnum = pgEnum("plan_status", ["active", "inactive"]);
export const voucherStatusEnum = pgEnum("voucher_status", ["available", "used", "expired"]);
export const siteStatusEnum = pgEnum("site_status", ["active", "inactive", "syncing"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const omadaCredentials = pgTable("omada_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  omadaUrl: text("omada_url").notNull(),
  omadacId: text("omadac_id").notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  location: text("location"),
  omadaSiteId: text("omada_site_id"),
  status: siteStatusEnum("status").default("active").notNull(),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSiteAccess = pgTable("user_site_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  nome: varchar("nome", { length: 100 }).notNull(),
  comprimentoVoucher: integer("comprimento_voucher").notNull(),
  tipoCodigo: varchar("tipo_codigo", { length: 20 }).notNull(),
  tipoLimite: varchar("tipo_limite", { length: 20 }).notNull(),
  codeForm: varchar("code_form", { length: 50 }),
  duration: integer("duration").notNull(),
  downLimit: integer("down_limit").default(0),
  upLimit: integer("up_limit").default(0),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  userLimit: integer("user_limit").default(1), // Number of simultaneous users
  omadaLimitType: integer("omada_limit_type").default(1), // Maps to Omada API: 0=Limited Usage, 1=Limited Online Users, 2=Unlimited
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vouchers = pgTable("vouchers", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  vendedorId: uuid("vendedor_id").notNull().references(() => users.id),
  omadaGroupId: text("omada_group_id"), // ID do grupo no Omada
  omadaVoucherId: text("omada_voucher_id"), // ID do voucher individual no Omada
  status: voucherStatusEnum("status").default("available").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sistema de Caixa - Grupos de Vouchers da Omada
export const voucherGroups = pgTable("voucher_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  omadaGroupId: text("omada_group_id").notNull(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("BRL"),
  totalCount: integer("total_count").default(0),
  usedCount: integer("used_count").default(0),
  inUseCount: integer("in_use_count").default(0),
  unusedCount: integer("unused_count").default(0),
  expiredCount: integer("expired_count").default(0),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0.00"),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fechamentos de Caixa
export const cashClosures = pgTable("cash_closures", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  vendedorId: uuid("vendedor_id").notNull().references(() => users.id),
  totalVouchersUsed: integer("total_vouchers_used").notNull(),
  totalVouchersInUse: integer("total_vouchers_in_use").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  summary: json("summary"), // JSON com detalhes por grupo
  closureDate: timestamp("closure_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  voucherId: uuid("voucher_id").notNull().references(() => vouchers.id),
  sellerId: uuid("seller_id").notNull().references(() => users.id),
  siteId: uuid("site_id").notNull().references(() => sites.id),
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
  vendedor: one(users, { fields: [vouchers.vendedorId], references: [users.id] }),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  voucher: one(vouchers, { fields: [sales.voucherId], references: [vouchers.id] }),
  seller: one(users, { fields: [sales.sellerId], references: [users.id] }),
  site: one(sites, { fields: [sales.siteId], references: [sales.id] }),
}));

export const voucherGroupsRelations = relations(voucherGroups, ({ one }) => ({
  site: one(sites, { fields: [voucherGroups.siteId], references: [sites.id] }),
}));

export const cashClosuresRelations = relations(cashClosures, ({ one }) => ({
  site: one(sites, { fields: [cashClosures.siteId], references: [sites.id] }),
  vendedor: one(users, { fields: [cashClosures.vendedorId], references: [users.id] }),
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
  createdBy: true,
});

export const insertVoucherSchema = createInsertSchema(vouchers).omit({
  id: true,
  createdAt: true,
});

export const insertVoucherGroupSchema = createInsertSchema(voucherGroups).omit({
  createdAt: true,
});

export const insertCashClosureSchema = createInsertSchema(cashClosures).omit({
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
export type VoucherGroup = typeof voucherGroups.$inferSelect;
export type InsertVoucherGroup = z.infer<typeof insertVoucherGroupSchema>;
export type CashClosure = typeof cashClosures.$inferSelect;
export type InsertCashClosure = z.infer<typeof insertCashClosureSchema>;