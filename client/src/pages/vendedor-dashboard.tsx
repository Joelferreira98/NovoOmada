import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar } from "@/components/layout/sidebar";
import { User, TicketIcon, TrendingUp, History, DollarSign, Calendar, Printer, Copy, Download, Calculator, BarChart3, Trash2, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VendedorDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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

  // Debug: log plans data when it changes
  console.log('Plans data in vendedor dashboard:', plans);
  console.log('User site:', userSite);

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
      const vouchers = data.vouchers || data || [];
      console.log('Generated vouchers response:', data);
      console.log('Processed vouchers for printing:', vouchers);
      console.log('Setting lastGeneratedVouchers to:', vouchers);
      setLastGeneratedVouchers(vouchers);
      
      // Force re-render after setting vouchers
      setTimeout(() => {
        console.log('Current lastGeneratedVouchers after timeout:', vouchers);
      }, 100);
      
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers", userSite?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily", userSite?.id] });
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

  // Save print history mutation
  const savePrintHistoryMutation = useMutation({
    mutationFn: async (data: { printType: string; voucherCodes: string[]; printTitle: string; htmlContent: string }) => {
      const res = await apiRequest("POST", "/api/print-history", data);
      if (!res.ok) throw new Error("Failed to save print history");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/print-history", userSite?.id] });
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
    console.log('Print function called with vouchers:', vouchersToPrint);
    console.log('🔍 First voucher structure:', vouchersToPrint[0]);
    
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
        description: "Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.",
        variant: "destructive",
      });
      return;
    }

    const siteName = userSite?.name || 'WiFi';
    const planName = vouchersToPrint[0]?.planName || 'Internet';
    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vouchers WiFi - ${siteName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Arial', sans-serif; 
            background: white;
            color: black;
            line-height: 1.2;
          }
          .page { 
            width: 210mm; 
            height: 297mm;
            margin: 0 auto; 
            padding: 4mm;
            display: flex;
            flex-direction: column;
          }
          .voucher-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 3mm;
            flex: 1;
            align-content: start;
          }
          
          @media screen and (max-width: 768px) {
            .voucher-grid { grid-template-columns: repeat(2, 1fr); }
            .page { width: 100%; padding: 2mm; }
          }
          
          @media screen and (min-width: 769px) and (max-width: 1024px) {
            .voucher-grid { grid-template-columns: repeat(4, 1fr); }
          }
          
          .voucher {
            border: 1.5px solid #000;
            padding: 8px;
            border-radius: 6px;
            background: #fff;
            page-break-inside: avoid;
            height: fit-content;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .voucher-site {
            font-size: 8px;
            font-weight: bold;
            text-align: center;
            color: #333;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          .voucher-code {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            background: #f0f0f0;
            padding: 6px 4px;
            border-radius: 4px;
            letter-spacing: 2px;
            margin: 4px 0;
            border: 1px solid #ddd;
            font-family: 'Courier New', monospace;
          }
          .voucher-info {
            font-size: 7px;
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            color: #666;
          }
          .voucher-footer {
            font-size: 6px;
            text-align: center;
            color: #999;
            margin-top: 4px;
            border-top: 1px solid #eee;
            padding-top: 2px;
          }
          
          /* Dynamic sizing based on quantity */
          ${vouchersToPrint.length <= 8 ? '.voucher-grid { grid-template-columns: repeat(4, 1fr); gap: 6mm; } .voucher { min-height: 100px; padding: 12px; } .voucher-code { font-size: 16px; padding: 8px; }' : ''}
          ${vouchersToPrint.length > 8 && vouchersToPrint.length <= 15 ? '.voucher-grid { grid-template-columns: repeat(5, 1fr); gap: 4mm; } .voucher { min-height: 90px; padding: 10px; } .voucher-code { font-size: 15px; padding: 7px; }' : ''}
          ${vouchersToPrint.length > 15 && vouchersToPrint.length <= 30 ? '.voucher-grid { grid-template-columns: repeat(6, 1fr); gap: 3mm; } .voucher { min-height: 80px; padding: 8px; } .voucher-code { font-size: 14px; padding: 6px; }' : ''}
          ${vouchersToPrint.length > 30 && vouchersToPrint.length <= 56 ? '.voucher-grid { grid-template-columns: repeat(7, 1fr); gap: 2mm; } .voucher { min-height: 70px; padding: 6px; } .voucher-code { font-size: 12px; padding: 5px; }' : ''}
          ${vouchersToPrint.length > 56 && vouchersToPrint.length <= 80 ? '.voucher-grid { grid-template-columns: repeat(8, 1fr); gap: 2mm; } .voucher { min-height: 65px; padding: 5px; } .voucher-code { font-size: 11px; padding: 4px; }' : ''}
          
          @media print {
            body { margin: 0; }
            .page { margin: 0; width: 100%; height: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="voucher-grid">
            ${vouchersToPrint.map(voucher => {
              const code = voucher?.code || voucher?.omadaVoucher?.code || voucher?.voucherCode || 'N/A';
              const price = voucher?.unitPrice || voucher?.omadaVoucher?.unitPrice || '0.00';
              return `
              <div class="voucher">
                <div class="voucher-site">${siteName}</div>
                <div class="voucher-code">${code}</div>
                <div class="voucher-info">
                  <span>Plano: ${planName}</span>
                  <span>R$ ${price}</span>
                </div>
                <div class="voucher-info">
                  <span>Válido: ${voucher?.duracao || '60'}min</span>
                  <span>${currentDate}</span>
                </div>
                <div class="voucher-footer">Conecte-se ao WiFi e digite este código</div>
              </div>
              `;
            }).join('')}
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Save to print history with proper code extraction
    const validCodes = vouchersToPrint
      .map(v => v?.code || v?.omadaVoucher?.code || v?.voucherCode || null)
      .filter(code => code !== null && code !== undefined && code !== '');
      
    console.log('🔍 Extracted voucher codes for A4 history:', validCodes);
    console.log('🔍 Original vouchers structure:', vouchersToPrint.slice(0, 3));
    
    savePrintHistoryMutation.mutate({
      printType: 'a4',
      voucherCodes: validCodes,
      printTitle: `${planName} - ${currentDate} - ${validCodes.length} vouchers`,
      htmlContent: printContent
    });

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1000);
    
    toast({
      title: "Preparando impressão A4",
      description: "A janela de impressão foi aberta com sucesso!",
    });
  };

  const printVouchersRoll = (vouchersToPrint: any[]) => {
    console.log('Print Roll function called with vouchers:', vouchersToPrint);
    
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
        description: "Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.",
        variant: "destructive",
      });
      return;
    }

    const siteName = userSite?.name || 'WiFi';
    const planName = vouchersToPrint[0]?.planName || 'Internet';
    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vouchers Térmicos - ${siteName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Arial', sans-serif; 
            background: white;
            color: black;
            width: 80mm;
            margin: 0;
            padding: 0;
          }
          .voucher {
            width: 100%;
            max-width: 80mm;
            padding: 8mm;
            border-bottom: 2px dashed #333;
            page-break-after: always;
            text-align: center;
            margin: 0 auto;
          }
          
          @media screen and (max-width: 480px) {
            .voucher { 
              width: 100%; 
              max-width: none; 
              padding: 4mm; 
            }
          }
          .voucher:last-child {
            border-bottom: none;
          }
          .voucher-site {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          .voucher-code {
            font-size: 24px;
            font-weight: bold;
            background: #f0f0f0;
            padding: 8px;
            margin: 8px 0;
            border-radius: 4px;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
            border: 2px solid #333;
          }
          .voucher-info {
            font-size: 12px;
            margin: 4px 0;
          }
          .voucher-footer {
            font-size: 10px;
            margin-top: 8px;
            color: #666;
          }
          
          @media print {
            body { margin: 0; width: auto; }
            .voucher { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        ${vouchersToPrint.map(voucher => {
          const code = voucher?.code || voucher?.omadaVoucher?.code || voucher?.voucherCode || 'N/A';
          const price = voucher?.unitPrice || voucher?.omadaVoucher?.unitPrice || '0.00';
          return `
          <div class="voucher">
            <div class="voucher-site">${siteName}</div>
            <div class="voucher-code">${code}</div>
            <div class="voucher-info">Plano: ${planName}</div>
            <div class="voucher-info">Valor: R$ ${price}</div>
            <div class="voucher-info">Válido: ${voucher?.duracao || '60'} minutos</div>
            <div class="voucher-info">Data: ${currentDate}</div>
            <div class="voucher-footer">Conecte-se ao WiFi e digite este código</div>
          </div>
          `;
        }).join('')}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Save to print history with proper code extraction
    const validCodes = vouchersToPrint
      .map(v => v?.code || v?.omadaVoucher?.code || v?.voucherCode || null)
      .filter(code => code !== null && code !== undefined && code !== '');
      
    console.log('🔍 Extracted voucher codes for thermal history:', validCodes);
    console.log('🔍 Original vouchers structure:', vouchersToPrint.slice(0, 3));
    
    savePrintHistoryMutation.mutate({
      printType: 'thermal',
      voucherCodes: validCodes,
      printTitle: `${planName} Térmico - ${currentDate} - ${validCodes.length} vouchers`,
      htmlContent: printContent
    });

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1000);
    
    toast({
      title: "Preparando impressão térmica",
      description: "A janela de impressão foi aberta com sucesso!",
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
      active: false,
      onClick: () => window.location.href = "/reports"
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
          
          {/* Header with Profile Menu */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 fw-bold text-dark mb-0">Dashboard Vendedor</h1>
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
          
          {/* Generate Tab */}
          {activeTab === "generate" && (
            <div className="mb-4">
              <div className="mb-4">
                <h2 className="h3 fw-bold text-dark mb-2">Geração de Vouchers</h2>
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
                        {!plans || plans.length === 0 ? (
                          <div className="alert alert-warning" role="alert">
                            <small>Nenhum plano disponível. Entre em contato com o administrador.</small>
                          </div>
                        ) : (
                          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                            <SelectTrigger className="form-select" style={{ height: '48px' }}>
                              <SelectValue placeholder="Selecione um plano" />
                            </SelectTrigger>
                            <SelectContent>
                              {(plans as any[]).map((plan) => {
                                console.log('Plan data in select:', plan);
                                return (
                                  <SelectItem key={plan.id} value={plan.id}>
                                    {plan.nome || 'Nome não encontrado'} - R$ {parseFloat(plan.unitPrice || "0").toFixed(2)} ({plan.duration || 0}min)
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
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
                
                {/* Print Options - Show when vouchers are generated */}
                {lastGeneratedVouchers && lastGeneratedVouchers.length > 0 && (
                  <div className="col-12 col-lg-6">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title mb-0 d-flex align-items-center">
                          <Printer className="me-2" size={20} />
                          Opções de Impressão
                        </h5>
                      </div>
                      <div className="card-body">
                        <div 
                          className="d-flex flex-column gap-3"
                          style={{ 
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 100
                          }}
                          onMouseEnter={() => console.log('Entered print buttons area')}
                          onMouseLeave={() => console.log('Left print buttons area')}
                        >
                          <div className="text-center mb-3">
                            <p className="text-success fw-semibold mb-1">
                              ✓ {lastGeneratedVouchers.length} vouchers gerados com sucesso!
                            </p>
                            <small className="text-muted">
                              Escolha o formato de impressão abaixo
                            </small>
                          </div>
                          
                          <button 
                            type="button"
                            onClick={() => {
                              console.log('🖨️ A4 print button clicked!');
                              console.log('Current vouchers:', lastGeneratedVouchers);
                              console.log('Vouchers length:', lastGeneratedVouchers?.length);
                              if (lastGeneratedVouchers && lastGeneratedVouchers.length > 0) {
                                printVouchers(lastGeneratedVouchers);
                                setLastGeneratedVouchers([]);
                              } else {
                                console.error('❌ No vouchers available for printing!');
                              }
                            }}
                            onMouseDown={() => console.log('A4 button mouse down')}
                            onMouseUp={() => console.log('A4 button mouse up')}
                            className="btn btn-primary w-100"
                            style={{ 
                              height: '48px', 
                              zIndex: 1000, 
                              position: 'relative',
                              pointerEvents: 'auto'
                            }}
                          >
                            <Printer className="me-2" size={20} />
                            Imprimir A4 ({lastGeneratedVouchers?.length || 0} vouchers)
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => {
                              console.log('🧾 Thermal print button clicked!');
                              console.log('Current vouchers:', lastGeneratedVouchers);
                              console.log('Vouchers length:', lastGeneratedVouchers?.length);
                              if (lastGeneratedVouchers && lastGeneratedVouchers.length > 0) {
                                printVouchersRoll(lastGeneratedVouchers);
                                setLastGeneratedVouchers([]);
                              } else {
                                console.error('❌ No vouchers available for thermal printing!');
                              }
                            }}
                            onMouseDown={() => console.log('Thermal button mouse down')}
                            onMouseUp={() => console.log('Thermal button mouse up')}
                            className="btn btn-secondary w-100"
                            style={{ 
                              height: '48px', 
                              zIndex: 1000, 
                              position: 'relative',
                              pointerEvents: 'auto'
                            }}
                          >
                            <Printer className="me-2" size={20} />
                            Cupom Térmico ({lastGeneratedVouchers?.length || 0} vouchers)
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => {
                              console.log('❌ Cancel button clicked!');
                              setLastGeneratedVouchers([]);
                            }}
                            onMouseDown={() => console.log('Cancel button mouse down')}
                            onMouseUp={() => console.log('Cancel button mouse up')}
                            className="btn btn-danger w-100"
                            style={{ 
                              height: '40px', 
                              zIndex: 1000, 
                              position: 'relative',
                              pointerEvents: 'auto'
                            }}
                          >
                            Cancelar Impressão
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                  {(printHistory as any[]) && (printHistory as any[]).length > 0 ? (
                    <div className="row g-3">
                      {(printHistory as any[]).map((print: any) => (
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
                                {/* Botões de Reimpressão - A4 e Cupom */}
                                <div className="btn-group" role="group" aria-label="Opções de reimpressão">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      console.log('🖨️ A4 Reprint request for:', print.printTitle);
                                      if (print.voucherCodes && print.voucherCodes.length > 0) {
                                        // Convert codes array to vouchers format for printing
                                        const vouchersForPrint = print.voucherCodes.map((code: string) => ({
                                          code: code,
                                          unitPrice: "10.00", // Default price, will be overridden by print data
                                          duracao: 60 // Default duration
                                        }));
                                        printVouchers(vouchersForPrint);
                                      } else {
                                        toast({
                                          title: "Erro",
                                          description: "Códigos de vouchers não encontrados",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="btn btn-primary btn-sm"
                                    title="Reimprimir em formato A4"
                                  >
                                    <Printer className="me-1" size={16} />
                                    A4
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => {
                                      console.log('🧾 Thermal Reprint request for:', print.printTitle);
                                      if (print.voucherCodes && print.voucherCodes.length > 0) {
                                        // Convert codes array to vouchers format for thermal printing
                                        const vouchersForPrint = print.voucherCodes.map((code: string) => ({
                                          code: code,
                                          unitPrice: "10.00", // Default price, will be overridden by print data
                                          duracao: 60 // Default duration
                                        }));
                                        printVouchersRoll(vouchersForPrint);
                                      } else {
                                        toast({
                                          title: "Erro",
                                          description: "Códigos de vouchers não encontrados",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="btn btn-secondary btn-sm"
                                    title="Reimprimir em cupom térmico"
                                  >
                                    <Printer className="me-1" size={16} />
                                    Cupom
                                  </button>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    const dataStr = JSON.stringify(print.voucherCodes, null, 2);
                                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                                    const url = URL.createObjectURL(dataBlob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `vouchers-${print.printTitle.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
                                    link.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="btn btn-outline-info btn-sm"
                                  title="Download dos códigos em JSON"
                                >
                                  <Download className="me-1" size={16} />
                                  JSON
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    const blob = new Blob([print.htmlContent], { type: 'text/html' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `vouchers-${print.printTitle.replace(/[^a-zA-Z0-9]/g, '-')}.html`;
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                  }}
                                  className="btn btn-outline-warning btn-sm"
                                  title="Download do HTML original"
                                >
                                  <Download className="me-1" size={16} />
                                  HTML
                                </button>
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