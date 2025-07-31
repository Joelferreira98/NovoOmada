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
import { User, TicketIcon, TrendingUp, History, DollarSign, Calendar, Printer, Copy, Download, Calculator, BarChart3, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VendedorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [lastGeneratedVouchers, setLastGeneratedVouchers] = useState<any[]>([]);
  const [showPrintHistory, setShowPrintHistory] = useState(false);

  if (!user || user.role !== "vendedor") {
    return <Redirect to="/auth" />;
  }

  const { data: userSites = [] } = useQuery({
    queryKey: ["/api/sites"],
  });

  const userSite = (userSites as any[])[0]; // Vendedor só tem acesso a um site

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
      const res = await apiRequest("POST", "/api/vouchers/generate", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate vouchers");
      }
      return await res.json();
    },
    onSuccess: (vouchers) => {
      setLastGeneratedVouchers(vouchers); // Armazenar vouchers para impressão
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers", userSite?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily", userSite?.id] });
      
      toast({
        title: "Vouchers gerados com sucesso!",
        description: `${vouchers.length} vouchers criados. Clique em "Imprimir" para imprimir os códigos.`,
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

  const deleteVoucherMutation = useMutation({
    mutationFn: async (voucherId: string) => {
      const res = await apiRequest("DELETE", `/api/vouchers/${voucherId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete voucher");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers", userSite?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily", userSite?.id] });
      toast({
        title: "Voucher deletado!",
        description: `Voucher ${data.voucherCode} foi removido com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar voucher",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const selectedPlanData = (plans as any[]).find((plan: any) => plan.id === selectedPlan);
  const totalPrice = selectedPlanData ? (selectedPlanData.unitPrice * quantity).toFixed(2) : "0.00";

  const selectedSite = userSite?.id;

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

  const printVouchers = (vouchersToPrint: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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
            grid-template-columns: repeat(6, 1fr);
            gap: 3mm;
            flex: 1;
            align-content: start;
          }
          
          /* Thermal roll 58mm/80mm printer support */
          @media print and (max-width: 90mm) {
            .page { 
              width: auto;
              height: auto;
              padding: 2mm;
              max-width: 80mm;
            }
            .voucher-grid {
              grid-template-columns: 1fr;
              gap: 3mm;
            }
            .voucher {
              min-height: auto;
              padding: 8px;
              margin-bottom: 3mm;
              page-break-after: always;
            }
            .voucher-site {
              font-size: 10px;
              margin-bottom: 6px;
            }
            .voucher-code {
              font-size: 18px;
              padding: 8px;
              margin: 8px 0;
              letter-spacing: 3px;
            }
            .voucher-info {
              font-size: 10px;
              margin: 3px 0;
              justify-content: space-between;
            }
            .voucher-footer {
              font-size: 8px;
              margin-top: 6px;
            }
          }

          /* Landscape orientation optimization for A4 */
          @media print and (orientation: landscape) and (min-width: 200mm) {
            .page { 
              width: 297mm; 
              height: 210mm;
              padding: 3mm;
            }
            .voucher-grid {
              grid-template-columns: repeat(10, 1fr);
              gap: 2mm;
            }
            .voucher {
              min-height: 65px;
              padding: 6px;
            }
            .voucher-code {
              font-size: 12px;
              padding: 5px 3px;
            }
            .voucher-site {
              font-size: 7px;
            }
            .voucher-info {
              font-size: 7px;
            }
            .voucher-footer {
              font-size: 5px;
            }
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
            text-align: center;
            font-size: 8px;
            font-weight: bold;
            color: #666;
            margin-bottom: 4px;
            text-transform: uppercase;
            border-bottom: 1px solid #ddd;
            padding-bottom: 3px;
          }
          .voucher-code {
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 1px;
            background: #000;
            color: white;
            padding: 6px 4px;
            text-align: center;
            margin: 4px 0;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
          .voucher-info {
            font-size: 8px;
            margin: 2px 0;
            color: #333;
            display: flex;
            justify-content: space-between;
          }
          .voucher-info strong {
            color: #000;
          }
          .voucher-footer {
            text-align: center;
            font-size: 6px;
            color: #888;
            margin-top: 3px;
            border-top: 1px solid #eee;
            padding-top: 2px;
          }
          
          /* Responsive grid for different quantities - A4 optimized */
          @media print {
            .page { margin: 0; padding: 3mm; }
            .voucher { 
              page-break-inside: avoid;
              min-height: 70px;
            }
            /* Adjust grid based on quantity for maximum A4 usage */
            .voucher-grid.tiny { grid-template-columns: repeat(4, 1fr); gap: 6mm; }
            .voucher-grid.small { grid-template-columns: repeat(5, 1fr); gap: 4mm; }
            .voucher-grid.medium { grid-template-columns: repeat(6, 1fr); gap: 3mm; }
            .voucher-grid.large { grid-template-columns: repeat(7, 1fr); gap: 2mm; }
            .voucher-grid.xlarge { grid-template-columns: repeat(8, 1fr); gap: 2mm; }
          }
          
          /* Dynamic sizing based on quantity - A4 space optimization */
          ${vouchersToPrint.length <= 8 ? '.voucher-grid { grid-template-columns: repeat(4, 1fr); gap: 6mm; } .voucher { min-height: 100px; padding: 12px; } .voucher-code { font-size: 16px; padding: 8px; }' : ''}
          ${vouchersToPrint.length > 8 && vouchersToPrint.length <= 15 ? '.voucher-grid { grid-template-columns: repeat(5, 1fr); gap: 4mm; } .voucher { min-height: 90px; padding: 10px; } .voucher-code { font-size: 15px; padding: 7px; }' : ''}
          ${vouchersToPrint.length > 15 && vouchersToPrint.length <= 30 ? '.voucher-grid { grid-template-columns: repeat(6, 1fr); gap: 3mm; } .voucher { min-height: 80px; padding: 8px; } .voucher-code { font-size: 14px; padding: 6px; }' : ''}
          ${vouchersToPrint.length > 30 && vouchersToPrint.length <= 56 ? '.voucher-grid { grid-template-columns: repeat(7, 1fr); gap: 2mm; } .voucher { min-height: 70px; padding: 6px; } .voucher-code { font-size: 12px; padding: 5px; }' : ''}
          ${vouchersToPrint.length > 56 && vouchersToPrint.length <= 80 ? '.voucher-grid { grid-template-columns: repeat(8, 1fr); gap: 2mm; } .voucher { min-height: 65px; padding: 5px; } .voucher-code { font-size: 11px; padding: 4px; }' : ''}
          ${vouchersToPrint.length > 80 ? '.voucher-grid { grid-template-columns: repeat(9, 1fr); gap: 1mm; } .voucher { min-height: 60px; padding: 4px; } .voucher-code { font-size: 10px; padding: 3px; }' : ''}
          
          /* Landscape-specific optimizations */
          @media print and (orientation: landscape) {
            ${vouchersToPrint.length <= 20 ? '.voucher-grid { grid-template-columns: repeat(8, 1fr); gap: 3mm; } .voucher { min-height: 80px; padding: 8px; }' : ''}
            ${vouchersToPrint.length > 20 && vouchersToPrint.length <= 40 ? '.voucher-grid { grid-template-columns: repeat(10, 1fr); gap: 2mm; } .voucher { min-height: 70px; padding: 6px; }' : ''}
            ${vouchersToPrint.length > 40 && vouchersToPrint.length <= 80 ? '.voucher-grid { grid-template-columns: repeat(12, 1fr); gap: 1.5mm; } .voucher { min-height: 60px; padding: 5px; }' : ''}
            ${vouchersToPrint.length > 80 ? '.voucher-grid { grid-template-columns: repeat(14, 1fr); gap: 1mm; } .voucher { min-height: 55px; padding: 4px; }' : ''}
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="voucher-grid ${vouchersToPrint.length <= 8 ? 'tiny' : vouchersToPrint.length <= 15 ? 'small' : vouchersToPrint.length <= 30 ? 'medium' : vouchersToPrint.length <= 56 ? 'large' : vouchersToPrint.length <= 80 ? 'xlarge' : 'xxlarge'}">
            ${vouchersToPrint.map((voucher, index) => `
              <div class="voucher">
                <div class="voucher-site">${siteName}</div>
                
                <div class="voucher-code">${voucher.code}</div>
                
                <div class="voucher-info">
                  <span><strong>Plano:</strong></span>
                  <span>${voucher.planName}</span>
                </div>
                <div class="voucher-info">
                  <span><strong>Tempo:</strong></span>
                  <span>${voucher.duration}min</span>
                </div>
                <div class="voucher-info">
                  <span><strong>Valor:</strong></span>
                  <span>R$ ${voucher.unitPrice}</span>
                </div>
                
                <div class="voucher-footer">
                  #${String(index + 1).padStart(2, '0')} • ${currentDate}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Auto print after loading and save to history
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      
      // Save A4 print history
      const printTitle = `${siteName} - ${planName} (${vouchersToPrint.length} vouchers) - ${currentDate}`;
      const voucherCodes = vouchersToPrint.map(v => v.code);
      
      savePrintHistoryMutation.mutate({
        printType: 'a4',
        voucherCodes,
        printTitle,
        htmlContent: printContent
      });
    };
  };

  const printVouchersRoll = (vouchersToPrint: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const siteName = userSite?.name || 'WiFi';
    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vouchers Cupom - ${siteName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            background: white;
            color: black;
            line-height: 1.3;
            width: 80mm;
            font-size: 12px;
          }
          .voucher {
            width: 76mm;
            padding: 4mm;
            margin: 0 auto 4mm auto;
            border: 1px dashed #000;
            page-break-after: always;
            text-align: center;
          }
          .voucher:last-child {
            page-break-after: avoid;
          }
          .voucher-site {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 6px;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
          }
          .voucher-title {
            font-size: 16px;
            font-weight: bold;
            margin: 6px 0;
          }
          .voucher-code {
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 4px;
            background: #000;
            color: white;
            padding: 8px 4px;
            margin: 8px 0;
            border-radius: 4px;
            word-break: break-all;
          }
          .voucher-info {
            font-size: 11px;
            margin: 4px 0;
            text-align: left;
            display: flex;
            justify-content: space-between;
          }
          .voucher-instructions {
            font-size: 9px;
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px dashed #000;
            text-align: center;
            line-height: 1.4;
          }
          .voucher-footer {
            font-size: 8px;
            margin-top: 8px;
            padding-top: 4px;
            border-top: 1px solid #000;
            color: #666;
          }
          
          @media print {
            body { width: 80mm; margin: 0; }
            .voucher { 
              page-break-after: always;
              margin-bottom: 0;
            }
          }
          
          @page {
            size: 80mm auto;
            margin: 0;
          }
        </style>
      </head>
      <body>
        ${vouchersToPrint.map((voucher, index) => `
          <div class="voucher">
            <div class="voucher-site">${siteName}</div>
            <div class="voucher-title">VOUCHER WiFi</div>
            
            <div class="voucher-code">${voucher.code}</div>
            
            <div class="voucher-info">
              <span><strong>Plano:</strong></span>
              <span>${voucher.planName}</span>
            </div>
            <div class="voucher-info">
              <span><strong>Tempo:</strong></span>
              <span>${voucher.duration} min</span>
            </div>
            <div class="voucher-info">
              <span><strong>Valor:</strong></span>
              <span>R$ ${voucher.unitPrice}</span>
            </div>
            
            <div class="voucher-instructions">
              1. Conecte-se à rede "${siteName}"<br>
              2. Abra o navegador<br>
              3. Digite o código acima<br>
              4. Aproveite sua internet!
            </div>
            
            <div class="voucher-footer">
              #${String(index + 1).padStart(3, '0')} | ${currentDate}<br>
              Sistema Omada WiFi
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Auto print after loading and save to history
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      
      // Save thermal print history
      const printTitle = `CUPOM ${siteName} (${vouchersToPrint.length} vouchers) - ${currentDate}`;
      const voucherCodes = vouchersToPrint.map(v => v.code);
      
      savePrintHistoryMutation.mutate({
        printType: 'thermal',
        voucherCodes,
        printTitle,
        htmlContent: printContent
      });
    };
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
      active: activeTab === "reports",
      onClick: () => window.location.href = "/reports"
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

      <div className="flex-fill p-3 p-lg-4 overflow-auto" style={{ marginLeft: '0' }}>
        <div className="container-fluid">
        {activeTab === "generate" && (
          <div className="space-y-4 md:space-y-8">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-slate-800">Geração de Vouchers</h1>
              <p className="text-sm md:text-base text-slate-600 mt-2">Crie vouchers de acesso à internet</p>
            </div>

            {/* Daily Stats */}
            {dailyStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center">
                      <div className="bg-amber-500 p-2 md:p-3 rounded-lg">
                        <TicketIcon className="text-white w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="ml-3 md:ml-4">
                        <p className="text-lg md:text-2xl font-bold text-slate-800">{dailyStats.vouchersToday}</p>
                        <p className="text-xs md:text-sm text-slate-600 font-medium">Vouchers Hoje</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center">
                      <div className="bg-green-500 p-2 md:p-3 rounded-lg">
                        <DollarSign className="text-white w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="ml-3 md:ml-4">
                        <p className="text-lg md:text-2xl font-bold text-slate-800">R$ {dailyStats.revenueToday || '0,00'}</p>
                        <p className="text-xs md:text-sm text-slate-600 font-medium">Vendas Hoje</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center">
                      <div className="bg-blue-500 p-2 md:p-3 rounded-lg">
                        <Calendar className="text-white w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="ml-3 md:ml-4">
                        <p className="text-lg md:text-2xl font-bold text-slate-800">R$ {dailyStats.averageDaily || '0,00'}</p>
                        <p className="text-xs md:text-sm text-slate-600 font-medium">Média Diária</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Voucher Generation - Mobile Optimized */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Gerar Novos Vouchers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="plan" className="text-sm md:text-base font-medium">Selecionar Plano</Label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger className="h-12 md:h-10">
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-sm md:text-base font-medium">Quantidade de Vouchers</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max="100"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="h-12 md:h-10 text-lg md:text-base"
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
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={onGenerateVouchers}
                      disabled={generateVouchersMutation.isPending || !selectedPlan}
                      className="bg-amber-500 hover:bg-amber-600 h-12 md:h-10 text-base md:text-sm font-medium flex-1 sm:flex-none"
                    >
                      <TicketIcon className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                      {generateVouchersMutation.isPending ? "Gerando..." : "Gerar Vouchers"}
                    </Button>
                    
                    {lastGeneratedVouchers.length > 0 && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => {
                            printVouchers(lastGeneratedVouchers);
                            setLastGeneratedVouchers([]);
                          }}
                          variant="outline"
                          className="flex items-center gap-2 h-12 md:h-10 flex-1 sm:flex-none"
                        >
                          <Printer className="w-5 h-5 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">A4</span>
                          <span className="sm:hidden">Imprimir A4</span>
                          <span className="text-xs">({lastGeneratedVouchers.length})</span>
                        </Button>
                        <Button 
                          onClick={() => {
                            printVouchersRoll(lastGeneratedVouchers);
                            setLastGeneratedVouchers([]);
                          }}
                          variant="outline"
                          className="flex items-center gap-2 h-12 md:h-10 flex-1 sm:flex-none"
                        >
                          <Printer className="w-5 h-5 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">Cupom</span>
                          <span className="sm:hidden">Cupom Térmico</span>
                          <span className="text-xs">({lastGeneratedVouchers.length})</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Vouchers - Mobile Optimized */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <CardTitle className="text-lg md:text-xl">Vouchers Recentes</CardTitle>
                  <Button variant="outline" className="h-10 text-sm self-end sm:self-auto">
                    <Download className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Exportar Lista</span>
                    <span className="sm:hidden">Exportar</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(vouchers as any[]).length === 0 ? (
                  <p className="text-slate-600 text-center py-8">
                    Nenhum voucher gerado ainda
                  </p>
                ) : (
                  <>
                    {/* Mobile Cards View */}
                    <div className="md:hidden space-y-3">
                      {(vouchers as any[]).slice(0, 10).map((voucher: any) => (
                        <Card key={voucher.id} className="border border-slate-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-mono font-bold text-lg">{voucher.code}</div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                voucher.status === 'used' ? 'bg-red-100 text-red-700' : 
                                voucher.status === 'available' ? 'bg-green-100 text-green-700' : 
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {voucher.status === 'used' ? 'Usado' : 
                                 voucher.status === 'available' ? 'Disponível' : voucher.status}
                              </span>
                            </div>
                            <div className="text-sm text-slate-600 space-y-1">
                              <div><strong>Plano:</strong> {voucher.planName}</div>
                              <div><strong>Data:</strong> {new Date(voucher.createdAt).toLocaleDateString('pt-BR')} às {new Date(voucher.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</div>
                              <div><strong>Preço:</strong> R$ {voucher.unitPrice}</div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => navigator.clipboard.writeText(voucher.code)}
                              >
                                Copiar
                              </Button>
                              {voucher.status === 'available' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1 text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    if (confirm('Deseja realmente excluir este voucher?')) {
                                      deleteVoucherMutation.mutate(voucher.id);
                                    }
                                  }}
                                >
                                  Excluir
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
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
                                  <p className="font-medium text-slate-800">{voucher.planName}</p>
                                  <p className="text-slate-600">R$ {voucher.unitPrice}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-600 text-sm">
                                {new Date(voucher.createdAt).toLocaleDateString('pt-BR')} às {new Date(voucher.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  voucher.status === 'used' ? 'bg-red-100 text-red-700' : 
                                  voucher.status === 'available' ? 'bg-green-100 text-green-700' : 
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {voucher.status === 'used' ? 'Usado' : 
                                   voucher.status === 'available' ? 'Disponível' : voucher.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-blue-600"
                                    onClick={() => navigator.clipboard.writeText(voucher.code)}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  {voucher.status === "available" && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        if (confirm('Deseja realmente excluir este voucher?')) {
                                          deleteVoucherMutation.mutate(voucher.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "sales" && (
          <div className="space-y-4 md:space-y-8">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-slate-800">Relatórios</h1>
              <p className="text-sm md:text-base text-slate-600 mt-2">Visualize estatísticas e relatórios de vouchers</p>
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
          <div className="space-y-4 md:space-y-8">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-slate-800">Histórico</h1>
              <p className="text-sm md:text-base text-slate-600 mt-2">Histórico completo de vouchers</p>
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

        {activeTab === "print-history" && (
          <div className="space-y-4 md:space-y-8">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-slate-800">Histórico de Impressões</h1>
              <p className="text-sm md:text-base text-slate-600 mt-2">Reimpressão de vouchers anteriores</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Printer className="h-5 w-5 mr-2" />
                  Vouchers Impressos Recentemente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {printHistory && printHistory.length > 0 ? (
                  <div className="space-y-4">
                    {printHistory.map((print: any) => (
                      <div key={print.id} className="border rounded-lg p-4 hover:bg-slate-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-800">{print.printTitle}</h3>
                            <p className="text-sm text-slate-600">
                              {print.voucherCount} vouchers • {new Date(print.createdAt).toLocaleDateString('pt-BR')} às {new Date(print.createdAt).toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                          <Badge variant={print.printType === 'a4' ? 'default' : 'secondary'}>
                            {print.printType === 'a4' ? 'A4' : 'Térmico'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                          <Copy className="h-4 w-4" />
                          <span>Códigos: {print.voucherCodes.join(', ').substring(0, 50)}...</span>
                        </div>
                        
                        <div className="flex gap-2">
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
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Printer className="h-4 w-4 mr-1" />
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
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este registro de impressão? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    try {
                                      const res = await apiRequest("DELETE", `/api/print-history/${print.id}`);
                                      if (res.ok) {
                                        queryClient.invalidateQueries({ queryKey: ["/api/print-history", userSite?.id] });
                                        toast({
                                          title: "Registro excluído",
                                          description: "O histórico de impressão foi removido com sucesso."
                                        });
                                      }
                                    } catch (error) {
                                      toast({
                                        title: "Erro",
                                        description: "Falha ao excluir o registro de impressão.",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Printer className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-600">Nenhuma impressão encontrada</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Quando você imprimir vouchers, eles aparecerão aqui para reimpressão
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
