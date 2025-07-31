import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { User, TicketIcon, TrendingUp, History, DollarSign, Calendar, Printer, Copy, Download, Calculator } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VendedorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [quantity, setQuantity] = useState(1);

  if (!user || user.role !== "vendedor") {
    return <Redirect to="/auth" />;
  }

  const { data: userSites = [] } = useQuery({
    queryKey: ["/api/sites"],
  });

  const userSite = (userSites as any[])[0]; // Vendedor só tem acesso a um site

  const { data: dailyStats } = useQuery({
    queryKey: ["/api/stats/daily", userSite?.id],
    enabled: !!userSite,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["/api/sites", userSite?.id, "plans"],
    enabled: !!userSite,
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ["/api/vouchers", userSite?.id],
    enabled: !!userSite,
  });

  const generateVouchersMutation = useMutation({
    mutationFn: async (data: { planId: string; quantity: number }) => {
      const res = await apiRequest("POST", "/api/vouchers/generate", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate vouchers");
      }
      return await res.json();
    },
    onSuccess: (vouchers) => {
      setSelectedPlan("");
      setQuantity(1);
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers", userSite?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily", userSite?.id] });
      
      toast({
        title: "Vouchers gerados com sucesso!",
        description: `${vouchers.length} vouchers criados via API do Omada.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar vouchers",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedPlanData = (plans as any[]).find((plan: any) => plan.id === selectedPlan);
  const totalPrice = selectedPlanData ? (selectedPlanData.unitPrice * quantity).toFixed(2) : "0.00";

  const selectedSite = userSite?.id;

  const onGenerateVouchers = () => {
    if (!selectedPlan) {
      toast({
        title: "Erro",
        description: "Selecione um plano",
        variant: "destructive",
      });
      return;
    }
    generateVouchersMutation.mutate({ planId: selectedPlan, quantity });
  };

  const sidebarItems = [
    { 
      icon: TicketIcon, 
      label: "Gerar Vouchers", 
      active: activeTab === "generate",
      onClick: () => setActiveTab("generate")
    },
    { 
      icon: Calculator, 
      label: "Caixa", 
      active: activeTab === "cash",
      onClick: () => window.location.href = "/cash"
    },
    { 
      icon: TrendingUp, 
      label: "Minhas Vendas", 
      active: activeTab === "sales",
      onClick: () => setActiveTab("sales")
    },
    { 
      icon: History, 
      label: "Histórico", 
      active: activeTab === "history",
      onClick: () => setActiveTab("history")
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        title="Vendedor"
        subtitle={userSite?.name || "Site não encontrado"}
        icon={User}
        iconBg="bg-amber-500"
        items={sidebarItems}
      />

      <div className="flex-1 p-8 overflow-auto">
        {activeTab === "generate" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Geração de Vouchers</h1>
              <p className="text-slate-600 mt-2">Crie vouchers de acesso à internet</p>
            </div>

            {/* Daily Stats */}
            {dailyStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-amber-100 p-3 rounded-lg">
                        <TicketIcon className="text-amber-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <p className="text-2xl font-bold text-slate-800">{dailyStats.vouchersToday}</p>
                        <p className="text-slate-600 font-medium">Vouchers Hoje</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-emerald-100 p-3 rounded-lg">
                        <DollarSign className="text-emerald-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <p className="text-2xl font-bold text-slate-800">R$ {dailyStats.revenueToday}</p>
                        <p className="text-slate-600 font-medium">Vendas Hoje</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-primary-100 p-3 rounded-lg">
                        <Calendar className="text-primary-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <p className="text-2xl font-bold text-slate-800">R$ {dailyStats.averageDaily}</p>
                        <p className="text-slate-600 font-medium">Média Diária</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Voucher Generation */}
            <Card>
              <CardHeader>
                <CardTitle>Gerar Novos Vouchers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="plan">Selecionar Plano</Label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {(plans as any[]).map((plan: any) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.nome} - R$ {plan.unitPrice}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="quantity">Quantidade de Vouchers</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max="50"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                {/* Plan Preview */}
                {selectedPlanData && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-slate-800 mb-3">Detalhes do Plano Selecionado</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Duração:</p>
                        <p className="font-medium">{selectedPlanData.duration} minutos</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Download:</p>
                        <p className="font-medium">{selectedPlanData.downLimit} Mbps</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Upload:</p>
                        <p className="font-medium">{selectedPlanData.upLimit} Mbps</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Preço:</p>
                        <p className="font-medium text-emerald-600">R$ {selectedPlanData.unitPrice}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-800">
                      Total: <span className="text-emerald-600">R$ {totalPrice}</span>
                    </p>
                    <p className="text-sm text-slate-600">
                      {quantity} voucher(s) × R$ {selectedPlanData?.unitPrice || "0.00"}
                    </p>
                  </div>
                  <Button 
                    onClick={onGenerateVouchers}
                    disabled={generateVouchersMutation.isPending || !selectedPlan}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    <TicketIcon className="w-4 h-4 mr-2" />
                    {generateVouchersMutation.isPending ? "Gerando..." : "Gerar Vouchers"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Vouchers */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Vouchers Recentes</CardTitle>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Lista
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(vouchers as any[]).length === 0 ? (
                  <p className="text-slate-600 text-center py-8">
                    Nenhum voucher gerado ainda
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Código</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Plano</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Data/Hora</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(vouchers as any[]).slice(0, 10).map((voucher: any) => (
                          <tr key={voucher.id} className="border-b border-slate-100">
                            <td className="py-3 px-4">
                              <div className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                                {voucher.code}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm">
                                <p className="font-medium text-slate-800">{voucher.plan?.nome}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 text-sm">
                              {new Date(voucher.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={voucher.status === "available" ? "default" : "secondary"}>
                                {voucher.status === "available" ? "Disponível" : "Usado"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <Button size="sm" variant="ghost" className="text-primary-600">
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-amber-600">
                                  <Copy className="w-4 h-4" />
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

        {activeTab === "sales" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Relatórios</h1>
              <p className="text-slate-600 mt-2">Visualize estatísticas e relatórios de vouchers</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Acessar Relatórios Detalhados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">
                  Acesse o sistema completo de relatórios para visualizar estatísticas detalhadas, 
                  histórico de uso e distribuição por duração dos vouchers.
                </p>
                <Button 
                  onClick={() => window.location.href = "/reports"}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Abrir Relatórios
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Histórico</h1>
              <p className="text-slate-600 mt-2">Histórico completo de vouchers</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <p className="text-slate-600 text-center py-8">
                  Histórico detalhado será implementado aqui
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
