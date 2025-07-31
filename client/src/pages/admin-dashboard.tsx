import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings,
  MapPin,
  Wifi,
  ArrowLeft,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Plus,
  Calculator,
  LogOut,
  User,
  ChevronDown,
  Printer,
  ShoppingCart,
  FileText
} from "lucide-react";
import { useLocation } from "wouter";
import { Site } from "@shared/schema";
import { VendedorModal } from "@/components/modals/vendedor-modal";
import { PlanModal } from "@/components/modals/plan-modal";
import { Sidebar } from "@/components/layout/sidebar";

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "vendedores" | "plans" | "vouchers" | "reports">("overview");
  const [vendedorModalOpen, setVendedorModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<any>(null);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get selected site from localStorage on component mount
  useEffect(() => {
    const storedSiteId = localStorage.getItem("selectedSiteId");
    if (storedSiteId) {
      setSelectedSiteId(storedSiteId);
    }
  }, []);

  const { data: userSites } = useQuery<Site[]>({
    queryKey: ["/api/users", user?.id, "sites"],
    enabled: !!user?.id,
  });

  const { data: selectedSite } = useQuery<Site>({
    queryKey: ["/api/sites", selectedSiteId],
    enabled: !!selectedSiteId,
  });

  // Fetch plans for the selected site
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/sites", selectedSiteId, "plans"],
    enabled: !!selectedSiteId,
  });

  // Fetch vendedores for the selected site
  const { data: vendedores, isLoading: vendedoresLoading } = useQuery({
    queryKey: ["/api/sites", selectedSiteId, "vendedores"],
    enabled: !!selectedSiteId,
  });

  // Delete mutations
  const deleteVendedorMutation = useMutation({
    mutationFn: async (vendedorId: string) => {
      await apiRequest("DELETE", `/api/users/${vendedorId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Vendedor excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", selectedSiteId, "vendedores"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir vendedor",
        variant: "destructive",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      await apiRequest("DELETE", `/api/plans/${planId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Plano excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", selectedSiteId, "plans"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir plano",
        variant: "destructive",
      });
    },
  });

  // Redirect to site selection if no site selected or if user has multiple sites
  useEffect(() => {
    if (user?.role === "admin" && userSites) {
      const currentStoredSiteId = localStorage.getItem("selectedSiteId");
      
      if (currentStoredSiteId && !selectedSiteId) {
        setSelectedSiteId(currentStoredSiteId);
        return;
      }
      
      if (userSites.length === 0) {
        setLocation("/auth");
      } else if (userSites.length > 1 && !currentStoredSiteId) {
        setLocation("/site-selection");
      } else if (userSites.length === 1 && !currentStoredSiteId) {
        const siteId = userSites[0].id;
        localStorage.setItem("selectedSiteId", siteId);
        setSelectedSiteId(siteId);
      }
    }
  }, [user, userSites, selectedSiteId, setLocation]);

  const handleChangeSite = () => {
    localStorage.removeItem("selectedSiteId");
    setLocation("/site-selection");
  };

  if (!selectedSite) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-3 text-muted">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Sidebar items for admin
  const sidebarItems = [
    { 
      icon: BarChart3, 
      label: "Visão Geral", 
      active: activeTab === "overview",
      onClick: () => setActiveTab("overview")
    },
    { 
      icon: Users, 
      label: "Vendedores", 
      active: activeTab === "vendedores",
      onClick: () => setActiveTab("vendedores")
    },
    { 
      icon: Settings, 
      label: "Planos", 
      active: activeTab === "plans",
      onClick: () => setActiveTab("plans")
    },
    { 
      icon: ShoppingCart, 
      label: "Vouchers", 
      active: activeTab === "vouchers",
      onClick: () => setActiveTab("vouchers")
    },
    { 
      icon: FileText, 
      label: "Relatórios", 
      active: activeTab === "reports",
      onClick: () => setActiveTab("reports")
    }
  ];

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar
        title={`Admin - ${selectedSite.name}`}
        subtitle={selectedSite.location || "Localização não informada"}
        icon={User}
        iconBg="bg-success"
        items={sidebarItems}
      />

      <div className="flex-fill p-3 p-lg-4 overflow-auto">
        {/* Header Actions */}
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4">
          <div>
            <h1 className="h2 fw-bold text-dark mb-1">Admin Dashboard</h1>
            <p className="text-muted mb-0">Site: {selectedSite.name}</p>
          </div>
          <div className="d-flex flex-column flex-lg-row gap-2 mt-3 mt-lg-0">
            {userSites && userSites.length > 1 && (
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={handleChangeSite}
              >
                <ArrowLeft size={16} className="me-1" />
                Trocar Site
              </button>
            )}
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut size={16} className="me-1" />
              Sair
            </button>
          </div>
        </div>

        <div className="container-fluid px-0">
          {activeTab === "overview" && <OverviewSection selectedSite={selectedSite} />}
          {activeTab === "vendedores" && (
            <VendedoresSection 
              siteId={selectedSiteId!}
              vendedores={vendedores}
              loading={vendedoresLoading}
              onEdit={setEditingVendedor}
              onDelete={deleteVendedorMutation.mutate}
              onAdd={() => setVendedorModalOpen(true)}
            />
          )}
          {activeTab === "plans" && (
            <PlansSection 
              siteId={selectedSiteId!}
              plans={plans}
              loading={plansLoading}
              onEdit={setEditingPlan}
              onDelete={deletePlanMutation.mutate}
              onAdd={() => setPlanModalOpen(true)}
            />
          )}
          {activeTab === "vouchers" && <VouchersSection siteId={selectedSiteId!} />}
          {activeTab === "reports" && <ReportsSection siteId={selectedSiteId!} />}
        </div>
      </div>

      <VendedorModal 
        isOpen={vendedorModalOpen || !!editingVendedor}
        onClose={() => {
          setVendedorModalOpen(false);
          setEditingVendedor(null);
        }}
        siteId={selectedSiteId!}
        editVendedor={editingVendedor}
      />
      
      <PlanModal 
        isOpen={planModalOpen || !!editingPlan}
        onClose={() => {
          setPlanModalOpen(false);
          setEditingPlan(null);
        }}
        siteId={selectedSiteId!}
        editPlan={editingPlan}
      />
    </div>
  );
}

// Overview Section Component
function OverviewSection({ selectedSite }: { selectedSite: Site }) {
  const { data: vendedores = [] } = useQuery<any[]>({
    queryKey: ["/api/sites", selectedSite.id, "vendedores"],
  });

  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["/api/sites", selectedSite.id, "plans"],
  });

  return (
    <div className="mb-4">
      <div className="mb-4">
        <h1 className="h2 h1-lg fw-bold text-dark mb-2">Dashboard Admin</h1>
        <p className="text-muted">Visão geral do site {selectedSite.name}</p>
      </div>

      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card text-center">
            <div className="card-body">
              <div className="bg-primary bg-opacity-10 p-3 rounded-circle mx-auto mb-3" style={{width: '60px', height: '60px'}}>
                <Users className="text-primary" size={24} />
              </div>
              <h5 className="fw-bold">{vendedores.length}</h5>
              <p className="text-muted mb-0 small">Vendedores Ativos</p>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card text-center">
            <div className="card-body">
              <div className="bg-success bg-opacity-10 p-3 rounded-circle mx-auto mb-3" style={{width: '60px', height: '60px'}}>
                <Settings className="text-success" size={24} />
              </div>
              <h5 className="fw-bold">{plans.length}</h5>
              <p className="text-muted mb-0 small">Planos Criados</p>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card text-center">
            <div className="card-body">
              <div className="bg-warning bg-opacity-10 p-3 rounded-circle mx-auto mb-3" style={{width: '60px', height: '60px'}}>
                <ShoppingCart className="text-warning" size={24} />
              </div>
              <h5 className="fw-bold">-</h5>
              <p className="text-muted mb-0 small">Vouchers Vendidos</p>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card text-center">
            <div className="card-body">
              <div className="bg-info bg-opacity-10 p-3 rounded-circle mx-auto mb-3" style={{width: '60px', height: '60px'}}>
                <MapPin className="text-info" size={24} />
              </div>
              <h5 className="fw-bold">
                <span className={`badge ${selectedSite.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                  {selectedSite.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </h5>
              <p className="text-muted mb-0 small">Status do Site</p>
            </div>
          </div>
        </div>
      </div>

      {/* Site Info Card */}
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0 d-flex align-items-center">
            <MapPin className="me-2" size={20} />
            Informações do Site
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <strong>Nome:</strong> {selectedSite.name}
            </div>
            <div className="col-md-6">
              <strong>Localização:</strong> {selectedSite.location || "Não informado"}
            </div>
            <div className="col-md-6">
              <strong>ID Omada:</strong> {selectedSite.omadaSiteId || "Não configurado"}
            </div>
            <div className="col-md-6">
              <strong>Última Sincronização:</strong> {
                selectedSite.lastSync 
                  ? new Date(selectedSite.lastSync).toLocaleDateString('pt-BR')
                  : "Nunca"
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Vendedores Section Component
function VendedoresSection({ siteId, vendedores, loading, onEdit, onDelete, onAdd }: any) {
  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando vendedores...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="mb-4 d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center">
        <div>
          <h1 className="h2 h1-lg fw-bold text-dark mb-2">Gerenciar Vendedores</h1>
          <p className="text-muted">Criar, editar e gerenciar vendedores do site</p>
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <Plus size={16} className="me-1" />
          Novo Vendedor
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">Lista de Vendedores</h5>
        </div>
        <div className="card-body">
          {vendedores && vendedores.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vendedores.map((vendedor: any) => (
                    <tr key={vendedor.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                            <User size={16} className="text-primary" />
                          </div>
                          {vendedor.username}
                        </div>
                      </td>
                      <td>{vendedor.email || "Não informado"}</td>
                      <td>
                        <span className="badge bg-success">Ativo</span>
                      </td>
                      <td>{new Date(vendedor.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => onEdit(vendedor)}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => onDelete(vendedor.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <Users size={48} className="text-muted mb-3" />
              <h5>Nenhum vendedor encontrado</h5>
              <p className="text-muted">Crie o primeiro vendedor para este site</p>
              <button className="btn btn-primary" onClick={onAdd}>
                <Plus size={16} className="me-1" />
                Criar Vendedor
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Plans Section Component
function PlansSection({ siteId, plans, loading, onEdit, onDelete, onAdd }: any) {
  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando planos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="mb-4 d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center">
        <div>
          <h1 className="h2 h1-lg fw-bold text-dark mb-2">Gerenciar Planos</h1>
          <p className="text-muted">Criar, editar e gerenciar planos de vouchers</p>
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <Plus size={16} className="me-1" />
          Novo Plano
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">Lista de Planos</h5>
        </div>
        <div className="card-body">
          {plans && plans.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Preço</th>
                    <th>Duração</th>
                    <th>Usuários</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan: any) => (
                    <tr key={plan.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="bg-success bg-opacity-10 p-2 rounded-circle me-3">
                            <Settings size={16} className="text-success" />
                          </div>
                          {plan.name}
                        </div>
                      </td>
                      <td>R$ {plan.price.toFixed(2)}</td>
                      <td>{plan.duration} min</td>
                      <td>{plan.concurrentUsers}</td>
                      <td>{new Date(plan.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => onEdit(plan)}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => onDelete(plan.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <Settings size={48} className="text-muted mb-3" />
              <h5>Nenhum plano encontrado</h5>
              <p className="text-muted">Crie o primeiro plano para este site</p>
              <button className="btn btn-primary" onClick={onAdd}>
                <Plus size={16} className="me-1" />
                Criar Plano
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Vouchers Section Component - Admin can create and print vouchers
function VouchersSection({ siteId }: { siteId: string }) {
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [generatedVouchers, setGeneratedVouchers] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["/api/sites", siteId, "plans"],
    enabled: !!siteId,
  });

  const generateVouchers = async () => {
    if (!selectedPlan) {
      toast({
        title: "Erro",
        description: "Selecione um plano",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/vouchers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planId: selectedPlan,
          quantity,
          siteId
        })
      });

      if (!response.ok) {
        throw new Error("Erro ao gerar vouchers");
      }

      const result = await response.json();
      setGeneratedVouchers(result.vouchers || []);
      
      toast({
        title: "Vouchers gerados!",
        description: `${quantity} voucher(s) criado(s) com sucesso`
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const printVouchers = (format: 'A4' | 'thermal') => {
    if (generatedVouchers.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const vouchersHtml = generatedVouchers.map(voucher => `
      <div class="voucher-card ${format === 'thermal' ? 'thermal' : 'a4'}">
        <div class="voucher-header">
          <h3>Voucher WiFi</h3>
          <div class="voucher-code">${voucher.code}</div>
        </div>
        <div class="voucher-details">
          <p><strong>Duração:</strong> ${voucher.plan?.duration} minutos</p>
          <p><strong>Usuários:</strong> ${voucher.plan?.concurrentUsers}</p>
          <p><strong>Preço:</strong> R$ ${voucher.plan?.price?.toFixed(2)}</p>
        </div>
      </div>
    `).join('');

    const styles = format === 'thermal' ? `
      .voucher-card { width: 58mm; margin-bottom: 10mm; page-break-after: always; }
      .voucher-header { text-align: center; margin-bottom: 5mm; }
      .voucher-code { font-size: 16px; font-weight: bold; border: 1px solid #000; padding: 2mm; }
      .voucher-details { font-size: 12px; }
    ` : `
      .voucher-card { width: 45%; margin: 10px; padding: 15px; border: 1px solid #ccc; display: inline-block; }
      .voucher-header { text-align: center; margin-bottom: 10px; }
      .voucher-code { font-size: 18px; font-weight: bold; border: 1px solid #000; padding: 10px; }
      .voucher-details { font-size: 14px; }
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão de Vouchers</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            ${styles}
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${vouchersHtml}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
  };

  return (
    <div className="mb-4">
      <div className="mb-4">
        <h1 className="h2 h1-lg fw-bold text-dark mb-2">Gerenciar Vouchers</h1>
        <p className="text-muted">Gerar e imprimir vouchers para o site</p>
      </div>

      {/* Voucher Generation Form */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0 d-flex align-items-center">
            <ShoppingCart className="me-2" size={20} />
            Gerar Novos Vouchers
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Selecionar Plano</label>
              <select 
                className="form-select"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                <option value="">Escolha um plano...</option>
                {plans.map((plan: any) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - R$ {plan.price.toFixed(2)} ({plan.duration}min)
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Quantidade</label>
              <input
                type="number"
                className="form-control"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <div className="mt-3">
            <button
              className="btn btn-primary"
              onClick={generateVouchers}
              disabled={isGenerating || !selectedPlan}
            >
              {isGenerating ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                  Gerando...
                </>
              ) : (
                <>
                  <ShoppingCart size={16} className="me-1" />
                  Gerar Vouchers
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Vouchers */}
      {generatedVouchers.length > 0 && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Vouchers Gerados ({generatedVouchers.length})</h5>
            <div className="btn-group">
              <button
                className="btn btn-outline-primary"
                onClick={() => printVouchers('A4')}
              >
                <Printer size={16} className="me-1" />
                Imprimir A4
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => printVouchers('thermal')}
              >
                <Printer size={16} className="me-1" />
                Cupom Térmico
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => setGeneratedVouchers([])}
              >
                Limpar
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="row g-2">
              {generatedVouchers.map((voucher, index) => (
                <div key={index} className="col-md-4 col-lg-3">
                  <div className="card border-primary">
                    <div className="card-body text-center">
                      <div className="fw-bold text-primary">{voucher.code}</div>
                      <small className="text-muted">
                        {voucher.plan?.duration}min - R$ {voucher.plan?.price?.toFixed(2)}
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reports Section Component
function ReportsSection({ siteId }: { siteId: string }) {
  const [, setLocation] = useLocation();

  return (
    <div className="mb-4">
      <div className="mb-4">
        <h1 className="h2 h1-lg fw-bold text-dark mb-2">Relatórios</h1>
        <p className="text-muted">Acessar relatórios detalhados de vendas e vouchers</p>
      </div>

      <div className="card">
        <div className="card-body text-center py-5">
          <FileText size={48} className="text-muted mb-3" />
          <h5>Relatórios Detalhados</h5>
          <p className="text-muted">Acesse relatórios completos de vendas, distribuição e histórico</p>
          <button
            className="btn btn-primary"
            onClick={() => setLocation("/reports")}
          >
            <BarChart3 size={16} className="me-1" />
            Acessar Relatórios
          </button>
        </div>
      </div>
    </div>
  );
}