import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, BarChart3, PieChart, TrendingUp, DollarSign, ArrowLeft, User } from "lucide-react";
import { Link } from "wouter";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

interface VoucherSummary {
  count: number;
  amount: string;
  duration: number;
  currency: string;
}

interface AllTimeVoucherSummary {
  current?: VoucherSummary;
  unused?: VoucherSummary;
  created?: VoucherSummary;
  // Novos campos diretos da API Omada
  totalCount?: number;
  usedCount?: number;
  unusedCount?: number;
  expiredCount?: number;
  inUseCount?: number;
  totalAmount?: number;
  currency?: string;
  dataSource?: string; // Indicador se são dados reais ou de exemplo
  message?: string; // Mensagem explicativa
}

interface VoucherUsage {
  amount: string;
  currency: string;
  count: number;
  timeInterval: number;
  time: number;
}

interface VoucherHistoryStats {
  summary: VoucherSummary;
  usage: VoucherUsage[];
}

interface VoucherDurationDistribution {
  duration: number;
  durationType: number;
  totalDuration: number;
  usedCount: number;
}

interface VoucherPriceDistribution {
  unitPrice: string;
  totalAmount: string;
  usedCount: number;
  currency: string;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date())
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Get user sites
  const { data: userSites = [] } = useQuery<any[]>({
    queryKey: ["/api/users", user?.id, "sites"],
    enabled: !!user?.id,
  });

  // Get selected site data
  const { data: selectedSite } = useQuery<any>({
    queryKey: ["/api/sites", selectedSiteId],
    enabled: !!selectedSiteId,
  });

  // Set default site on load
  useEffect(() => {
    if (userSites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(userSites[0].id);
    }
  }, [userSites, selectedSiteId]);

  // Get voucher summary (all time)
  const { data: voucherSummary, isLoading: summaryLoading, error: summaryError } = useQuery<AllTimeVoucherSummary>({
    queryKey: ["/api/reports/voucher-summary", selectedSiteId],
    enabled: !!selectedSiteId,
  });

  // Log for debugging mobile issues
  useEffect(() => {
    if (voucherSummary) {
      console.log('📊 Voucher Summary Data:', voucherSummary);
    }
    if (summaryError) {
      console.error('❌ Summary Error:', summaryError);
    }
  }, [voucherSummary, summaryError]);

  // Get voucher history statistics
  const { data: voucherHistory, isLoading: historyLoading } = useQuery<VoucherHistoryStats>({
    queryKey: ["/api/reports/voucher-history", selectedSiteId, dateRange.from.getTime(), dateRange.to.getTime()],
    enabled: !!selectedSiteId,
  });

  // Get voucher price distribution with date range
  const { data: priceDistribution, isLoading: priceLoading } = useQuery<{ data: VoucherPriceDistribution[] }>({
    queryKey: ["/api/reports/voucher-price-distribution", selectedSiteId, Math.floor(dateRange.from.getTime() / 1000), Math.floor(dateRange.to.getTime() / 1000)],
    enabled: !!selectedSiteId,
  });

  // Get voucher duration distribution with date range
  const { data: durationDistributionWithDates, isLoading: durationLoading } = useQuery<{ data: VoucherDurationDistribution[] }>({
    queryKey: ["/api/reports/voucher-duration-distribution", selectedSiteId, Math.floor(dateRange.from.getTime() / 1000), Math.floor(dateRange.to.getTime() / 1000)],
    enabled: !!selectedSiteId,
  });

  // Get voucher distribution by duration
  const { data: durationDistribution, isLoading: distributionLoading } = useQuery<VoucherDurationDistribution[]>({
    queryKey: ["/api/reports/voucher-distribution", selectedSiteId, dateRange.from.getTime(), dateRange.to.getTime()],
    enabled: !!selectedSiteId,
  });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  const formatCurrency = (amount: string, currency: string) => {
    if (!amount || amount === "0") return "Grátis";
    return `${currency} ${amount}`;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:gap-4">
          <Link href={user?.role === "admin" ? "/admin" : "/vendedor"}>
            <Button variant="outline" size="sm" className="gap-2 mobile-full">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-3xl font-bold">Relatórios</h1>
            <p className="text-sm md:text-base text-muted-foreground">Análise de vendas e uso de vouchers</p>
          </div>
        </div>
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            {user?.username} ({user?.role})
          </div>
          <Button variant="outline" className="gap-2 mobile-full">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Site Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 form-grid">
            <div className="space-y-2">
              <label className="text-sm font-medium">Site</label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um site" />
                </SelectTrigger>
                <SelectContent>
                  {userSites.map((site: any) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Data inicial</label>
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: startOfDay(date) }))}
                          locale={ptBR}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Data final</label>
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: endOfDay(date) }))}
                          locale={ptBR}
                        />
                      </div>
                    </div>
                    <Button onClick={() => setIsCalendarOpen(false)} className="w-full">
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Source Indicator */}
      {voucherSummary?.dataSource === "SAMPLE" && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-800">
              <div className="h-2 w-2 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium">Dados de Exemplo</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              {voucherSummary.message || "Configure credenciais válidas do Omada para ver dados reais"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reports Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 tabs-list">
          <TabsTrigger value="summary" className="gap-1 text-xs md:text-sm px-2 md:px-4">
            <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Resumo</span>
            <span className="sm:hidden">Resumo</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1 text-xs md:text-sm px-2 md:px-4">
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Histórico</span>
            <span className="sm:hidden">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-1 text-xs md:text-sm px-2 md:px-4">
            <PieChart className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Distribuição</span>
            <span className="sm:hidden">Distrib.</span>
          </TabsTrigger>
          <TabsTrigger value="price" className="gap-1 text-xs md:text-sm px-2 md:px-4">
            <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Por Preço</span>
            <span className="sm:hidden">Preço</span>
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vouchers Ativos</CardTitle>
                <Badge variant="outline" className="bg-green-50 text-green-700">Ativo</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                  ) : (
                    voucherSummary?.inUseCount || voucherSummary?.current?.count || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summaryLoading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                  ) : (
                    `Total: ${voucherSummary?.totalCount || 0}`
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summaryLoading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                  ) : (
                    formatCurrency(String(voucherSummary?.totalAmount || 0), voucherSummary?.currency || "BRL")
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vouchers Não Utilizados</CardTitle>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">Disponível</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                  ) : (
                    voucherSummary?.unusedCount || voucherSummary?.unused?.count || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summaryLoading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                  ) : (
                    `Usados: ${voucherSummary?.usedCount || 0}`
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summaryLoading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                  ) : (
                    `Expirados: ${voucherSummary?.expiredCount || 0}`
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Criados</CardTitle>
                <Badge variant="outline" className="bg-gray-50 text-gray-700">Histórico</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                  ) : (
                    voucherSummary?.totalCount || voucherSummary?.created?.count || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summaryLoading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                  ) : (
                    `Em uso: ${voucherSummary?.inUseCount || 0}`
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summaryLoading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                  ) : (
                    formatCurrency(String(voucherSummary?.totalAmount || 0), voucherSummary?.currency || "BRL")
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {selectedSite && (
            <Card>
              <CardHeader>
                <CardTitle>Informações do Site</CardTitle>
                <CardDescription>Detalhes da localização selecionada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium">Nome</p>
                    <p className="text-sm text-muted-foreground">{selectedSite.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Localização</p>
                    <p className="text-sm text-muted-foreground">{selectedSite.location}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant={selectedSite.status === 'active' ? 'default' : 'secondary'}>
                      {selectedSite.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Última Sincronização</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSite.lastSync ? format(new Date(selectedSite.lastSync), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Nunca"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas do Período</CardTitle>
              <CardDescription>
                {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8">Carregando estatísticas...</div>
              ) : voucherHistory ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{voucherHistory.summary.count}</div>
                      <div className="text-sm text-muted-foreground">Vouchers Utilizados</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{formatDuration(voucherHistory.summary.duration)}</div>
                      <div className="text-sm text-muted-foreground">Duração Total</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {formatCurrency(voucherHistory.summary.amount, voucherHistory.summary.currency)}
                      </div>
                      <div className="text-sm text-muted-foreground">Valor Total</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{voucherHistory.usage.length}</div>
                      <div className="text-sm text-muted-foreground">Pontos de Dados</div>
                    </div>
                  </div>

                  {voucherHistory.usage.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-lg font-medium mb-4">Uso ao Longo do Tempo</h4>
                      <div className="space-y-2">
                        {voucherHistory.usage.slice(0, 10).map((usage, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <div className="font-medium">
                                {format(new Date(usage.time), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Intervalo: {usage.timeInterval} minutos
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{usage.count} vouchers</div>
                              <div className="text-sm text-muted-foreground">
                                {formatCurrency(usage.amount, usage.currency)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado encontrado para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Duração</CardTitle>
              <CardDescription>
                Análise de vouchers por tempo de uso no período de {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} até {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {durationLoading ? (
                <div className="text-center py-8">Carregando distribuição por duração...</div>
              ) : durationDistributionWithDates?.data && durationDistributionWithDates.data.length > 0 ? (
                <div className="space-y-4">
                  {durationDistributionWithDates.data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium text-lg">
                          {formatDuration(item.duration)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Tipo: {item.durationType === 0 ? "Por cliente (cada cliente expira após a duração)" : "Por voucher (cliente expira quando voucher expira)"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{item.usedCount} utilizados</div>
                        <div className="text-sm text-muted-foreground">
                          Duração total: {formatDuration(item.totalDuration)}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {item.usedCount > 0 ? 
                            `${((item.usedCount / Math.max(item.totalDuration / item.duration, 1)) * 100).toFixed(1)}% aproveitamento` : 
                            'Não utilizado'
                          }
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {/* Summary Card */}
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Resumo do Período</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tipos de duração:</span>
                        <span className="ml-2 font-medium">{durationDistributionWithDates.data.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total utilizado:</span>
                        <span className="ml-2 font-medium">
                          {durationDistributionWithDates.data.reduce((sum, item) => sum + item.usedCount, 0)} vouchers
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mb-4">
                    <PieChart className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  </div>
                  <p>Nenhum dado de distribuição por duração encontrado para o período selecionado</p>
                  <p className="text-sm mt-2">
                    Tente selecionar um período diferente ou verifique se há vouchers utilizados no site
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Distribution Tab */}
        <TabsContent value="price" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Preço</CardTitle>
              <CardDescription>
                Análise de vouchers por valor no período de {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} até {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {priceLoading ? (
                <div className="text-center py-8">Carregando distribuição por preço...</div>
              ) : priceDistribution?.data && priceDistribution.data.length > 0 ? (
                <div className="space-y-4">
                  {priceDistribution.data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium text-lg">
                          {item.currency} {parseFloat(item.unitPrice).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Preço unitário do voucher
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {item.usedCount} utilizados
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total: {item.currency} {parseFloat(item.totalAmount).toFixed(2)}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {item.usedCount > 0 ? 
                            `${((item.usedCount / parseInt(item.totalAmount)) * 100).toFixed(1)}% usados` : 
                            'Nenhum usado'
                          }
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {/* Summary Card */}
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Resumo do Período</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total de tipos de preço:</span>
                        <span className="ml-2 font-medium">{priceDistribution.data.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total utilizado:</span>
                        <span className="ml-2 font-medium">
                          {priceDistribution.data.reduce((sum, item) => sum + item.usedCount, 0)} vouchers
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mb-4">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  </div>
                  <p>Nenhum dado de distribuição por preço encontrado para o período selecionado</p>
                  <p className="text-sm mt-2">
                    Tente selecionar um período diferente ou verifique se há vouchers criados no site
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}