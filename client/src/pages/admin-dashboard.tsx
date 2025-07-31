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
    <div className="min-vh-100" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
      <div className="container-fluid">
        <div className="row">
          {/* Sidebar */}
          <div className="col-12 col-lg-3 col-xl-2 p-0">
            <div className="bg-white shadow-lg h-100 min-vh-100">
              {/* Header */}
              <div className="p-4 border-bottom">
                <div className="d-flex align-items-center">
                  <div className="bg-primary bg-gradient rounded-circle p-2 me-3">
                    <User className="text-white" size={20} />
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold text-dark">{selectedSite.name}</h5>
                    <small className="text-muted">Painel Admin</small>
                  </div>
                </div>
              </div>
              
              {/* Navigation */}
              <div className="p-3">
                <div className="d-grid gap-2">
                  {sidebarItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={item.onClick}
                      className={`btn text-start d-flex align-items-center ${
                        item.active 
                          ? 'btn-primary fw-semibold' 
                          : 'btn-outline-light text-dark border-0 hover-bg-light'
                      }`}
                    >
                      <item.icon className="me-2" size={18} />
                      {item.label}
                    </button>
                  ))}
                </div>
                
                {/* User Actions */}
                <div className="mt-4 pt-3 border-top">
                  {userSites && userSites.length > 1 && (
                    <button
                      className="btn btn-outline-secondary btn-sm w-100 mb-2 d-flex align-items-center justify-content-center"
                      onClick={handleChangeSite}
                    >
                      <ArrowLeft size={16} className="me-1" />
                      Trocar Site
                    </button>
                  )}
                  <button
                    className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut size={16} className="me-1" />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-12 col-lg-9 col-xl-10 p-0">
            <div className="p-4">
              {/* Header Card */}
              <div className="card bg-white shadow-lg border-0 mb-4">
                <div className="card-body p-4">
                  <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center">
                    <div className="d-flex align-items-center">
                      <div className="bg-primary bg-gradient rounded-circle p-3 me-3">
                        <MapPin className="text-white" size={24} />
                      </div>
                      <div>
                        <h1 className="h3 mb-1 fw-bold text-dark">{selectedSite.name}</h1>
                        <div className="d-flex align-items-center text-muted">
                          <span>{selectedSite.location}</span>
                          <span className="mx-2">•</span>
                          <span className={`badge ${selectedSite.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                            {selectedSite.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              {activeTab === "overview" && <OverviewSection selectedSite={selectedSite} setActiveTab={setActiveTab} />}
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
        </div>
      </div>

      <VendedorModal 
        show={vendedorModalOpen || !!editingVendedor}
        onHide={() => {
          setVendedorModalOpen(false);
          setEditingVendedor(null);
        }}
        siteId={selectedSiteId!}
        editVendedor={editingVendedor}
      />
      
      <PlanModal 
        show={planModalOpen || !!editingPlan}
        onHide={() => {
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
function OverviewSection({ selectedSite, setActiveTab }: { 
  selectedSite: Site; 
  setActiveTab: React.Dispatch<React.SetStateAction<"overview" | "vendedores" | "plans" | "vouchers" | "reports">>; 
}) {
  const { data: vendedores = [] } = useQuery<any[]>({
    queryKey: ["/api/sites", selectedSite.id, "vendedores"],
  });

  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["/api/sites", selectedSite.id, "plans"],
  });

  return (
    <div>
      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card bg-white shadow-lg border-0 h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-gradient rounded-circle p-3 me-3">
                  <Users className="text-white" size={24} />
                </div>
                <div>
                  <div className="h4 mb-0 fw-bold text-dark">{vendedores.length}</div>
                  <small className="text-muted text-uppercase fw-semibold">Vendedores</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card bg-white shadow-lg border-0 h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="bg-success bg-gradient rounded-circle p-3 me-3">
                  <Settings className="text-white" size={24} />
                </div>
                <div>
                  <div className="h4 mb-0 fw-bold text-dark">{plans.length}</div>
                  <small className="text-muted text-uppercase fw-semibold">Planos</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card bg-white shadow-lg border-0 h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-gradient rounded-circle p-3 me-3">
                  <ShoppingCart className="text-white" size={24} />
                </div>
                <div>
                  <div className="h4 mb-0 fw-bold text-dark">-</div>
                  <small className="text-muted text-uppercase fw-semibold">Vouchers</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card bg-white shadow-lg border-0 h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="bg-info bg-gradient rounded-circle p-3 me-3">
                  <Wifi className="text-white" size={24} />
                </div>
                <div>
                  <div className="h4 mb-0 fw-bold text-dark">
                    {selectedSite.status === 'active' ? 'Online' : 'Offline'}
                  </div>
                  <small className="text-muted text-uppercase fw-semibold">Status</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card bg-white shadow-lg border-0 h-100">
            <div className="card-body p-4 text-center">
              <div className="bg-primary bg-gradient rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style={{width: '64px', height: '64px'}}>
                <Users className="text-white" size={28} />
              </div>
              <h5 className="fw-bold mb-2 text-dark">Gerenciar Vendedores</h5>
              <p className="text-muted mb-3">Adicionar, editar e remover vendedores</p>
              <button className="btn btn-primary" onClick={() => setActiveTab("vendedores")}>
                Acessar
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card bg-white shadow-lg border-0 h-100">
            <div className="card-body p-4 text-center">
              <div className="bg-success bg-gradient rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style={{width: '64px', height: '64px'}}>
                <Settings className="text-white" size={28} />
              </div>
              <h5 className="fw-bold mb-2 text-dark">Configurar Planos</h5>
              <p className="text-muted mb-3">Criar e gerenciar planos de vouchers</p>
              <button className="btn btn-success" onClick={() => setActiveTab("plans")}>
                Acessar
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card bg-white shadow-lg border-0 h-100">
            <div className="card-body p-4 text-center">
              <div className="bg-warning bg-gradient rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style={{width: '64px', height: '64px'}}>
                <ShoppingCart className="text-white" size={28} />
              </div>
              <h5 className="fw-bold mb-2 text-dark">Gerar Vouchers</h5>
              <p className="text-muted mb-3">Criar e imprimir vouchers WiFi</p>
              <button className="btn btn-warning text-white" onClick={() => setActiveTab("vouchers")}>
                Acessar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Site Information */}
      <div className="card bg-white shadow-lg border-0">
        <div className="card-header bg-gradient text-white border-0" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
          <h5 className="card-title mb-0 d-flex align-items-center">
            <MapPin className="me-2" size={20} />
            Informações do Site
          </h5>
        </div>
        <div className="card-body p-4">
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="mb-3">
                <strong className="text-muted text-uppercase small">Nome:</strong>
                <div className="fw-semibold text-dark">{selectedSite.name}</div>
              </div>
              <div className="mb-3">
                <strong className="text-muted text-uppercase small">Localização:</strong>
                <div className="fw-semibold text-dark">{selectedSite.location || "Não informado"}</div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="mb-3">
                <strong className="text-muted text-uppercase small">ID Omada:</strong>
                <div className="fw-semibold text-primary font-monospace">{selectedSite.omadaSiteId || "Não configurado"}</div>
              </div>
              <div className="mb-3">
                <strong className="text-muted text-uppercase small">Última Sync:</strong>
                <div className="fw-semibold text-dark">
                  {selectedSite.lastSync 
                    ? new Date(selectedSite.lastSync).toLocaleDateString('pt-BR') + ' às ' + new Date(selectedSite.lastSync).toLocaleTimeString('pt-BR')
                    : "Nunca sincronizado"
                  }
                </div>
              </div>
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
    <div>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4">
        <div>
          <h2 className="h3 fw-bold text-dark mb-1">Gerenciar Vendedores</h2>
          <p className="text-muted mb-0">Criar, editar e gerenciar vendedores do site</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center mt-3 mt-lg-0" onClick={onAdd}>
          <Plus size={18} className="me-2" />
          Novo Vendedor
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 py-3">
          <h5 className="card-title mb-0 fw-semibold">Lista de Vendedores</h5>
        </div>
        <div className="card-body p-0">
          {vendedores && vendedores.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="border-0 fw-semibold">Vendedor</th>
                    <th className="border-0 fw-semibold">Email</th>
                    <th className="border-0 fw-semibold">Status</th>
                    <th className="border-0 fw-semibold">Criado em</th>
                    <th className="border-0 fw-semibold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vendedores.map((vendedor: any) => (
                    <tr key={vendedor.id}>
                      <td className="py-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-gradient rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                            <User size={18} className="text-white" />
                          </div>
                          <div>
                            <div className="fw-semibold text-dark">{vendedor.username}</div>
                            <small className="text-muted">Vendedor</small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-dark">{vendedor.email || "Não informado"}</span>
                      </td>
                      <td className="py-3">
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          Ativo
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-dark">{new Date(vendedor.createdAt).toLocaleDateString('pt-BR')}</span>
                      </td>
                      <td className="py-3 text-center">
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-outline-primary btn-sm d-flex align-items-center"
                            onClick={() => onEdit(vendedor)}
                            title="Editar vendedor"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm d-flex align-items-center"
                            onClick={() => onDelete(vendedor.id)}
                            title="Excluir vendedor"
                          >
                            <Trash2 size={16} />
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
              <div className="bg-light rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center" style={{width: '80px', height: '80px'}}>
                <Users size={40} className="text-muted" />
              </div>
              <h5 className="fw-semibold text-dark mb-2">Nenhum vendedor encontrado</h5>
              <p className="text-muted mb-4">Crie o primeiro vendedor para este site</p>
              <button className="btn btn-primary d-flex align-items-center mx-auto" onClick={onAdd}>
                <Plus size={18} className="me-2" />
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
                      <td>R$ {(plan.price || 0).toFixed(2)}</td>
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
    <div>
      <div className="mb-4">
        <h2 className="h3 fw-bold text-dark mb-1">Gerenciar Vouchers</h2>
        <p className="text-muted mb-0">Gerar e imprimir vouchers para o site</p>
      </div>

      {/* Voucher Generation Form */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-gradient text-white" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
          <h5 className="card-title mb-0 d-flex align-items-center">
            <ShoppingCart className="me-2" size={20} />
            Gerar Novos Vouchers
          </h5>
        </div>
        <div className="card-body p-4">
          <div className="row g-4">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Selecionar Plano</label>
              <select 
                className="form-select form-select-lg"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                <option value="">Escolha um plano...</option>
                {plans.map((plan: any) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - R$ {(plan.price || 0).toFixed(2)} ({plan.duration}min)
                  </option>
                ))}
              </select>
              {plans.length === 0 && (
                <div className="form-text text-warning">Nenhum plano disponível. Configure planos primeiro.</div>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Quantidade</label>
              <input
                type="number"
                className="form-control form-control-lg"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
              <div className="form-text">Máximo 100 vouchers por vez</div>
            </div>
          </div>
          <div className="mt-4 d-flex gap-2">
            <button
              className="btn btn-primary btn-lg d-flex align-items-center"
              onClick={generateVouchers}
              disabled={isGenerating || !selectedPlan}
            >
              {isGenerating ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                  Gerando Vouchers...
                </>
              ) : (
                <>
                  <ShoppingCart size={20} className="me-2" />
                  Gerar {quantity} Voucher{quantity > 1 ? 's' : ''}
                </>
              )}
            </button>
            {generatedVouchers.length > 0 && (
              <button
                className="btn btn-outline-secondary"
                onClick={() => setGeneratedVouchers([])}
              >
                Limpar Vouchers
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Generated Vouchers */}
      {generatedVouchers.length > 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center py-3">
            <h5 className="card-title mb-2 mb-lg-0 fw-semibold">
              Vouchers Gerados ({generatedVouchers.length})
            </h5>
            <div className="d-flex flex-wrap gap-2">
              <button
                className="btn btn-primary d-flex align-items-center"
                onClick={() => printVouchers('A4')}
              >
                <Printer size={16} className="me-2" />
                Imprimir A4
              </button>
              <button
                className="btn btn-secondary d-flex align-items-center"
                onClick={() => printVouchers('thermal')}
              >
                <Printer size={16} className="me-2" />
                Cupom Térmico
              </button>
            </div>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              {generatedVouchers.map((voucher, index) => (
                <div key={index} className="col-12 col-sm-6 col-md-4 col-lg-3">
                  <div className="card border border-primary-subtle bg-primary-subtle">
                    <div className="card-body text-center p-3">
                      <div className="fw-bold text-primary h5 mb-2 font-monospace">{voucher.code}</div>
                      <div className="small text-muted">
                        <div>{voucher.plan?.duration} minutos</div>
                        <div>R$ {voucher.plan?.price?.toFixed(2)}</div>
                        <div>{voucher.plan?.concurrentUsers} usuário{voucher.plan?.concurrentUsers > 1 ? 's' : ''}</div>
                      </div>
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