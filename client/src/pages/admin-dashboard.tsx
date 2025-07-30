import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { PlanModal } from "@/components/modals/plan-modal";
import { Shield, TicketIcon, DollarSign, Users, Tags, BarChart, ScanBarcode, Plus, Edit, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [showPlanModal, setShowPlanModal] = useState(false);

  if (!user || user.role !== "admin") {
    return <Redirect to="/auth" />;
  }

  const { data: userSites = [] } = useQuery({
    queryKey: ["/api/sites"],
  });

  const { data: siteStats } = useQuery({
    queryKey: ["/api/stats/site", selectedSite],
    enabled: !!selectedSite,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["/api/sites", selectedSite, "plans"],
    enabled: !!selectedSite,
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["/api/sites", selectedSite, "users", "vendedor"],
    enabled: !!selectedSite,
  });

  // Set default site if user has sites and no site is selected
  if ((userSites as any[]).length > 0 && !selectedSite) {
    setSelectedSite((userSites as any[])[0].id);
  }

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest("DELETE", `/api/plans/${planId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", selectedSite, "plans"] });
      toast({
        title: "Plano excluído",
        description: "Plano foi excluído com sucesso",
      });
    },
  });

  const sidebarItems = [
    { 
      icon: Shield, 
      label: "Dashboard", 
      active: activeTab === "dashboard",
      onClick: () => setActiveTab("dashboard")
    },
    { 
      icon: Tags, 
      label: "Planos", 
      active: activeTab === "plans",
      onClick: () => setActiveTab("plans")
    },
    { 
      icon: Users, 
      label: "Vendedores", 
      active: activeTab === "sellers",
      onClick: () => setActiveTab("sellers")
    },
    { 
      icon: BarChart, 
      label: "Relatórios", 
      active: activeTab === "reports",
      onClick: () => setActiveTab("reports")
    },
    { 
      icon: ScanBarcode, 
      label: "Fechamento Caixa", 
      active: activeTab === "cash",
      onClick: () => setActiveTab("cash")
    },
  ];

  const selectedSiteName = (userSites as any[]).find((site: any) => site.id === selectedSite)?.name || "";

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        title="Admin User"
        subtitle="Administrador"
        icon={Shield}
        iconBg="bg-emerald-500"
        items={sidebarItems}
        extraContent={
          <div className="px-6 py-4 border-b border-slate-700">
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="w-full bg-slate-700 text-white border-slate-600">
                <SelectValue placeholder="Selecione um site" />
              </SelectTrigger>
              <SelectContent>
                {(userSites as any[]).map((site: any) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="flex-1 p-8 overflow-auto">
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Dashboard Admin</h1>
              <p className="text-slate-600 mt-2">
                {selectedSiteName} - Gerenciamento de planos e vendedores
              </p>
            </div>

            {/* Stats Cards */}
            {siteStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-emerald-100 p-3 rounded-lg">
                        <TicketIcon className="text-emerald-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <p className="text-2xl font-bold text-slate-800">{siteStats.vouchersToday}</p>
                        <p className="text-slate-600 font-medium">Vouchers Hoje</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-primary-100 p-3 rounded-lg">
                        <DollarSign className="text-primary-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <p className="text-2xl font-bold text-slate-800">R$ {siteStats.revenueToday}</p>
                        <p className="text-slate-600 font-medium">Receita Hoje</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-amber-100 p-3 rounded-lg">
                        <Users className="text-amber-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <p className="text-2xl font-bold text-slate-800">{siteStats.activeSellers}</p>
                        <p className="text-slate-600 font-medium">Vendedores Ativos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-red-100 p-3 rounded-lg">
                        <Tags className="text-red-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <p className="text-2xl font-bold text-slate-800">{siteStats.activePlans}</p>
                        <p className="text-slate-600 font-medium">Planos Ativos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === "plans" && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Gerenciar Planos</h1>
                <p className="text-slate-600 mt-2">Crie e gerencie planos de internet</p>
              </div>
              <Button 
                onClick={() => setShowPlanModal(true)}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Plano
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                {(plans as any[]).length === 0 ? (
                  <p className="text-slate-600 text-center py-8">
                    Nenhum plano criado para este site
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Nome</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Duração</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Velocidade</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Preço</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(plans as any[]).map((plan: any) => (
                          <tr key={plan.id} className="border-b border-slate-100">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-slate-800">{plan.nome}</p>
                                <p className="text-sm text-slate-500">Código: {plan.codeForm}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{plan.duration} min</td>
                            <td className="py-3 px-4 text-slate-600">
                              <div className="text-sm">
                                <p>↓ {plan.downLimit} Mbps</p>
                                <p>↑ {plan.upLimit} Mbps</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800">R$ {plan.unitPrice}</td>
                            <td className="py-3 px-4">
                              <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                                {plan.status === "active" ? "Ativo" : "Inativo"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <Button size="sm" variant="ghost" className="text-primary-600">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-600"
                                  onClick={() => deletePlanMutation.mutate(plan.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "sellers" && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Vendedores</h1>
                <p className="text-slate-600 mt-2">Gerencie os vendedores do site</p>
              </div>
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Criar Vendedor
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                {(sellers as any[]).length === 0 ? (
                  <p className="text-slate-600 text-center py-8">
                    Nenhum vendedor cadastrado para este site
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(sellers as any[]).map((seller: any) => (
                      <div key={seller.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center mb-4">
                          <div className="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center">
                            <Users className="text-amber-600" />
                          </div>
                          <div className="ml-3">
                            <p className="font-semibold text-slate-800">{seller.username}</p>
                            <p className="text-sm text-slate-500">{seller.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button variant="outline" className="flex-1 text-primary-600 border-primary-600">
                            Editar
                          </Button>
                          <Button variant="outline" className="text-red-600 border-red-600">
                            Desativar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <PlanModal 
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        siteId={selectedSite}
      />
    </div>
  );
}
