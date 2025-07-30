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
import { Crown, FolderSync, Building, ShieldQuestion, Settings, Save, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOmadaCredentialsSchema } from "@shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type OmadaCredentialsForm = z.infer<typeof insertOmadaCredentialsSchema>;

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

  const syncSitesMutation = useMutation({
    mutationFn: async () => {
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
                      <Label htmlFor="omadaUrl">URL do Omada</Label>
                      <Input
                        id="omadaUrl"
                        {...credentialsForm.register("omadaUrl")}
                        placeholder="https://omada.tplinkcloud.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="omadacId">Omada ID</Label>
                      <Input
                        id="omadacId"
                        {...credentialsForm.register("omadacId")}
                        placeholder="MSP ID ou Customer ID"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="clientId">Client ID</Label>
                      <Input
                        id="clientId"
                        {...credentialsForm.register("clientId")}
                        placeholder="Client ID da aplicação"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="clientSecret">Client Secret</Label>
                      <Input
                        id="clientSecret"
                        type="password"
                        {...credentialsForm.register("clientSecret")}
                        placeholder="••••••••"
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
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Sites Sincronizados</h1>
              <p className="text-slate-600 mt-2">Sites obtidos via sincronização com Omada</p>
            </div>

            {/* Sites List */}
            <Card>
              <CardHeader>
                <CardTitle>Sites Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                {(sites as any[]).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600">Nenhum site sincronizado</p>
                    <p className="text-sm text-slate-400 mt-2">Execute a sincronização na aba "Sincronização Omada"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(sites as any[]).map((site: any) => (
                      <div key={site.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="bg-emerald-100 p-2 rounded-lg">
                            <Building className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{site.name}</p>
                            <p className="text-sm text-slate-500">{site.location}</p>
                            <p className="text-xs text-slate-400">ID Omada: {site.omadaSiteId}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <Badge variant={site.status === "active" ? "default" : "secondary"}>
                            {site.status === "active" ? "Ativo" : "Inativo"}
                          </Badge>
                          
                          <div className="text-xs text-slate-400">
                            {site.lastSync ? `Última sync: ${new Date(site.lastSync).toLocaleDateString()}` : "Nunca sincronizado"}
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
