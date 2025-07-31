import { 
  users, sites, plans, vouchers, sales, omadaCredentials, userSiteAccess,
  type User, type InsertUser, type Site, type InsertSite, 
  type Plan, type InsertPlan, type Voucher, type InsertVoucher,
  type OmadaCredentials, type InsertOmadaCredentials, type Sale
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getAdminsBySite(siteId: string): Promise<User[]>;
  getVendedoresBySite(siteId: string): Promise<User[]>;

  // Site management
  getAllSites(): Promise<Site[]>;
  getSiteById(id: string): Promise<Site | undefined>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: string, site: Partial<Site>): Promise<Site | undefined>;
  getUserSites(userId: string): Promise<Site[]>;
  assignUserToSite(userId: string, siteId: string): Promise<void>;
  assignSitesToUser(userId: string, siteIds: string[]): Promise<void>;
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

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
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
    // Generate UUID for the user
    const userId = crypto.randomUUID();
    const userWithId = { ...insertUser, id: userId };
    
    console.log('Creating user with data:', userWithId);
    
    try {
      const insertResult = await db.insert(users).values(userWithId);
      console.log('Insert result:', insertResult);
      
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      console.log('Created user retrieved:', user);
      
      if (!user) {
        throw new Error('User was not created properly');
      }
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
  }

  async updateUser(id: string, user: Partial<User>): Promise<User | undefined> {
    await db
      .update(users)
      .set(user)
      .where(eq(users.id, id));
    const [updatedUser] = await db.select().from(users).where(eq(users.id, id));
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.affectedRows || 0) > 0;
  }

  async getAdminsBySite(siteId: string): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .innerJoin(userSiteAccess, eq(users.id, userSiteAccess.userId))
      .where(and(
        eq(userSiteAccess.siteId, siteId),
        eq(users.role, 'admin')
      ));
    return result;
  }

  async getVendedoresBySite(siteId: string): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .innerJoin(userSiteAccess, eq(users.id, userSiteAccess.userId))
      .where(and(
        eq(userSiteAccess.siteId, siteId),
        eq(users.role, 'vendedor')
      ));
    return result;
  }

  async getAllSites(): Promise<Site[]> {
    return await db.select().from(sites).orderBy(sites.name);
  }

  async getSiteById(id: string): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.id, id));
    return site;
  }

  async createSite(site: InsertSite): Promise<Site> {
    await db.insert(sites).values(site);
    const [newSite] = await db.select().from(sites).where(eq(sites.name, site.name));
    return newSite;
  }

  async updateSite(id: string, site: Partial<Site>): Promise<Site | undefined> {
    await db
      .update(sites)
      .set({ ...site, lastSync: new Date() })
      .where(eq(sites.id, id));
    const [updatedSite] = await db.select().from(sites).where(eq(sites.id, id));
    return updatedSite;
  }

  async getUserSites(userId: string): Promise<Site[]> {
    const result = await db
      .select({
        id: sites.id,
        name: sites.name,
        location: sites.location,
        omadaSiteId: sites.omadaSiteId,
        status: sites.status,
        lastSync: sites.lastSync,
        createdAt: sites.createdAt
      })
      .from(sites)
      .innerJoin(userSiteAccess, eq(sites.id, userSiteAccess.siteId))
      .where(eq(userSiteAccess.userId, userId));
    return result;
  }

  async assignUserToSite(userId: string, siteId: string): Promise<void> {
    await db.insert(userSiteAccess).values({ 
      userId, 
      siteId 
    });
  }

  async assignSitesToUser(userId: string, siteIds: string[]): Promise<void> {
    console.log(`Storage: Assigning sites to user ${userId}:`, siteIds);
    
    // Remove existing assignments
    const deleteResult = await db.delete(userSiteAccess).where(eq(userSiteAccess.userId, userId));
    console.log(`Deleted ${deleteResult.affectedRows || 0} existing assignments`);
    
    // Add new assignments
    if (siteIds && siteIds.length > 0) {
      const assignments = siteIds.map(siteId => ({ 
        userId, 
        siteId 
      }));
      console.log(`Creating assignments:`, assignments);
      
      const insertResult = await db.insert(userSiteAccess).values(assignments);
      console.log(`Inserted ${insertResult.affectedRows || 0} new assignments`);
    }
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
    await db.insert(omadaCredentials).values(credentials);
    const [newCredentials] = await db.select().from(omadaCredentials).orderBy(desc(omadaCredentials.createdAt)).limit(1);
    return newCredentials;
  }

  async updateOmadaCredentials(id: string, credentials: Partial<OmadaCredentials>): Promise<OmadaCredentials | undefined> {
    await db
      .update(omadaCredentials)
      .set(credentials)
      .where(eq(omadaCredentials.id, id));
    const [updatedCredentials] = await db.select().from(omadaCredentials).where(eq(omadaCredentials.id, id));
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
    await db.insert(plans).values(plan);
    const [newPlan] = await db.select().from(plans).orderBy(desc(plans.createdAt)).limit(1);
    return newPlan;
  }

  async updatePlan(id: string, plan: Partial<Plan>): Promise<Plan | undefined> {
    await db
      .update(plans)
      .set(plan)
      .where(eq(plans.id, id));
    const [updatedPlan] = await db.select().from(plans).where(eq(plans.id, id));
    return updatedPlan;
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await db.delete(plans).where(eq(plans.id, id));
    return (result.affectedRows || 0) > 0;
  }

  async createVoucher(voucher: InsertVoucher): Promise<Voucher> {
    const voucherId = crypto.randomUUID();
    const voucherWithId = { ...voucher, id: voucherId };
    
    await db.insert(vouchers).values(voucherWithId);
    const [newVoucher] = await db.select().from(vouchers).where(eq(vouchers.id, voucherId));
    return newVoucher;
  }

  async getVouchersByUser(userId: string, siteId?: string): Promise<Voucher[]> {
    if (siteId) {
      return await db
        .select()
        .from(vouchers)
        .where(and(
          eq(vouchers.createdBy, userId),
          eq(vouchers.siteId, siteId)
        ))
        .orderBy(desc(vouchers.createdAt));
    }

    return await db
      .select()
      .from(vouchers)
      .where(eq(vouchers.createdBy, userId))
      .orderBy(desc(vouchers.createdAt));
  }

  async getVouchersBySite(siteId: string): Promise<Voucher[]> {
    return await db
      .select()
      .from(vouchers)
      .where(eq(vouchers.siteId, siteId))
      .orderBy(desc(vouchers.createdAt));
  }

  async updateVoucherStatus(id: string, status: string): Promise<Voucher | undefined> {
    await db
      .update(vouchers)
      .set({ status: status as any, usedAt: status === 'used' ? new Date() : undefined })
      .where(eq(vouchers.id, id));
    const [updatedVoucher] = await db.select().from(vouchers).where(eq(vouchers.id, id));
    return updatedVoucher;
  }

  async createSale(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
    await db.insert(sales).values({
      ...sale,
      createdAt: new Date()
    } as any);
    const [newSale] = await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(1);
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
      voucherQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(vouchers)
        .where(and(
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
      salesQuery = db
        .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
        .from(sales)
        .where(and(
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
