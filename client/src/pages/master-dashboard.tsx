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
import { Crown, FolderSync, Building, ShieldQuestion, Settings, Save, Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOmadaCredentialsSchema, insertSiteSchema } from "@shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type OmadaCredentialsForm = z.infer<typeof insertOmadaCredentialsSchema>;
type SiteForm = z.infer<typeof insertSiteSchema>;

export default function MasterDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("sync");

  if (!user || user.role !== "master") {
    return <Redirect to="/auth" />;
  }

  const { data: omadaCredentials } = useQuery({
    queryKey: ["/api/omada-credentials"],
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["/api/sites"],
  });

  const credentialsForm = useForm<OmadaCredentialsForm>({
    resolver: zodResolver(insertOmadaCredentialsSchema.omit({ createdBy: true })),
    defaultValues: {
      controllerUrl: omadaCredentials?.controllerUrl || "",
      username: omadaCredentials?.username || "",
      password: "",
      siteId: omadaCredentials?.siteId || "",
    },
  });

  const siteForm = useForm<SiteForm>({
    resolver: zodResolver(insertSiteSchema),
    defaultValues: {
      name: "",
      location: "",
      omadaSiteId: "",
      status: "active",
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

  const syncSitesMutation = useMutation({
    mutationFn: async () => {
      // In a real implementation, this would call Omada API
      const res = await apiRequest("POST", "/api/sites/sync", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({
        title: "Sincronização iniciada",
        description: "Sites estão sendo sincronizados com o Omada",
      });
    },
  });

  const createSiteMutation = useMutation({
    mutationFn: async (data: SiteForm) => {
      const res = await apiRequest("POST", "/api/sites", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      siteForm.reset();
      toast({
        title: "Site criado",
        description: "Site foi criado com sucesso",
      });
    },
  });

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

  const onCreateSite = (data: SiteForm) => {
    createSiteMutation.mutate(data);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        title="Master User"
        subtitle="Administrador Geral"
        icon={Crown}
        iconBg="bg-primary"
        items={sidebarItems}
      />

      <div className="flex-1 p-8 overflow-auto">
        {activeTab === "sync" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Sincronização Omada</h1>
              <p className="text-slate-600 mt-2">Configure as credenciais e sincronize sites</p>
            </div>

            {/* Omada Credentials */}
            <Card>
              <CardHeader>
                <CardTitle>Credenciais Omada Software</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={credentialsForm.handleSubmit(onSaveCredentials)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="controllerUrl">URL do Controller</Label>
                      <Input
                        id="controllerUrl"
                        {...credentialsForm.register("controllerUrl")}
                        placeholder="https://controller.omada.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        {...credentialsForm.register("username")}
                        placeholder="admin"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        {...credentialsForm.register("password")}
                        placeholder="••••••••"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="siteId">Site ID</Label>
                      <Input
                        id="siteId"
                        {...credentialsForm.register("siteId")}
                        placeholder="Default"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <Button 
                      type="submit" 
                      disabled={saveCredentialsMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveCredentialsMutation.isPending ? "Salvando..." : "Salvar Credenciais"}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => syncSitesMutation.mutate()}
                      disabled={syncSitesMutation.isPending}
                      className="bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      <FolderSync className="w-4 h-4 mr-2" />
                      {syncSitesMutation.isPending ? "Sincronizando..." : "Sincronizar Sites"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "sites" && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Gerenciar Sites</h1>
                <p className="text-slate-600 mt-2">Adicione e gerencie sites do sistema</p>
              </div>
              <Button onClick={() => siteForm.reset()}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Site
              </Button>
            </div>

            {/* Add Site Form */}
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Novo Site</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={siteForm.handleSubmit(onCreateSite)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="siteName">Nome do Site</Label>
                      <Input
                        id="siteName"
                        {...siteForm.register("name")}
                        placeholder="Ex: Loja Shopping Center"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="location">Localização</Label>
                      <Input
                        id="location"
                        {...siteForm.register("location")}
                        placeholder="São Paulo - SP"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="omadaSiteId">Omada Site ID</Label>
                      <Input
                        id="omadaSiteId"
                        {...siteForm.register("omadaSiteId")}
                        placeholder="Site ID do Omada"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={createSiteMutation.isPending}
                  >
                    {createSiteMutation.isPending ? "Criando..." : "Criar Site"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Sites List */}
            <Card>
              <CardHeader>
                <CardTitle>Sites Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {sites.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">Nenhum site cadastrado</p>
                ) : (
                  <div className="space-y-4">
                    {sites.map((site: any) => (
                      <div key={site.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="bg-emerald-100 p-2 rounded-lg">
                            <Building className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{site.name}</p>
                            <p className="text-sm text-slate-500">{site.location}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <Badge variant={site.status === "active" ? "default" : "secondary"}>
                            {site.status === "active" ? "Ativo" : "Inativo"}
                          </Badge>
                          
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-emerald-600">
                              <FolderSync className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "admins" && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Administradores</h1>
                <p className="text-slate-600 mt-2">Gerencie usuários administrativos</p>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Criar Admin
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <p className="text-slate-600 text-center py-8">
                  Funcionalidade de gerenciamento de admins será implementada aqui
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
