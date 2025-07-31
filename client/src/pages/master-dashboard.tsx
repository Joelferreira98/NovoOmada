import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { Crown, FolderSync, Building, ShieldQuestion, Settings, Save, Plus, Users, Mail, Calendar, Edit, Trash2 } from "lucide-react";
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("sync");
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
      active: activeTab === "settings",
      onClick: () => setActiveTab("settings")
    },
  ];

  const onSaveCredentials = (data: OmadaCredentialsForm) => {
    saveCredentialsMutation.mutate(data);
  };

  // Site creation removed - only sync functionality

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar
        title="Master User"
        subtitle="Administrador Geral"
        icon={Crown}
        iconBg="bg-warning"
        items={sidebarItems}
      />

      <div className="flex-fill p-3 p-lg-4 overflow-auto">
        <div className="container-fluid px-0">
          {activeTab === "sync" && (
            <div className="mb-4">
              <div className="mb-4">
                <h1 className="h2 h1-lg fw-bold text-dark mb-2">Sincronização Omada</h1>
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
