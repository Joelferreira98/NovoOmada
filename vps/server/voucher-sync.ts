// Voucher Status Synchronization Service
// Sincroniza status dos vouchers entre Omada Controller e banco local

import { storage } from './storage';
import { getValidOmadaToken } from './omada-token-manager';
import { omadaFetch } from './fetch-utils';

interface OmadaVoucherGroup {
  id: string;
  name: string;
  unitPrice: string;
  currency: string;
  unusedCount: number;
  usedCount: number;
  inUseCount: number;
  expiredCount: number;
  totalCount: number;
  totalAmount: string;
}

interface OmadaVoucher {
  id: string;
  code: string;
  status: number; // 0: unused, 1: in use, 2: expired
  startTime?: number;
  timeUsedSec?: number;
  timeLeftSec?: number;
}

interface VoucherGroupDetail extends OmadaVoucherGroup {
  data: OmadaVoucher[];
  totalRows: number;
  currentPage: number;
  currentSize: number;
}

export class VoucherSyncService {
  private isRunning = false;
  private lastSyncTime: Date | null = null;
  private syncIntervalMs = 5 * 60 * 1000; // 5 minutos

  /**
   * Inicia sincronização automática de vouchers para todos os sites ativos
   */
  async startAutoSync() {
    if (this.isRunning) {
      console.log('📊 Voucher sync já está em execução');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Iniciando sincronização automática de vouchers');

    // Executa sincronização imediatamente
    await this.syncAllSites();

    // Agenda próximas sincronizações
    setInterval(async () => {
      try {
        await this.syncAllSites();
      } catch (error) {
        console.error('❌ Erro na sincronização automática:', error);
      }
    }, this.syncIntervalMs);
  }

  /**
   * Para a sincronização automática
   */
  stopAutoSync() {
    this.isRunning = false;
    console.log('⏹️ Sincronização automática parada');
  }

  /**
   * Sincroniza vouchers de todos os sites ativos
   */
  async syncAllSites(): Promise<void> {
    try {
      console.log('🔄 Iniciando sincronização de todos os sites...');
      
      // Buscar todos os sites ativos
      const sites = await storage.getAllSites();
      const activeSites = sites.filter(site => site.status === 'active' && site.omadaSiteId);

      console.log(`📍 Encontrados ${activeSites.length} sites ativos para sincronizar`);

      for (const site of activeSites) {
        try {
          await this.syncSiteVouchers(site.id, site.omadaSiteId!);
        } catch (error) {
          console.error(`❌ Erro sincronizando site ${site.name}:`, error);
          // Continua com outros sites mesmo se um falhar
        }
      }

      this.lastSyncTime = new Date();
      console.log('✅ Sincronização completa finalizada às', this.lastSyncTime);

    } catch (error) {
      console.error('❌ Erro na sincronização geral:', error);
      throw error;
    }
  }

  /**
   * Sincroniza vouchers de um site específico
   */
  async syncSiteVouchers(siteId: string, omadaSiteId: string): Promise<void> {
    try {
      console.log(`🔄 Sincronizando vouchers do site: ${siteId}`);

      // Obter credenciais do Omada
      const credentials = await storage.getOmadaCredentials();
      if (!credentials) {
        throw new Error('Credenciais do Omada não configuradas');
      }

      // Obter token de acesso válido
      const accessToken = await getValidOmadaToken(credentials);

      // 1. Buscar todos os grupos de vouchers do site
      const voucherGroups = await this.getVoucherGroups(credentials, omadaSiteId, accessToken);
      console.log(`📦 Encontrados ${voucherGroups.length} grupos de vouchers`);

      // 2. Para cada grupo, analisar vouchers individualmente
      for (const group of voucherGroups) {
        await this.syncVoucherGroup(credentials, omadaSiteId, accessToken, group, siteId);
      }

    } catch (error) {
      console.error(`❌ Erro sincronizando site ${siteId}:`, error);
      throw error;
    }
  }

  /**
   * Busca todos os grupos de vouchers de um site
   */
  private async getVoucherGroups(
    credentials: any,
    omadaSiteId: string,
    accessToken: string
  ): Promise<OmadaVoucherGroup[]> {
    const groups: OmadaVoucherGroup[] = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const url = `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${omadaSiteId}/hotspot/voucher-groups?page=${page}&pageSize=${pageSize}`;
        
        const response = await omadaFetch(url, {
          headers: {
            'Authorization': `AccessToken=${accessToken}`,
            'Content-Type': 'application/json',
          },
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({
              rejectUnauthorized: false
            })
          })
        });

        if (!response.ok) {
          throw new Error(`Falha ao buscar grupos de vouchers: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.errorCode !== 0) {
          throw new Error(data.msg || 'Erro da API Omada');
        }

        const result = data.result;
        groups.push(...result.data);

        // Verificar se há mais páginas
        hasMore = result.currentPage * result.currentSize < result.totalRows;
        page++;

      } catch (error) {
        console.error(`❌ Erro buscando grupos página ${page}:`, error);
        hasMore = false;
      }
    }

    return groups;
  }

  /**
   * Sincroniza vouchers de um grupo específico
   */
  private async syncVoucherGroup(
    credentials: any,
    omadaSiteId: string,
    accessToken: string,
    group: OmadaVoucherGroup,
    siteId: string
  ): Promise<void> {
    try {
      console.log(`📦 Sincronizando grupo: ${group.name} (${group.totalCount} vouchers)`);

      // Buscar detalhes do grupo com todos os vouchers
      const groupDetails = await this.getVoucherGroupDetails(
        credentials, 
        omadaSiteId, 
        accessToken, 
        group.id
      );

      let syncedCount = 0;
      let salesCreated = 0;

      // Analisar cada voucher individualmente
      for (const omadaVoucher of groupDetails.data) {
        try {
          const result = await this.syncIndividualVoucher(omadaVoucher, group, siteId);
          syncedCount++;
          if (result.saleCreated) salesCreated++;
        } catch (error) {
          console.error(`❌ Erro sincronizando voucher ${omadaVoucher.code}:`, error);
        }
      }

      console.log(`✅ Grupo ${group.name}: ${syncedCount} vouchers sincronizados, ${salesCreated} vendas registradas`);

    } catch (error) {
      console.error(`❌ Erro sincronizando grupo ${group.name}:`, error);
    }
  }

  /**
   * Busca detalhes completos de um grupo de vouchers
   */
  private async getVoucherGroupDetails(
    credentials: any,
    omadaSiteId: string,
    accessToken: string,
    groupId: string
  ): Promise<VoucherGroupDetail> {
    const allVouchers: OmadaVoucher[] = [];
    let page = 1;
    const pageSize = 1000; // Máximo permitido
    let hasMore = true;
    let groupInfo: any = null;

    while (hasMore) {
      try {
        const url = `${credentials.omadaUrl}/openapi/v1/${credentials.omadacId}/sites/${omadaSiteId}/hotspot/voucher-groups/${groupId}?page=${page}&pageSize=${pageSize}`;
        
        const response = await omadaFetch(url, {
          headers: {
            'Authorization': `AccessToken=${accessToken}`,
            'Content-Type': 'application/json',
          },
          ...(process.env.NODE_ENV === 'development' && {
            agent: new (await import('https')).Agent({
              rejectUnauthorized: false
            })
          })
        });

        if (!response.ok) {
          throw new Error(`Falha ao buscar detalhes do grupo: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.errorCode !== 0) {
          throw new Error(data.msg || 'Erro da API Omada');
        }

        const result = data.result;
        
        // Guardar informações do grupo na primeira iteração
        if (!groupInfo) {
          groupInfo = result;
        }

        allVouchers.push(...result.data);

        // Verificar se há mais páginas
        hasMore = result.currentPage * result.currentSize < result.totalRows;
        page++;

      } catch (error) {
        console.error(`❌ Erro buscando detalhes página ${page}:`, error);
        hasMore = false;
      }
    }

    return {
      ...groupInfo,
      data: allVouchers
    };
  }

  /**
   * Sincroniza um voucher individual e cria venda se necessário
   */
  private async syncIndividualVoucher(
    omadaVoucher: OmadaVoucher,
    group: OmadaVoucherGroup,
    siteId: string
  ): Promise<{ updated: boolean; saleCreated: boolean }> {
    try {
      // Buscar voucher no banco local pelo código
      const localVoucher = await storage.getVoucherByCode(omadaVoucher.code);
      
      if (!localVoucher) {
        console.log(`⚠️ Voucher ${omadaVoucher.code} não encontrado no banco local`);
        return { updated: false, saleCreated: false };
      }

      let updated = false;
      let saleCreated = false;

      // Mapear status do Omada para nosso sistema
      let newStatus: string;
      switch (omadaVoucher.status) {
        case 0:
          newStatus = 'available'; // Não usado
          break;
        case 1:
          newStatus = 'in_use'; // Em uso - considerar como vendido
          break;
        case 2:
          newStatus = 'expired'; // Expirado - considerar como vendido
          break;
        default:
          newStatus = localVoucher.status;
      }

      // Atualizar status do voucher se mudou
      if (localVoucher.status !== newStatus) {
        await storage.updateVoucherStatusById(localVoucher.id, newStatus);
        console.log(`📝 Voucher ${omadaVoucher.code}: ${localVoucher.status} → ${newStatus}`);
        updated = true;

        // Se voucher mudou para "em uso" ou "expirado", criar registro de venda
        if ((newStatus === 'in_use' || newStatus === 'expired') && 
            localVoucher.status === 'available') {
          
          await this.createSaleRecord(localVoucher, group, omadaVoucher);
          saleCreated = true;
          console.log(`💰 Venda registrada para voucher ${omadaVoucher.code}`);
        }
      }

      return { updated, saleCreated };

    } catch (error) {
      console.error(`❌ Erro sincronizando voucher ${omadaVoucher.code}:`, error);
      return { updated: false, saleCreated: false };
    }
  }

  /**
   * Cria registro de venda quando voucher é usado
   */
  private async createSaleRecord(
    localVoucher: any,
    group: OmadaVoucherGroup,
    omadaVoucher: OmadaVoucher
  ): Promise<void> {
    try {
      // Verificar se já existe venda para este voucher
      const existingSale = await storage.getSaleByVoucherId(localVoucher.id);
      if (existingSale) {
        console.log(`ℹ️ Venda já existe para voucher ${localVoucher.code}`);
        return;
      }

      // Criar registro de venda
      const saleData = {
        voucherId: localVoucher.id,
        vendedorId: localVoucher.vendedorId || localVoucher.createdBy,
        siteId: localVoucher.siteId,
        planId: localVoucher.planId,
        amount: parseFloat(group.unitPrice || localVoucher.unitPrice || "0"),
        currency: group.currency || "BRL",
        saleDate: omadaVoucher.startTime ? new Date(omadaVoucher.startTime) : new Date(),
        paymentMethod: 'auto_sync', // Indicar que foi criado via sincronização
        notes: `Venda automática detectada via sincronização Omada - Status: ${omadaVoucher.status === 1 ? 'em uso' : 'expirado'}`
      };

      await storage.createSale(saleData);
      console.log(`✅ Venda criada automaticamente para voucher ${localVoucher.code}`);

    } catch (error) {
      console.error(`❌ Erro criando venda para voucher ${localVoucher.code}:`, error);
      throw error;
    }
  }

  /**
   * Retorna status da sincronização
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      syncIntervalMs: this.syncIntervalMs
    };
  }

  /**
   * Força sincronização manual de um site específico
   */
  async forceSiteSync(siteId: string): Promise<void> {
    const site = await storage.getSiteById(siteId);
    if (!site || !site.omadaSiteId) {
      throw new Error('Site não encontrado ou sem ID do Omada');
    }

    console.log(`🔄 Forçando sincronização do site: ${site.name}`);
    await this.syncSiteVouchers(site.id, site.omadaSiteId);
  }
}

// Instância global do serviço
export const voucherSyncService = new VoucherSyncService();