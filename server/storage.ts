import { 
  users, sites, plans, vouchers, sales, omadaCredentials, userSiteAccess,
  voucherGroups, cashClosures,
  type User, type InsertUser, type Site, type InsertSite, 
  type Plan, type InsertPlan, type Voucher, type InsertVoucher,
  type OmadaCredentials, type InsertOmadaCredentials, type Sale,
  type VoucherGroup, type InsertVoucherGroup,
  type CashClosure, type InsertCashClosure
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
  getVouchersByVendedor(vendedorId: string, siteId: string): Promise<Voucher[]>;
  getVouchersBySite(siteId: string): Promise<Voucher[]>;
  updateVoucherStatus(id: string, status: string): Promise<Voucher | undefined>;
  getVendedorDailyStats(vendedorId: string, siteId: string): Promise<{
    vouchersToday: number;
    revenueToday: string;
    averageDaily: string;
  }>;

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

  // Cash closure system
  createCashClosure(closure: Omit<InsertCashClosure, 'id' | 'createdAt'>): Promise<CashClosure>;
  getCashClosures(siteId: string): Promise<CashClosure[]>;

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
    return result.rowsAffected > 0;
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
      id: crypto.randomUUID(),
      userId, 
      siteId 
    });
  }

  async assignSitesToUser(userId: string, siteIds: string[]): Promise<void> {
    console.log(`Storage: Assigning sites to user ${userId}:`, siteIds);
    
    try {
      // Remove existing assignments
      const deleteResult = await db.delete(userSiteAccess).where(eq(userSiteAccess.userId, userId));
      console.log(`Deleted ${deleteResult.affectedRows || 0} existing assignments`);
      
      // Add new assignments
      if (siteIds && siteIds.length > 0) {
        const assignments = siteIds.map(siteId => ({ 
          id: crypto.randomUUID(),
          userId, 
          siteId 
        }));
        console.log(`Creating assignments:`, assignments);
        
        const insertResult = await db.insert(userSiteAccess).values(assignments);
        console.log(`Inserted ${insertResult.affectedRows || 0} new assignments`);
      }
    } catch (error) {
      console.error(`Error in assignSitesToUser:`, error);
      throw error;
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
    // Generate UUID for MySQL since it doesn't support default UUID()
    const planWithId = {
      id: crypto.randomUUID(),
      siteId: plan.siteId,
      nome: plan.nome,
      comprimentoVoucher: plan.comprimentoVoucher,
      tipoCodigo: plan.tipoCodigo,
      tipoLimite: plan.tipoLimite,
      codeForm: plan.codeForm,
      duration: plan.duration,
      downLimit: plan.downLimit || 0,
      upLimit: plan.upLimit || 0,
      unitPrice: plan.unitPrice,
      userLimit: plan.userLimit || 1,
      omadaLimitType: plan.omadaLimitType || 1,
      createdBy: (plan as any).createdBy,
      createdAt: new Date(),
    };
    
    console.log("Inserting plan with explicit data:", JSON.stringify(planWithId, null, 2));
    
    await db.insert(plans).values(planWithId);
    const [newPlan] = await db.select().from(plans).where(eq(plans.id, planWithId.id));
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
    
    // Create the voucher data with correct field mapping for MySQL
    const voucherData = {
      id: voucherId,
      plan_id: voucher.planId,
      site_id: voucher.siteId,
      voucher_code: voucher.code, // Required field in DB
      code: voucher.code, // Keep for compatibility 
      status: voucher.status || 'available',
      created_by: voucher.vendedorId,
      vendedor_id: voucher.vendedorId,
      omada_group_id: voucher.omadaGroupId,
      omada_voucher_id: voucher.omadaVoucherId,
      unit_price: voucher.unitPrice,
      used_at: null,
      created_at: new Date()
    };
    
    console.log('Creating voucher with mapped data:', voucherData);
    
    // Use raw SQL to ensure exact field mapping with pool connection
    const { pool } = await import("./db");
    await pool.execute(`
      INSERT INTO vouchers (
        id, plan_id, site_id, voucher_code, code, status, 
        created_by, vendedor_id, omada_group_id, omada_voucher_id, 
        unit_price, used_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      voucherData.id,
      voucherData.plan_id,
      voucherData.site_id,
      voucherData.voucher_code,
      voucherData.code,
      voucherData.status,
      voucherData.created_by,
      voucherData.vendedor_id,
      voucherData.omada_group_id,
      voucherData.omada_voucher_id,
      voucherData.unit_price,
      voucherData.used_at,
      voucherData.created_at
    ]);
    
    const [newVoucher] = await db.select().from(vouchers).where(eq(vouchers.id, voucherId));
    return newVoucher;
  }

  async getVouchersByUser(userId: string, siteId?: string): Promise<Voucher[]> {
    if (siteId) {
      return await db
        .select()
        .from(vouchers)
        .where(and(
          eq(vouchers.vendedorId, userId),
          eq(vouchers.siteId, siteId)
        ))
        .orderBy(desc(vouchers.createdAt));
    }

    return await db
      .select()
      .from(vouchers)
      .where(eq(vouchers.vendedorId, userId))
      .orderBy(desc(vouchers.createdAt));
  }

  async getVouchersByVendedor(vendedorId: string, siteId: string): Promise<Voucher[]> {
    return await db
      .select()
      .from(vouchers)
      .where(and(
        eq(vouchers.vendedorId, vendedorId),
        eq(vouchers.siteId, siteId)
      ))
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
    const saleId = crypto.randomUUID();
    
    // Use raw SQL to handle exact field mapping for MySQL sales table
    const { pool } = await import("./db");
    await pool.execute(`
      INSERT INTO sales (
        id, voucher_id, seller_id, site_id, amount, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      saleId,
      sale.voucherId,
      sale.sellerId,
      sale.siteId,
      sale.amount,
      sale.sellerId, // Use seller as creator
      new Date()
    ]);
    
    const [newSale] = await db.select().from(sales).where(eq(sales.id, saleId));
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

    // Contar apenas vouchers VENDIDOS (status 'used'), não todos os gerados
    let voucherQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(vouchers)
      .where(and(
        eq(vouchers.vendedorId, userId),
        eq(vouchers.status, 'used'), // CORREÇÃO: apenas vouchers usados são vendas
        sql`${vouchers.usedAt} >= ${today}` // CORREÇÃO: usar usedAt em vez de createdAt
      ));

    if (siteId) {
      voucherQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(vouchers)
        .where(and(
          eq(vouchers.vendedorId, userId),
          eq(vouchers.siteId, siteId),
          eq(vouchers.status, 'used'), // CORREÇÃO: apenas vouchers usados são vendas
          sql`${vouchers.usedAt} >= ${today}` // CORREÇÃO: usar usedAt em vez de createdAt
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

    // Simplified average calculation - just get total for last 30 days and divide by 30
    let avgSalesQuery = db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(sales)
      .where(and(
        eq(sales.sellerId, userId),
        sql`${sales.createdAt} >= ${thirtyDaysAgo}`
      ));

    if (siteId) {
      avgSalesQuery = db
        .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
        .from(sales)
        .where(and(
          eq(sales.sellerId, userId),
          eq(sales.siteId, siteId),
          sql`${sales.createdAt} >= ${thirtyDaysAgo}`
        ));
    }

    const [avgSalesResult] = await avgSalesQuery;

    // Calculate average by dividing total by 30 days
    const avgDaily = (parseFloat(avgSalesResult.total) / 30).toFixed(2);

    return {
      vouchersToday: voucherResult.count,
      revenueToday: salesResult.total,
      averageDaily: avgDaily
    };
  }

  async getVendedorDailyStats(vendedorId: string, siteId: string): Promise<{
    vouchersToday: number;
    revenueToday: string;
    averageDaily: string;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // CORREÇÃO: Contar apenas vouchers VENDIDOS (status 'used'), não gerados
    const [voucherResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vouchers)
      .where(and(
        eq(vouchers.vendedorId, vendedorId),
        eq(vouchers.siteId, siteId),
        eq(vouchers.status, 'used'), // CORREÇÃO: apenas vouchers usados
        sql`${vouchers.usedAt} >= ${today}` // CORREÇÃO: usar usedAt
      ));

    const [salesResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(sales)
      .where(and(
        eq(sales.sellerId, vendedorId),
        eq(sales.siteId, siteId),
        sql`${sales.createdAt} >= ${today}`
      ));

    // Calculate average for last 30 days - simplified approach
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [avgSalesResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(sales)
      .where(and(
        eq(sales.sellerId, vendedorId),
        eq(sales.siteId, siteId),
        sql`${sales.createdAt} >= ${thirtyDaysAgo}`
      ));

    // Calculate average by dividing total by 30 days
    const avgDaily = (parseFloat(avgSalesResult.total) / 30).toFixed(2);

    return {
      vouchersToday: voucherResult.count, // CORRIGIDO: agora conta apenas vouchers vendidos
      revenueToday: salesResult.total,
      averageDaily: avgDaily
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
      .where(eq(plans.siteId, siteId));

    return {
      vouchersToday: voucherResult.count,
      revenueToday: salesResult.total,
      activeSellers: sellersResult.count,
      activePlans: plansResult.count
    };
  }

  // Cash closure system methods
  async createCashClosure(closure: Omit<InsertCashClosure, 'id' | 'createdAt'>): Promise<CashClosure> {
    const closureId = crypto.randomUUID();
    const closureWithId = { ...closure, id: closureId };
    
    const insertResult = await db.insert(cashClosures).values(closureWithId);
    const [createdClosure] = await db.select().from(cashClosures).where(eq(cashClosures.id, closureId));
    
    if (!createdClosure) {
      throw new Error('Failed to create cash closure');
    }
    
    return createdClosure;
  }

  async getCashClosures(siteId: string): Promise<CashClosure[]> {
    const closures = await db.select().from(cashClosures)
      .where(eq(cashClosures.siteId, siteId))
      .orderBy(desc(cashClosures.closureDate));
    
    return closures;
  }

  // Métodos para gerenciar vouchers individuais
  async deleteVoucher(id: string): Promise<boolean> {
    try {
      const { pool } = await import("./db");
      const [result] = await pool.execute(
        'DELETE FROM vouchers WHERE id = ?',
        [id]
      );
      return (result as any).affectedRows > 0;
    } catch (error) {
      console.error('Error deleting voucher:', error);
      return false;
    }
  }

  async getVoucherById(id: string): Promise<Voucher | null> {
    try {
      const { pool } = await import("./db");
      const [rows] = await pool.execute(`
        SELECT v.*, p.nome as plan_name 
        FROM vouchers v 
        LEFT JOIN plans p ON v.plan_id = p.id 
        WHERE v.id = ?
      `, [id]);
      
      const vouchers = rows as any[];
      if (vouchers.length === 0) return null;
      
      const row = vouchers[0];
      return {
        id: row.id,
        code: row.code,
        planId: row.plan_id,
        siteId: row.site_id,
        vendedorId: row.vendedor_id,
        omadaGroupId: row.omada_group_id,
        omadaVoucherId: row.omada_voucher_id,
        status: row.status,
        unitPrice: row.unit_price,
        usedAt: row.used_at,
        createdAt: row.created_at
      };
    } catch (error) {
      console.error('Error getting voucher by ID:', error);
      return null;
    }
  }
}

export const storage = new DatabaseStorage();
