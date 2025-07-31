import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar } from "@/components/layout/sidebar";
import { User, TicketIcon, TrendingUp, History, DollarSign, Calendar, Printer, Copy, Download, Calculator, BarChart3, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VendedorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [lastGeneratedVouchers, setLastGeneratedVouchers] = useState<any[]>([]);

  if (!user || user.role !== "vendedor") {
    return <Redirect to="/auth" />;
  }

  const { data: userSites = [] } = useQuery({
    queryKey: ["/api/sites"],
  });

  const userSite = (userSites as any[])[0];

  const { data: dailyStats = {} } = useQuery({
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

  const { data: printHistory = [] } = useQuery({
    queryKey: ["/api/print-history", userSite?.id],
    enabled: !!userSite,
  });

  const generateVouchersMutation = useMutation({
    mutationFn: async (data: { planId: string; quantity: number }) => {
      const res = await apiRequest("POST", `/api/vouchers/generate`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      setLastGeneratedVouchers(data.vouchers || []);
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers", userSite?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily", userSite?.id] });
      toast({
        title: "Vouchers gerados com sucesso!",
        description: `${data.vouchers?.length || 0} vouchers foram criados.`,
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

  const deleteVoucherMutation = useMutation({
    mutationFn: async (voucherId: string) => {
      const res = await apiRequest("DELETE", `/api/vouchers/${voucherId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers", userSite?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily", userSite?.id] });
      toast({
        title: "Voucher excluído",
        description: "O voucher foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir voucher",
        description: error.message || "Não foi possível excluir o voucher",
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

  const sidebarItems = [
    { 
      icon: TicketIcon, 
      label: "Gerar Vouchers", 
      active: activeTab === "generate",
      onClick: () => setActiveTab("generate")
    },
    { 
      icon: BarChart3, 
      label: "Relatórios", 
      active: activeTab === "sales",
      onClick: () => setActiveTab("sales")
    },
    { 
      icon: History, 
      label: "Histórico", 
      active: activeTab === "history",
      onClick: () => setActiveTab("history")
    },
    { 
      icon: Printer, 
      label: "Reimprimir Vouchers", 
      active: activeTab === "print-history",
      onClick: () => setActiveTab("print-history")
    }
  ];

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar
        title="Vendedor"
        subtitle={userSite?.name || "Site não encontrado"}
        icon={User}
        iconBg="bg-warning"
        items={sidebarItems}
      />

      <div className="flex-fill p-3 p-lg-4 overflow-auto">
        <div className="container-fluid px-0">
          
          {/* Generate Tab */}
          {activeTab === "generate" && (
            <div className="mb-4">
              <div className="mb-4">
                <h1 className="h2 h1-lg fw-bold text-dark mb-2">Geração de Vouchers</h1>
                <p className="text-muted">Crie vouchers de acesso à internet</p>
              </div>

              {/* Daily Stats - Bootstrap Cards */}
              {dailyStats && (
                <div className="row g-3 mb-4">
                  <div className="col-12 col-sm-6 col-lg-4">
                    <div className="card border-warning bg-warning bg-opacity-10">
                      <div className="card-body p-3 p-lg-4">
                        <div className="d-flex align-items-center">
                          <div className="bg-warning p-2 p-lg-3 rounded">
                            <TicketIcon className="text-white" size={24} />
                          </div>
                          <div className="ms-3">
                            <h3 className="h4 h3-lg fw-bold text-dark mb-0">{dailyStats.vouchersToday}</h3>
                            <small className="text-muted fw-medium">Vouchers Hoje</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12 col-sm-6 col-lg-4">
                    <div className="card border-success bg-success bg-opacity-10">
                      <div className="card-body p-3 p-lg-4">
                        <div className="d-flex align-items-center">
                          <div className="bg-success p-2 p-lg-3 rounded">
                            <DollarSign className="text-white" size={24} />
                          </div>
                          <div className="ms-3">
                            <h3 className="h4 h3-lg fw-bold text-dark mb-0">R$ {dailyStats.revenueToday || '0,00'}</h3>
                            <small className="text-muted fw-medium">Vendas Hoje</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12 col-sm-6 col-lg-4">
                    <div className="card border-info bg-info bg-opacity-10">
                      <div className="card-body p-3 p-lg-4">
                        <div className="d-flex align-items-center">
                          <div className="bg-info p-2 p-lg-3 rounded">
                            <TrendingUp className="text-white" size={24} />
                          </div>
                          <div className="ms-3">
                            <h3 className="h4 h3-lg fw-bold text-dark mb-0">{dailyStats.totalVouchers}</h3>
                            <small className="text-muted fw-medium">Total Vouchers</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Voucher Generation Form */}
              <div className="row">
                <div className="col-12 col-lg-6">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title mb-0 d-flex align-items-center">
                        <TicketIcon className="me-2" size={20} />
                        Criar Novos Vouchers
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <Label htmlFor="plan-select" className="form-label">Plano</Label>
                        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                          <SelectTrigger className="form-select" style={{ height: '48px' }}>
                            <SelectValue placeholder="Selecione um plano" />
                          </SelectTrigger>
                          <SelectContent>
                            {(plans as any[]).map((plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.nome} - R$ {plan.preco} ({plan.duracao}min)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mb-3">
                        <Label htmlFor="quantity" className="form-label">Quantidade</Label>
                        <Input
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

                      <Button
                        onClick={handleGenerateVouchers}
                        disabled={generateVouchersMutation.isPending || !selectedPlan}
                        className="btn btn-primary w-100"
                        style={{ height: '48px' }}
                      >
                        {generateVouchersMutation.isPending ? "Gerando..." : "Gerar Vouchers"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === "sales" && (
            <div className="mb-4">
              <div className="mb-4">
                <h1 className="h2 h1-lg fw-bold text-dark mb-2">Relatórios</h1>
                <p className="text-muted">Visualize estatísticas e relatórios</p>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0 d-flex align-items-center">
                    <BarChart3 className="me-2" size={20} />
                    Acessar Relatórios Detalhados
                  </h5>
                </div>
                <div className="card-body">
                  <p className="text-muted mb-3">
                    Acesse o sistema completo de relatórios para visualizar estatísticas detalhadas.
                  </p>
                  <Button 
                    onClick={() => window.location.href = "/reports"}
                    className="btn btn-primary"
                  >
                    <BarChart3 className="me-2" size={18} />
                    Abrir Relatórios
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="mb-4">
              <div className="mb-4">
                <h1 className="h2 h1-lg fw-bold text-dark mb-2">Histórico</h1>
                <p className="text-muted">Histórico completo de vouchers</p>
              </div>

              <div className="card">
                <div className="card-body">
                  <p className="text-muted text-center py-4">
                    Histórico detalhado será implementado aqui
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Print History Tab */}
          {activeTab === "print-history" && (
            <div className="mb-4">
              <div className="mb-4">
                <h1 className="h2 h1-lg fw-bold text-dark mb-2">Histórico de Impressões</h1>
                <p className="text-muted">Reimpressão de vouchers anteriores</p>
              </div>

              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0 d-flex align-items-center">
                    <Printer className="me-2" size={20} />
                    Vouchers Impressos Recentemente
                  </h5>
                </div>
                <div className="card-body">
                  {printHistory && printHistory.length > 0 ? (
                    <div className="row g-3">
                      {printHistory.map((print: any) => (
                        <div key={print.id} className="col-12">
                          <div className="card border">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                  <h6 className="fw-semibold mb-1">{print.printTitle}</h6>
                                  <small className="text-muted">
                                    {print.voucherCount} vouchers • {new Date(print.createdAt).toLocaleDateString('pt-BR')}
                                  </small>
                                </div>
                                <span className={`badge ${print.printType === 'a4' ? 'bg-primary' : 'bg-secondary'}`}>
                                  {print.printType === 'a4' ? 'A4' : 'Térmico'}
                                </span>
                              </div>
                              
                              <div className="d-flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const printWindow = window.open('', '_blank');
                                    if (printWindow) {
                                      printWindow.document.write(print.htmlContent);
                                      printWindow.document.close();
                                      printWindow.onload = () => {
                                        printWindow.focus();
                                        printWindow.print();
                                      };
                                    }
                                  }}
                                  className="btn btn-primary btn-sm"
                                >
                                  <Printer className="me-1" size={16} />
                                  Reimprimir
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const blob = new Blob([print.htmlContent], { type: 'text/html' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `vouchers-${print.printTitle.replace(/[^a-zA-Z0-9]/g, '-')}.html`;
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                  }}
                                  className="btn btn-outline-secondary btn-sm"
                                >
                                  <Download className="me-1" size={16} />
                                  Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <Printer className="mx-auto text-muted mb-3" size={48} />
                      <p className="text-muted">Nenhuma impressão encontrada</p>
                      <small className="text-muted">
                        Quando você imprimir vouchers, eles aparecerão aqui para reimpressão
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}