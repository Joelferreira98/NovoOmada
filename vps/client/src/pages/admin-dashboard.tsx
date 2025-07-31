import React, { useEffect, useState } from "react";
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
  FileText,
  Ticket
} from "lucide-react";
import { useLocation } from "wouter";
import { Site } from "@shared/schema";
import { VendedorModal } from "@/components/modals/vendedor-modal";
import { PlanModal } from "@/components/modals/plan-modal-fixed";
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<any>(null);
  const { data: site } = useQuery<any>({
    queryKey: ["/api/sites", siteId],
  });

  // Auto close modals when prop changes
  React.useEffect(() => {
    setShowCreateModal(false);
    setEditingVendedor(null);
  }, [vendedores]);
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
        <button className="btn btn-primary d-flex align-items-center mt-3 mt-lg-0" onClick={() => setShowCreateModal(true)}>
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
                            onClick={() => setEditingVendedor(vendedor)}
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
              <button className="btn btn-primary d-flex align-items-center mx-auto" onClick={() => setShowCreateModal(true)}>
                <Plus size={18} className="me-2" />
                Criar Vendedor
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vendedor Modals */}
      {showCreateModal && (
        <VendedorModal 
          siteId={siteId}
          siteName={site?.name || ""}
          vendedor={null}
          mode="create"
          onClose={() => setShowCreateModal(false)}
        />
      )}
      
      {editingVendedor && (
        <VendedorModal 
          siteId={siteId}
          siteName={site?.name || ""}
          vendedor={editingVendedor}
          mode="edit"
          onClose={() => setEditingVendedor(null)}
        />
      )}
    </div>
  );
}

// Plans Section Component  
function PlansSection({ siteId, plans, loading, onEdit, onDelete, onAdd }: any) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const { data: site } = useQuery<any>({
    queryKey: ["/api/sites", siteId],
  });

  // Auto close modals when prop changes
  React.useEffect(() => {
    setShowCreateModal(false);
    setEditingPlan(null);
  }, [plans]);
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
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
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
                          {plan.nome}
                        </div>
                      </td>
                      <td>R$ {parseFloat(plan.unitPrice || 0).toFixed(2)}</td>
                      <td>{plan.duration} min</td>
                      <td>{plan.userLimit}</td>
                      <td>{new Date(plan.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setEditingPlan(plan)}
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
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} className="me-1" />
                Criar Plano
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Plan Modals */}
      {showCreateModal && (
        <PlanModal 
          siteId={siteId}
          siteName={site?.name || ""}
          plan={null}
          mode="create"
          onClose={() => setShowCreateModal(false)}
        />
      )}
      
      {editingPlan && (
        <PlanModal 
          siteId={siteId}
          siteName={site?.name || ""}
          plan={editingPlan}
          mode="edit"
          onClose={() => setEditingPlan(null)}
        />
      )}
    </div>
  );
}

// Vouchers Section Component - Admin can create and print vouchers
function VouchersSection({ siteId }: { siteId: string }) {
  const [selectedPlan, setSelectedPlan] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [lastGeneratedVouchers, setLastGeneratedVouchers] = useState<any[]>([]);
  const { toast } = useToast();

  const { data: site } = useQuery<any>({
    queryKey: ["/api/sites", siteId],
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["/api/sites", siteId, "plans"],
    enabled: !!siteId,
  });

  const generateVouchersMutation = useMutation({
    mutationFn: async (data: { planId: string; quantity: number }) => {
      const res = await apiRequest("POST", `/api/admin/vouchers/generate`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      const vouchers = data.vouchers || data || [];
      setLastGeneratedVouchers(vouchers);
      toast({
        title: "Vouchers gerados com sucesso!",
        description: data.message || `${vouchers.length} vouchers foram criados.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar vouchers",
        description: error.message || "Ocorreu um erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleGenerateVouchers = () => {
    if (!selectedPlan || quantity < 1) {
      toast({
        title: "Dados inválidos",
        description: "Selecione um plano e quantidade válida",
        variant: "destructive",
      });
      return;
    }

    generateVouchersMutation.mutate({
      planId: selectedPlan,
      quantity: quantity,
    });
  };

  const printVouchers = (vouchersToPrint: any[]) => {
    if (!vouchersToPrint || vouchersToPrint.length === 0) {
      toast({
        title: "Erro na impressão",
        description: "Nenhum voucher disponível para impressão",
        variant: "destructive",
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Erro na impressão",
        description: "Não foi possível abrir a janela de impressão.",
        variant: "destructive",
      });
      return;
    }

    const siteName = site?.name || 'WiFi';
    const planName = vouchersToPrint[0]?.planName || 'Internet';
    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vouchers A4 - ${siteName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Arial', sans-serif; 
            background: white;
            color: black;
            padding: 20mm;
          }
          .voucher-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180mm, 1fr));
            gap: 10mm;
            max-width: 100%;
          }
          .voucher {
            width: 180mm;
            height: 60mm;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 8mm;
            background: #f9f9f9;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .voucher-header {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4mm;
            text-transform: uppercase;
          }
          .voucher-code {
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            background: white;
            border: 2px dashed #666;
            padding: 8px;
            border-radius: 4px;
            letter-spacing: 3px;
          }
          .voucher-details {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-top: 4mm;
          }
          .voucher-footer {
            text-align: center;
            font-size: 10px;
            color: #666;
            margin-top: 2mm;
          }
          @media print {
            body { margin: 0; padding: 10mm; }
            .voucher-grid { gap: 5mm; }
          }
        </style>
      </head>
      <body>
        <div class="voucher-grid">
          ${vouchersToPrint.map(voucher => `
            <div class="voucher">
              <div class="voucher-header">${siteName} - WiFi Access</div>
              <div class="voucher-code">${voucher.code}</div>
              <div class="voucher-details">
                <span>Plano: ${planName}</span>
                <span>Válido: ${voucher.duracao || '60'}min</span>
                <span>${currentDate}</span>
              </div>
              <div class="voucher-footer">Conecte-se ao WiFi e digite este código</div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1000);
    
    toast({
      title: "Preparando impressão A4",
      description: "A janela de impressão foi aberta com sucesso!",
    });
  };

  return (
    <div className="container-fluid px-0">
      <div className="row">
        <div className="col-12">
          <div className="mb-4">
            <h1 className="h2 h1-lg fw-bold text-dark mb-2">Geração de Vouchers</h1>
            <p className="text-muted">Crie vouchers de acesso à internet como administrador</p>
          </div>

          {/* Voucher Generation Form */}
          <div className="row">
            <div className="col-12 col-lg-6">
              <div className="card shadow-lg border-0">
                <div className="card-header bg-white">
                  <h5 className="card-title mb-0 d-flex align-items-center">
                    <Printer className="me-2" size={20} />
                    Criar Novos Vouchers
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label htmlFor="plan-select" className="form-label">Plano</label>
                    {!plans || plans.length === 0 ? (
                      <div className="alert alert-warning" role="alert">
                        <small>Nenhum plano disponível. Crie um plano primeiro.</small>
                      </div>
                    ) : (
                      <select 
                        className="form-select" 
                        value={selectedPlan} 
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        style={{ height: '48px' }}
                      >
                        <option value="">Selecione um plano</option>
                        {(plans as any[]).map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.nome} - R$ {parseFloat(plan.unitPrice || "0").toFixed(2)} ({plan.duration}min)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="quantity" className="form-label">Quantidade</label>
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      max="100"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="form-control"
                      style={{ height: '48px' }}
                    />
                  </div>

                  <button
                    onClick={handleGenerateVouchers}
                    disabled={generateVouchersMutation.isPending || !selectedPlan}
                    className="btn btn-primary w-100"
                    style={{ height: '48px' }}
                  >
                    {generateVouchersMutation.isPending ? "Gerando..." : "Gerar Vouchers"}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Print Options - Show when vouchers are generated */}
            {lastGeneratedVouchers.length > 0 && (
              <div className="col-12 col-lg-6">
                <div className="card shadow-lg border-0">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0 d-flex align-items-center">
                      <Printer className="me-2" size={20} />
                      Opções de Impressão
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="d-flex flex-column gap-3">
                      <div className="text-center mb-3">
                        <p className="text-success fw-semibold mb-1">
                          ✓ {lastGeneratedVouchers.length} vouchers gerados com sucesso!
                        </p>
                        <small className="text-muted">
                          Clique abaixo para imprimir
                        </small>
                      </div>
                      
                      <button 
                        onClick={() => {
                          printVouchers(lastGeneratedVouchers);
                          setLastGeneratedVouchers([]);
                        }}
                        className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center"
                        style={{ height: '48px' }}
                      >
                        <Printer className="me-2" size={20} />
                        <div className="text-start">
                          <div>Imprimir A4</div>
                          <small className="text-muted">Formato padrão ({lastGeneratedVouchers.length} vouchers)</small>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => setLastGeneratedVouchers([])}
                        className="btn btn-outline-secondary w-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
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