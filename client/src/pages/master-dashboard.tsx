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
              {activeTab === "sync" && <SyncSection credentialsForm={credentialsForm} onSaveCredentials={onSaveCredentials} saveCredentialsMutation={saveCredentialsMutation} testCredentialsMutation={testCredentialsMutation} syncSitesMutation={syncSitesMutation} />}
              {activeTab === "sites" && <SitesSection sites={sites} />}
              {activeTab === "admins" && <AdminsSection users={users} onEdit={handleEditUser} onDelete={handleDeleteUser} onAdd={() => setUserModalOpen(true)} />}
              {activeTab === "vendedores" && <VendedoresSection users={users} />}
              {activeTab === "configuracoes" && <ConfigSection />}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <UserModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
      />
      
      <EditUserModal
        open={editUserModalOpen}
        onOpenChange={setEditUserModalOpen}
        user={selectedUser}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          setEditUserModalOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
}

// Sync Section Component
function SyncSection({ credentialsForm, onSaveCredentials, saveCredentialsMutation, testCredentialsMutation, syncSitesMutation }: any) {
  return (
    <div className="mb-4">
      <div className="mb-4">
        <h2 className="h3 fw-bold text-dark mb-2">Sincronização Omada</h2>
        <p className="text-muted">Configure as credenciais e sincronize sites</p>
      </div>

      {/* Omada Credentials Card */}
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
            
            <div className="d-flex gap-2 mt-3">
              <button 
                type="submit" 
                disabled={saveCredentialsMutation.isPending}
                className="btn btn-primary"
              >
                <Save className="me-2" size={16} />
                {saveCredentialsMutation.isPending ? "Salvando..." : "Salvar Credenciais"}
              </button>
              
              <button 
                type="button"
                onClick={() => testCredentialsMutation.mutate()}
                disabled={testCredentialsMutation.isPending}
                className="btn btn-outline-secondary"
              >
                {testCredentialsMutation.isPending ? "Testando..." : "Testar Conexão"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sync Sites Card */}
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0 d-flex align-items-center">
            <FolderSync className="me-2" size={20} />
            Sincronização de Sites
          </h5>
        </div>
        <div className="card-body">
          <p className="text-muted mb-3">
            Sincronize sites do controlador Omada com o sistema local.
          </p>
          <button 
            onClick={() => syncSitesMutation.mutate()}
            disabled={syncSitesMutation.isPending}
            className="btn btn-success"
          >
            <FolderSync className="me-2" size={16} />
            {syncSitesMutation.isPending ? "Sincronizando..." : "Sincronizar Sites"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sites Section Component
function SitesSection({ sites }: any) {
  return (
    <div className="mb-4">
      <div className="mb-4">
        <h2 className="h3 fw-bold text-dark mb-2">Sites</h2>
        <p className="text-muted">Gerenciar sites sincronizados</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">Lista de Sites</h5>
        </div>
        <div className="card-body">
          {sites.length === 0 ? (
            <p className="text-muted text-center py-4">
              Nenhum site encontrado. Sincronize com o Omada primeiro.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Localização</th>
                    <th>Status</th>
                    <th>ID Omada</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site: any) => (
                    <tr key={site.id}>
                      <td className="fw-semibold">{site.name}</td>
                      <td>{site.location || "Não informado"}</td>
                      <td>
                        <Badge variant={site.status === 'active' ? 'default' : 'secondary'}>
                          {site.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="font-monospace text-muted">{site.omadaSiteId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Admins Section Component
function AdminsSection({ users, onEdit, onDelete, onAdd }: any) {
  const admins = users.filter((u: any) => u.role === 'admin');

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h3 fw-bold text-dark mb-0">Administradores</h2>
          <p className="text-muted">Gerenciar usuários administradores</p>
        </div>
        <button onClick={onAdd} className="btn btn-primary">
          <Plus className="me-2" size={16} />
          Adicionar Admin
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {admins.length === 0 ? (
            <p className="text-muted text-center py-4">
              Nenhum administrador cadastrado.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin: any) => (
                    <tr key={admin.id}>
                      <td className="fw-semibold">{admin.username}</td>
                      <td>{admin.email}</td>
                      <td>{new Date(admin.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button 
                            onClick={() => onEdit(admin)}
                            className="btn btn-outline-primary btn-sm"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => onDelete(admin)}
                            className="btn btn-outline-danger btn-sm"
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
          )}
        </div>
      </div>
    </div>
  );
}

// Vendedores Section Component
function VendedoresSection({ users }: any) {
  const vendedores = users.filter((u: any) => u.role === 'vendedor');

  return (
    <div className="mb-4">
      <div className="mb-4">
        <h2 className="h3 fw-bold text-dark mb-2">Vendedores</h2>
        <p className="text-muted">Visualizar todos os vendedores do sistema</p>
      </div>

      <div className="card">
        <div className="card-body">
          {vendedores.length === 0 ? (
            <p className="text-muted text-center py-4">
              Nenhum vendedor cadastrado.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Site</th>
                    <th>Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {vendedores.map((vendedor: any) => (
                    <tr key={vendedor.id}>
                      <td className="fw-semibold">{vendedor.username}</td>
                      <td>{vendedor.email}</td>
                      <td>{vendedor.siteId ? "Atribuído" : "Não atribuído"}</td>
                      <td>{new Date(vendedor.createdAt).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Config Section Component
function ConfigSection() {
  return (
    <div className="mb-4">
      <div className="mb-4">
        <h2 className="h3 fw-bold text-dark mb-2">Configurações</h2>
        <p className="text-muted">Configurações gerais do sistema</p>
      </div>

      <div className="card">
        <div className="card-body">
          <p className="text-muted text-center py-4">
            Configurações em desenvolvimento.
          </p>
        </div>
      </div>
    </div>
  );
}