import { useState } from "react";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Crown, FolderSync, Building, ShieldQuestion, Settings, Save, Plus, Users, Mail, Calendar, Edit, Trash2, Upload, X, User, LogOut } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOmadaCredentialsSchema } from "@shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserModal } from "@/components/modals/user-modal";
import { EditUserModal } from "@/components/modals/edit-user-modal";


type OmadaCredentialsForm = z.infer<typeof insertOmadaCredentialsSchema>;

export default function MasterDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<
    "sync" | "sites" | "admins" | "vendedores" | "configuracoes"
  >("sync");
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  if (!user || user.role !== "master") {
    return <Redirect to="/auth" />;
  }

  const { data: omadaCredentials } = useQuery({
    queryKey: ["/api/omada-credentials"],
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["/api/sites"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário deletado",
        description: "Administrador removido com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao deletar usuário",
        variant: "destructive"
      });
    }
  });

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditUserModalOpen(true);
  };

  const handleDeleteUser = (user: any) => {
    if (confirm(`Tem certeza que deseja deletar o administrador "${user.username}"? Esta ação não pode ser desfeita.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const credentialsForm = useForm<OmadaCredentialsForm>({
    resolver: zodResolver(insertOmadaCredentialsSchema.omit({ createdBy: true })),
    defaultValues: {
      omadaUrl: (omadaCredentials as any)?.omadaUrl || "",
      omadacId: (omadaCredentials as any)?.omadacId || "",
      clientId: (omadaCredentials as any)?.clientId || "",
      clientSecret: "",

    },
  });

  // Sites are only synchronized from Omada, not created manually

  const saveCredentialsMutation = useMutation({
    mutationFn: async (data: OmadaCredentialsForm) => {
      const res = await apiRequest("POST", "/api/omada-credentials", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/omada-credentials"] });
      toast({
        title: "Credenciais salvas",
        description: "Credenciais do Omada foram salvas com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar credenciais",
        variant: "destructive",
      });
    },
  });

  const testCredentialsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/omada-credentials/test", {});
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Teste de Conexão" : "Erro na Conexão",
        description: data.message + (data.details ? ` ${data.details}` : ''),
        variant: data.success ? "default" : "destructive"
      });
    },
  });

  const syncSitesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sites/sync", {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      const hasError = data.error && !data.isDemo;
      toast({
        title: hasError ? "Erro na Sincronização" : "Sincronização Concluída",
        description: hasError 
          ? `${data.message}. Erro: ${data.error}`
          : `${data.syncedCount || 0} novos sites, ${data.updatedCount || 0} atualizados`,
        variant: hasError ? "destructive" : "default"
      });
    },
    onError: () => {
      toast({
        title: "Erro na sincronização",
        description: "Verifique as credenciais e conexão com Omada",
        variant: "destructive"
      });
    }
  });

  // Sites management removed - only sync and assign admins

  const sidebarItems = [
    { 
      icon: Crown, 
      label: "Dashboard", 
      active: activeTab === "dashboard",
      onClick: () => setActiveTab("dashboard")
    },
    { 
      icon: FolderSync, 
      label: "Sincronização Omada", 
      active: activeTab === "sync",
      onClick: () => setActiveTab("sync")
    },
    { 
      icon: Building, 
      label: "Gerenciar Sites", 
      active: activeTab === "sites",
      onClick: () => setActiveTab("sites")
    },
    { 
      icon: ShieldQuestion, 
      label: "Admins", 
      active: activeTab === "admins",
      onClick: () => setActiveTab("admins")
    },
    { 
      icon: Settings, 
      label: "Configurações", 
      active: activeTab === "configuracoes",
      onClick: () => setActiveTab("configuracoes")
    },
  ];

  const onSaveCredentials = (data: OmadaCredentialsForm) => {
    saveCredentialsMutation.mutate(data);
  };

  // Site creation removed - only sync functionality

  return (
    <div className="bg-light min-vh-100">
      <div className="container-fluid h-100">
        <div className="row h-100">
          {/* Sidebar */}
          <div className="col-12 col-lg-3 col-xl-2 p-0">
            <div className="bg-white shadow-lg h-100">
              <div className="p-4">
                {/* Logo/Title */}
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-primary bg-gradient rounded-circle p-3 me-3">
                    <Crown className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="h5 fw-bold text-dark mb-0">Master</h2>
                    <small className="text-muted">Sistema</small>
                  </div>
                </div>

                {/* Navigation */}
                <div className="d-grid gap-2">
                  <button
                    onClick={() => setActiveTab("sync")}
                    className={`btn text-start d-flex align-items-center ${
                      activeTab === "sync"
                        ? 'btn-primary fw-semibold' 
                        : 'btn-outline-light text-dark border-0 hover-bg-light'
                    }`}
                  >
                    <FolderSync className="me-2" size={18} />
                    Sincronizar Sites
                  </button>

                  <button
                    onClick={() => setActiveTab("sites")}
                    className={`btn text-start d-flex align-items-center ${
                      activeTab === "sites"
                        ? 'btn-primary fw-semibold' 
                        : 'btn-outline-light text-dark border-0 hover-bg-light'
                    }`}
                  >
                    <Building className="me-2" size={18} />
                    Sites
                  </button>

                  <button
                    onClick={() => setActiveTab("admins")}
                    className={`btn text-start d-flex align-items-center ${
                      activeTab === "admins"
                        ? 'btn-primary fw-semibold' 
                        : 'btn-outline-light text-dark border-0 hover-bg-light'
                    }`}
                  >
                    <ShieldQuestion className="me-2" size={18} />
                    Administradores
                  </button>

                  <button
                    onClick={() => setActiveTab("vendedores")}
                    className={`btn text-start d-flex align-items-center ${
                      activeTab === "vendedores"
                        ? 'btn-primary fw-semibold' 
                        : 'btn-outline-light text-dark border-0 hover-bg-light'
                    }`}
                  >
                    <Users className="me-2" size={18} />
                    Vendedores
                  </button>

                  <button
                    onClick={() => setActiveTab("configuracoes")}
                    className={`btn text-start d-flex align-items-center ${
                      activeTab === "configuracoes"
                        ? 'btn-primary fw-semibold' 
                        : 'btn-outline-light text-dark border-0 hover-bg-light'
                    }`}
                  >
                    <Settings className="me-2" size={18} />
                    Configurações
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-12 col-lg-9 col-xl-10 p-0">
            <div className="p-4">
              {/* Header with Profile Menu */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h1 className="h2 fw-bold text-dark mb-0">Dashboard Master</h1>
                  <p className="text-muted">Bem-vindo, {user?.username}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="btn btn-outline-secondary d-flex align-items-center gap-2">
                      <User size={16} />
                      {user?.username}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setLocation("/profile")}>
                      <User size={16} className="me-2" />
                      Meu Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                      <LogOut size={16} className="me-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Content */}
              {activeTab === "sync" && <SyncSection />}
              {activeTab === "sites" && <SitesSection />}
              {activeTab === "admins" && <AdminsSection />}
              {activeTab === "vendedores" && <VendedoresSection />}
              {activeTab === "configuracoes" && <ConfigSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sync Section Component
function SyncSection() {
  const { toast } = useToast();
  const { data: omadaCredentials } = useQuery({
    queryKey: ["/api/omada-credentials"],
  });

  const credentialsForm = useForm<OmadaCredentialsForm>({
    resolver: zodResolver(insertOmadaCredentialsSchema.omit({ createdBy: true })),
    defaultValues: {
      omadaUrl: (omadaCredentials as any)?.omadaUrl || "",
      omadacId: (omadaCredentials as any)?.omadacId || "",
      clientId: (omadaCredentials as any)?.clientId || "",
      clientSecret: "",
    },
  });

  const saveCredentialsMutation = useMutation({
    mutationFn: async (data: OmadaCredentialsForm) => {
      const res = await apiRequest("POST", "/api/omada-credentials", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/omada-credentials"] });
      toast({
        title: "Credenciais salvas",
        description: "Credenciais do Omada foram salvas com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar credenciais",
        variant: "destructive",
      });
    },
  });

  const testCredentialsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/omada-credentials/test", {});
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Teste de Conexão" : "Erro na Conexão",
        description: data.message + (data.details ? ` ${data.details}` : ''),
        variant: data.success ? "default" : "destructive"
      });
    },
  });

  const syncSitesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sites/sync", {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      const hasError = data.error && !data.isDemo;
      toast({
        title: hasError ? "Erro na Sincronização" : "Sincronização Concluída",
        description: hasError 
          ? `${data.message}. Erro: ${data.error}`
          : `${data.syncedCount || 0} novos sites, ${data.updatedCount || 0} atualizados`,
        variant: hasError ? "destructive" : "default"
      });
    },
    onError: () => {
      toast({
        title: "Erro na sincronização",
        description: "Verifique as credenciais e conexão com Omada",
        variant: "destructive"
      });
    }
  });

  const onSaveCredentials = (data: OmadaCredentialsForm) => {
    saveCredentialsMutation.mutate(data);
  };

  return (
    <div className="mb-4">
      <div className="mb-4">
        <h2 className="h3 fw-bold text-dark mb-2">Sincronização Omada</h2>
        <p className="text-muted">Configure as credenciais e sincronize sites</p>
      </div>

              {/* Omada Credentials - Bootstrap Card */}
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="card-title mb-0 d-flex align-items-center">
                    <Settings className="me-2" size={20} />
                    Credenciais Omada Software
                  </h5>
                </div>
                <div className="card-body">
                  <form onSubmit={credentialsForm.handleSubmit(onSaveCredentials)}>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label htmlFor="omadaUrl" className="form-label">URL do Omada</label>
                        <input
                          id="omadaUrl"
                          type="url"
                          className="form-control"
                          {...credentialsForm.register("omadaUrl")}
                          placeholder="https://omada.tplinkcloud.com"
                        />
                      </div>
                      
                      <div className="col-12 col-md-6">
                        <label htmlFor="omadacId" className="form-label">Omada ID</label>
                        <input
                          id="omadacId"
                          type="text"
                          className="form-control"
                          {...credentialsForm.register("omadacId")}
                          placeholder="MSP ID ou Customer ID"
                        />
                      </div>
                      
                      <div className="col-12 col-md-6">
                        <label htmlFor="clientId" className="form-label">Client ID</label>
                        <input
                          id="clientId"
                          type="text"
                          className="form-control"
                          {...credentialsForm.register("clientId")}
                          placeholder="Client ID da aplicação"
                        />
                      </div>
                      
                      <div className="col-12 col-md-6">
                        <label htmlFor="clientSecret" className="form-label">Client Secret</label>
                        <input
                          id="clientSecret"
                          type="password"
                          className="form-control"
                          {...credentialsForm.register("clientSecret")}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  

                    
                    <div className="d-flex flex-column flex-lg-row gap-3 mt-4">
                      <button 
                        type="submit" 
                        disabled={saveCredentialsMutation.isPending}
                        className="btn btn-primary d-flex align-items-center justify-content-center"
                      >
                        <Save className="me-2" size={16} />
                        {saveCredentialsMutation.isPending ? "Salvando..." : "Salvar Credenciais"}
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => testCredentialsMutation.mutate()}
                        disabled={testCredentialsMutation.isPending || !omadaCredentials}
                        className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                      >
                        <ShieldQuestion className="me-2" size={16} />
                        {testCredentialsMutation.isPending ? "Testando..." : "Testar Conexão"}
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => syncSitesMutation.mutate()}
                        disabled={syncSitesMutation.isPending}
                        className="btn btn-success d-flex align-items-center justify-content-center"
                      >
                        <FolderSync className="me-2" size={16} />
                        {syncSitesMutation.isPending ? "Sincronizando..." : "Sincronizar Sites"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

        {activeTab === "sites" && (
          <div className="mb-4">
            <div className="mb-4">
              <h1 className="h2 h1-lg fw-bold text-dark mb-2">Sites Sincronizados</h1>
              <p className="text-muted">Sites obtidos via sincronização com Omada</p>
            </div>

            {/* Sites List - Bootstrap Card */}
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <Building className="me-2" size={20} />
                  Sites Disponíveis
                </h5>
              </div>
              <div className="card-body">
                {(sites as any[]).length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted">Nenhum site sincronizado</p>
                    <p className="small text-muted mt-2">Execute a sincronização na aba "Sincronização Omada"</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {(sites as any[]).map((site: any) => (
                      <div key={site.id} className="col-12">
                        <div className="border rounded p-3 d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <div className="bg-success bg-opacity-10 p-2 rounded me-3">
                              <Building className="text-success" size={20} />
                            </div>
                            <div>
                              <h6 className="mb-1 fw-semibold">{site.name}</h6>
                              <p className="small text-muted mb-1">{site.location}</p>
                              <p className="small text-muted mb-0">ID Omada: {site.omadaSiteId}</p>
                            </div>
                          </div>
                          
                          <div className="d-flex align-items-center gap-3">
                            <span className={`badge ${site.status === "active" ? "bg-success" : "bg-secondary"}`}>
                              {site.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                            
                            <div className="small text-muted">
                              {site.lastSync ? `Última sync: ${new Date(site.lastSync).toLocaleDateString()}` : "Nunca sincronizado"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "admins" && (
          <div className="mb-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4">
              <div className="mb-3 mb-lg-0">
                <h1 className="h2 h1-lg fw-bold text-dark mb-2">Administradores</h1>
                <p className="text-muted">Gerencie usuários administrativos e vendedores</p>
              </div>
              <button 
                onClick={() => setUserModalOpen(true)}
                className="btn btn-primary d-flex align-items-center"
              >
                <Plus className="me-2" size={16} />
                Criar Usuário
              </button>
            </div>

            {/* Admins Section - Bootstrap Card */}
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <Users className="me-2" size={20} />
                  Administradores
                </h5>
              </div>
              <div className="card-body">
                {(users as any[]).filter((u: any) => u.role === 'admin').length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted">Nenhum administrador cadastrado</p>
                    <p className="small text-muted mt-2">Clique em "Criar Usuário" para adicionar um administrador</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {(users as any[]).filter((u: any) => u.role === 'admin').map((admin: any) => (
                      <div key={admin.id} className="col-12">
                        <div className="border rounded p-3 d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                              <Users className="text-primary" size={20} />
                            </div>
                            <div>
                              <h6 className="mb-1 fw-semibold">{admin.username}</h6>
                              <p className="small text-muted mb-1 d-flex align-items-center">
                                <Mail className="me-1" size={14} />
                                {admin.email}
                              </p>
                              <p className="small text-muted mb-0 d-flex align-items-center">
                                <Calendar className="me-1" size={14} />
                                Criado em {new Date(admin.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-primary">Administrador</span>
                            <button 
                              className="btn btn-outline-secondary btn-sm d-flex align-items-center"
                              onClick={() => handleEditUser(admin)}
                            >
                              <Edit className="me-1" size={14} />
                              Editar
                            </button>
                            <button 
                              className="btn btn-outline-danger btn-sm d-flex align-items-center"
                              onClick={() => handleDeleteUser(admin)}
                            >
                              <Trash2 className="me-1" size={14} />
                              Deletar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Vendedores Section - Bootstrap Card */}
            <div className="card mt-4">
              <div className="card-header">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <Building className="me-2" size={20} />
                  Vendedores
                </h5>
              </div>
              <div className="card-body">
                {(users as any[]).filter((u: any) => u.role === 'vendedor').length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted">Nenhum vendedor cadastrado</p>
                    <p className="small text-muted mt-2">Vendedores são criados pelos administradores de cada site</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {(users as any[]).filter((u: any) => u.role === 'vendedor').map((vendedor: any) => (
                      <div key={vendedor.id} className="col-12">
                        <div className="border rounded p-3 d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <div className="bg-success bg-opacity-10 p-2 rounded me-3">
                              <Building className="text-success" size={20} />
                            </div>
                            <div>
                              <h6 className="mb-1 fw-semibold">{vendedor.username}</h6>
                              <p className="small text-muted mb-1 d-flex align-items-center">
                                <Mail className="me-1" size={14} />
                                {vendedor.email}
                              </p>
                              <p className="small text-muted mb-0 d-flex align-items-center">
                                <Calendar className="me-1" size={14} />
                                Criado em {new Date(vendedor.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-success">Vendedor</span>
                            <button className="btn btn-outline-secondary btn-sm">
                              Ver Sites
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Tab - Overview */}
        {activeTab === "dashboard" && (
          <div className="mb-4">
            <div className="mb-4">
              <h1 className="h2 h1-lg fw-bold text-dark mb-2">Dashboard Master</h1>
              <p className="text-muted">Visão geral do sistema</p>
            </div>

            <div className="row g-4">
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card text-center">
                  <div className="card-body">
                    <div className="bg-warning bg-opacity-10 p-3 rounded-circle mx-auto mb-3" style={{width: '60px', height: '60px'}}>
                      <Crown className="text-warning" size={24} />
                    </div>
                    <h5 className="fw-bold">{(users as any[]).filter((u: any) => u.role === 'admin').length}</h5>
                    <p className="text-muted mb-0 small">Administradores</p>
                  </div>
                </div>
              </div>
              
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card text-center">
                  <div className="card-body">
                    <div className="bg-success bg-opacity-10 p-3 rounded-circle mx-auto mb-3" style={{width: '60px', height: '60px'}}>
                      <Building className="text-success" size={24} />
                    </div>
                    <h5 className="fw-bold">{(sites as any[]).length}</h5>
                    <p className="text-muted mb-0 small">Sites Ativos</p>
                  </div>
                </div>
              </div>
              
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card text-center">
                  <div className="card-body">
                    <div className="bg-primary bg-opacity-10 p-3 rounded-circle mx-auto mb-3" style={{width: '60px', height: '60px'}}>
                      <Users className="text-primary" size={24} />
                    </div>
                    <h5 className="fw-bold">{(users as any[]).filter((u: any) => u.role === 'vendedor').length}</h5>
                    <p className="text-muted mb-0 small">Vendedores</p>
                  </div>
                </div>
              </div>
              
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card text-center">
                  <div className="card-body">
                    <div className="bg-info bg-opacity-10 p-3 rounded-circle mx-auto mb-3" style={{width: '60px', height: '60px'}}>
                      <Settings className="text-info" size={24} />
                    </div>
                    <h5 className="fw-bold">{omadaCredentials ? "Ativo" : "Inativo"}</h5>
                    <p className="text-muted mb-0 small">Status Omada</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "configuracoes" && <AppSettingsSection />}

        </div>
      </div>

      <UserModal 
        open={userModalOpen} 
        onOpenChange={setUserModalOpen} 
      />
      
      <EditUserModal 
        open={editUserModalOpen} 
        onOpenChange={setEditUserModalOpen}
        user={selectedUser}
      />
    </div>
  );
}

// Componente para configurações da aplicação
function AppSettingsSection() {
  const { toast } = useToast();
  const [settingsForm, setSettingsForm] = useState({
    appName: "",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#007bff"
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  const { data: appSettings, isLoading } = useQuery({
    queryKey: ["/api/app-settings"],
  });

  // Preencher formulário com dados existentes  
  React.useEffect(() => {
    if (appSettings) {
      setSettingsForm({
        appName: appSettings.appName || "Omada Voucher System",
        logoUrl: appSettings.logoUrl || "",
        faviconUrl: appSettings.faviconUrl || "",
        primaryColor: appSettings.primaryColor || "#007bff"
      });
    }
  }, [appSettings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const res = await apiRequest("PUT", "/api/app-settings", settings);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
      toast({
        title: "Configurações salvas",
        description: "As configurações da aplicação foram atualizadas com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar configurações",
        variant: "destructive"
      });
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setSettingsForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(settingsForm);
  };

  // Upload functions
  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao enviar logo');
      }

      const result = await response.json();
      handleInputChange('logoUrl', result.fileUrl);
      
      toast({
        title: "Logo enviado",
        description: "Logo carregado com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const uploadFavicon = async (file: File) => {
    setFaviconUploading(true);
    try {
      const formData = new FormData();
      formData.append('favicon', file);

      const response = await fetch('/api/upload-favicon', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao enviar favicon');
      }

      const result = await response.json();
      handleInputChange('faviconUrl', result.fileUrl);
      
      toast({
        title: "Favicon enviado",
        description: "Favicon carregado com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setFaviconUploading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive"
      });
      return;
    }

    if (type === 'logo') {
      uploadLogo(file);
    } else {
      uploadFavicon(file);
    }

    // Reset input
    event.target.value = '';
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="mb-4">
        <h1 className="h2 h1-lg fw-bold text-dark mb-2">Configurações da Aplicação</h1>
        <p className="text-muted">Personalize o nome, logo e aparência do sistema</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0 d-flex align-items-center">
            <Settings className="me-2" size={20} />
            Personalização
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label htmlFor="appName" className="form-label">Nome da Aplicação</label>
              <input
                id="appName"
                type="text"
                className="form-control"
                value={settingsForm.appName}
                onChange={(e) => handleInputChange("appName", e.target.value)}
                placeholder="Nome do sistema"
              />
              <div className="form-text">
                Este nome aparecerá no título da aplicação e nos cabeçalhos
              </div>
            </div>
            
            <div className="col-12 col-md-6">
              <label htmlFor="primaryColor" className="form-label">Cor Primária</label>
              <input
                id="primaryColor"
                type="color"
                className="form-control form-control-color"
                value={settingsForm.primaryColor}
                onChange={(e) => handleInputChange("primaryColor", e.target.value)}
              />
              <div className="form-text">
                Cor principal da interface (botões, links, etc.)
              </div>
            </div>
            
            <div className="col-12">
              <label className="form-label">Logo da Aplicação</label>
              <div className="row g-2">
                <div className="col-12 col-md-8">
                  <input
                    type="url"
                    className="form-control"
                    value={settingsForm.logoUrl}
                    onChange={(e) => handleInputChange("logoUrl", e.target.value)}
                    placeholder="https://exemplo.com/logo.png ou use upload"
                  />
                </div>
                <div className="col-12 col-md-4">
                  <div className="d-flex gap-2">
                    <label className={`btn btn-outline-primary ${logoUploading ? 'disabled' : ''}`}>
                      <Upload size={16} className="me-1" />
                      {logoUploading ? 'Enviando...' : 'Upload'}
                      <input
                        type="file"
                        className="d-none"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                        disabled={logoUploading}
                      />
                    </label>
                    {settingsForm.logoUrl && (
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => handleInputChange("logoUrl", "")}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="form-text">
                Faça upload de uma imagem ou insira uma URL (opcional)
              </div>
            </div>
            
            <div className="col-12">
              <label className="form-label">Favicon da Aplicação</label>
              <div className="row g-2">
                <div className="col-12 col-md-8">
                  <input
                    type="url"
                    className="form-control"
                    value={settingsForm.faviconUrl}
                    onChange={(e) => handleInputChange("faviconUrl", e.target.value)}
                    placeholder="https://exemplo.com/favicon.ico ou use upload"
                  />
                </div>
                <div className="col-12 col-md-4">
                  <div className="d-flex gap-2">
                    <label className={`btn btn-outline-primary ${faviconUploading ? 'disabled' : ''}`}>
                      <Upload size={16} className="me-1" />
                      {faviconUploading ? 'Enviando...' : 'Upload'}
                      <input
                        type="file"
                        className="d-none"
                        accept="image/*,.ico"
                        onChange={(e) => handleFileUpload(e, 'favicon')}
                        disabled={faviconUploading}
                      />
                    </label>
                    {settingsForm.faviconUrl && (
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => handleInputChange("faviconUrl", "")}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="form-text">
                Ícone que aparece na aba do navegador (PNG, ICO, etc.)
              </div>
            </div>
          </div>

          <div className="d-flex flex-column flex-lg-row gap-3 mt-4">
            <button 
              onClick={handleSave}
              disabled={saveSettingsMutation.isPending}
              className="btn btn-primary d-flex align-items-center"
            >
              <Save className="me-2" size={16} />
              {saveSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {(settingsForm.logoUrl || settingsForm.appName !== "Omada Voucher System") && (
        <div className="card mt-4">
          <div className="card-header">
            <h5 className="card-title mb-0">Visualização</h5>
          </div>
          <div className="card-body">
            <div className="d-flex align-items-center p-3 bg-light rounded">
              {settingsForm.logoUrl && (
                <img 
                  src={settingsForm.logoUrl} 
                  alt="Logo" 
                  className="me-3"
                  style={{ height: "40px", objectFit: "contain" }}
                />
              )}
              <h4 className="mb-0" style={{ color: settingsForm.primaryColor }}>
                {settingsForm.appName}
              </h4>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
