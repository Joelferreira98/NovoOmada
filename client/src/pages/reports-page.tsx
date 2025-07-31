import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, BarChart3, PieChart, TrendingUp } from "lucide-react";
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
  current: VoucherSummary;
  unused: VoucherSummary;
  created: VoucherSummary;
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
  const { data: voucherSummary, isLoading: summaryLoading } = useQuery<AllTimeVoucherSummary>({
    queryKey: ["/api/reports/voucher-summary", selectedSiteId],
    enabled: !!selectedSiteId,
  });

  // Get voucher history statistics
  const { data: voucherHistory, isLoading: historyLoading } = useQuery<VoucherHistoryStats>({
    queryKey: ["/api/reports/voucher-history", selectedSiteId, dateRange.from.getTime(), dateRange.to.getTime()],
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análise de vendas e uso de vouchers</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Site Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Reports Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumo Geral
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-2">
            <PieChart className="h-4 w-4" />
            Distribuição
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vouchers Ativos</CardTitle>
                <Badge variant="outline" className="bg-green-50 text-green-700">Ativo</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryLoading ? "..." : voucherSummary?.current?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Duração total: {formatDuration(voucherSummary?.current?.duration || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Valor: {formatCurrency(voucherSummary?.current?.amount || "0", voucherSummary?.current?.currency || "BRL")}
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
                  {summaryLoading ? "..." : voucherSummary?.unused?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Duração total: {formatDuration(voucherSummary?.unused?.duration || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Valor: {formatCurrency(voucherSummary?.unused?.amount || "0", voucherSummary?.unused?.currency || "BRL")}
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
                  {summaryLoading ? "..." : voucherSummary?.created?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Duração total: {formatDuration(voucherSummary?.created?.duration || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Valor: {formatCurrency(voucherSummary?.created?.amount || "0", voucherSummary?.created?.currency || "BRL")}
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
              <CardDescription>Análise de vouchers por tempo de uso</CardDescription>
            </CardHeader>
            <CardContent>
              {distributionLoading ? (
                <div className="text-center py-8">Carregando distribuição...</div>
              ) : durationDistribution && durationDistribution.length > 0 ? (
                <div className="space-y-4">
                  {durationDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          Duração: {formatDuration(item.duration)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Tipo: {item.durationType === 0 ? "Por cliente" : "Por voucher"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{item.usedCount} utilizados</div>
                        <div className="text-sm text-muted-foreground">
                          Total: {formatDuration(item.totalDuration)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado de distribuição encontrado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}