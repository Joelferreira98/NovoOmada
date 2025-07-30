import { 
  users, sites, plans, vouchers, sales, omadaCredentials, userSiteAccess,
  type User, type InsertUser, type Site, type InsertSite, 
  type Plan, type InsertPlan, type Voucher, type InsertVoucher,
  type OmadaCredentials, type InsertOmadaCredentials, type Sale
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAdminsBySite(siteId: string): Promise<User[]>;
  getVendedoresBySite(siteId: string): Promise<User[]>;

  // Site management
  getAllSites(): Promise<Site[]>;
  getSiteById(id: string): Promise<Site | undefined>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: string, site: Partial<Site>): Promise<Site | undefined>;
  getUserSites(userId: string): Promise<Site[]>;
  assignUserToSite(userId: string, siteId: string): Promise<void>;
  removeUserFromSite(userId: string, siteId: string): Promise<void>;

  // Omada credentials
  getOmadaCredentials(): Promise<OmadaCredentials | undefined>;
  createOmadaCredentials(credentials: InsertOmadaCredentials): Promise<OmadaCredentials>;
  updateOmadaCredentials(id: string, credentials: Partial<OmadaCredentials>): Promise<OmadaCredentials | undefined>;

  // Plan management
  getPlansBySite(siteId: string): Promise<Plan[]>;
  getPlanById(id: string): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, plan: Partial<Plan>): Promise<Plan | undefined>;
  deletePlan(id: string): Promise<boolean>;

  // Voucher management
  createVoucher(voucher: InsertVoucher): Promise<Voucher>;
  getVouchersByUser(userId: string, siteId?: string): Promise<Voucher[]>;
  getVouchersBySite(siteId: string): Promise<Voucher[]>;
  updateVoucherStatus(id: string, status: string): Promise<Voucher | undefined>;

  // Sales and reporting
  createSale(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale>;
  getSalesByUser(userId: string): Promise<Sale[]>;
  getSalesBySite(siteId: string): Promise<Sale[]>;
  getDailyStats(userId: string, siteId?: string): Promise<{
    vouchersToday: number;
    revenueToday: string;
    averageDaily: string;
  }>;
  getSiteStats(siteId: string): Promise<{
    vouchersToday: number;
    revenueToday: string;
    activeSellers: number;
    activePlans: number;
  }>;

  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAdminsBySite(siteId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .innerJoin(userSiteAccess, eq(users.id, userSiteAccess.userId))
      .where(and(
        eq(userSiteAccess.siteId, siteId),
        eq(users.role, 'admin')
      ));
  }

  async getVendedoresBySite(siteId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .innerJoin(userSiteAccess, eq(users.id, userSiteAccess.userId))
      .where(and(
        eq(userSiteAccess.siteId, siteId),
        eq(users.role, 'vendedor')
      ));
  }

  async getAllSites(): Promise<Site[]> {
    return await db.select().from(sites).orderBy(sites.name);
  }

  async getSiteById(id: string): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.id, id));
    return site;
  }

  async createSite(site: InsertSite): Promise<Site> {
    const [newSite] = await db.insert(sites).values(site).returning();
    return newSite;
  }

  async updateSite(id: string, site: Partial<Site>): Promise<Site | undefined> {
    const [updatedSite] = await db
      .update(sites)
      .set({ ...site, lastSync: new Date() })
      .where(eq(sites.id, id))
      .returning();
    return updatedSite;
  }

  async getUserSites(userId: string): Promise<Site[]> {
    return await db
      .select()
      .from(sites)
      .innerJoin(userSiteAccess, eq(sites.id, userSiteAccess.siteId))
      .where(eq(userSiteAccess.userId, userId));
  }

  async assignUserToSite(userId: string, siteId: string): Promise<void> {
    await db.insert(userSiteAccess).values({ userId, siteId });
  }

  async removeUserFromSite(userId: string, siteId: string): Promise<void> {
    await db
      .delete(userSiteAccess)
      .where(and(
        eq(userSiteAccess.userId, userId),
        eq(userSiteAccess.siteId, siteId)
      ));
  }

  async getOmadaCredentials(): Promise<OmadaCredentials | undefined> {
    const [credentials] = await db.select().from(omadaCredentials).limit(1);
    return credentials;
  }

  async createOmadaCredentials(credentials: InsertOmadaCredentials): Promise<OmadaCredentials> {
    const [newCredentials] = await db.insert(omadaCredentials).values(credentials).returning();
    return newCredentials;
  }

  async updateOmadaCredentials(id: string, credentials: Partial<OmadaCredentials>): Promise<OmadaCredentials | undefined> {
    const [updatedCredentials] = await db
      .update(omadaCredentials)
      .set(credentials)
      .where(eq(omadaCredentials.id, id))
      .returning();
    return updatedCredentials;
  }

  async getPlansBySite(siteId: string): Promise<Plan[]> {
    return await db.select().from(plans).where(eq(plans.siteId, siteId)).orderBy(plans.nome);
  }

  async getPlanById(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [newPlan] = await db.insert(plans).values(plan).returning();
    return newPlan;
  }

  async updatePlan(id: string, plan: Partial<Plan>): Promise<Plan | undefined> {
    const [updatedPlan] = await db
      .update(plans)
      .set(plan)
      .where(eq(plans.id, id))
      .returning();
    return updatedPlan;
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await db.delete(plans).where(eq(plans.id, id));
    return result.rowCount > 0;
  }

  async createVoucher(voucher: InsertVoucher): Promise<Voucher> {
    const [newVoucher] = await db.insert(vouchers).values(voucher).returning();
    return newVoucher;
  }

  async getVouchersByUser(userId: string, siteId?: string): Promise<Voucher[]> {
    let query = db
      .select()
      .from(vouchers)
      .where(eq(vouchers.createdBy, userId))
      .orderBy(desc(vouchers.createdAt));

    if (siteId) {
      query = query.where(and(
        eq(vouchers.createdBy, userId),
        eq(vouchers.siteId, siteId)
      ));
    }

    return await query;
  }

  async getVouchersBySite(siteId: string): Promise<Voucher[]> {
    return await db
      .select()
      .from(vouchers)
      .where(eq(vouchers.siteId, siteId))
      .orderBy(desc(vouchers.createdAt));
  }

  async updateVoucherStatus(id: string, status: string): Promise<Voucher | undefined> {
    const [updatedVoucher] = await db
      .update(vouchers)
      .set({ status: status as any, usedAt: status === 'used' ? new Date() : undefined })
      .where(eq(vouchers.id, id))
      .returning();
    return updatedVoucher;
  }

  async createSale(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
    const [newSale] = await db.insert(sales).values({
      ...sale,
      createdAt: new Date()
    } as any).returning();
    return newSale;
  }

  async getSalesByUser(userId: string): Promise<Sale[]> {
    return await db
      .select()
      .from(sales)
      .where(eq(sales.sellerId, userId))
      .orderBy(desc(sales.createdAt));
  }

  async getSalesBySite(siteId: string): Promise<Sale[]> {
    return await db
      .select()
      .from(sales)
      .where(eq(sales.siteId, siteId))
      .orderBy(desc(sales.createdAt));
  }

  async getDailyStats(userId: string, siteId?: string): Promise<{
    vouchersToday: number;
    revenueToday: string;
    averageDaily: string;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let voucherQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(vouchers)
      .where(and(
        eq(vouchers.createdBy, userId),
        sql`${vouchers.createdAt} >= ${today}`
      ));

    if (siteId) {
      voucherQuery = voucherQuery.where(and(
        eq(vouchers.createdBy, userId),
        eq(vouchers.siteId, siteId),
        sql`${vouchers.createdAt} >= ${today}`
      ));
    }

    const [voucherResult] = await voucherQuery;
    
    let salesQuery = db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(sales)
      .where(and(
        eq(sales.sellerId, userId),
        sql`${sales.createdAt} >= ${today}`
      ));

    if (siteId) {
      salesQuery = salesQuery.where(and(
        eq(sales.sellerId, userId),
        eq(sales.siteId, siteId),
        sql`${sales.createdAt} >= ${today}`
      ));
    }

    const [salesResult] = await salesQuery;

    // Calculate average for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let avgQuery = db
      .select({ avg: sql<string>`COALESCE(AVG(daily_total), 0)` })
      .from(
        db
          .select({ daily_total: sql<string>`SUM(amount)` })
          .from(sales)
          .where(and(
            eq(sales.sellerId, userId),
            sql`${sales.createdAt} >= ${thirtyDaysAgo}`
          ))
          .groupBy(sql`DATE(${sales.createdAt})`)
          .as('daily_sales')
      );

    const [avgResult] = await avgQuery;

    return {
      vouchersToday: voucherResult.count,
      revenueToday: salesResult.total,
      averageDaily: avgResult.avg
    };
  }

  async getSiteStats(siteId: string): Promise<{
    vouchersToday: number;
    revenueToday: string;
    activeSellers: number;
    activePlans: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [voucherResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vouchers)
      .where(and(
        eq(vouchers.siteId, siteId),
        sql`${vouchers.createdAt} >= ${today}`
      ));

    const [salesResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(sales)
      .where(and(
        eq(sales.siteId, siteId),
        sql`${sales.createdAt} >= ${today}`
      ));

    const [sellersResult] = await db
      .select({ count: sql<number>`count(DISTINCT seller_id)` })
      .from(sales)
      .innerJoin(users, eq(sales.sellerId, users.id))
      .where(and(
        eq(sales.siteId, siteId),
        eq(users.role, 'vendedor')
      ));

    const [plansResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(plans)
      .where(and(
        eq(plans.siteId, siteId),
        eq(plans.status, 'active')
      ));

    return {
      vouchersToday: voucherResult.count,
      revenueToday: salesResult.total,
      activeSellers: sellersResult.count,
      activePlans: plansResult.count
    };
  }
}

export const storage = new DatabaseStorage();
