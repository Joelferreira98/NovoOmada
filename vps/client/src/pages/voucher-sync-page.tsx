import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, Play, Square, Sync, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SyncStatus {
  isRunning: boolean;
  lastSyncTime: string | null;
  syncIntervalMs: number;
}

export default function VoucherSyncPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Get sync status
  const { data: syncStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/voucher-sync/status"],
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  // Get user sites for manual sync
  const { data: userSites = [] } = useQuery<any[]>({
    queryKey: ["/api/users", user?.id, "sites"],
    enabled: !!user?.id,
  });

  // Start auto sync mutation
  const startSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/voucher-sync/start");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sincronização Iniciada",
        description: "Sincronização automática foi iniciada com sucesso",
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao iniciar sincronização",
        variant: "destructive",
      });
    },
  });

  // Stop auto sync mutation
  const stopSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/voucher-sync/stop");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sincronização Parada",
        description: "Sincronização automática foi parada",
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao parar sincronização",
        variant: "destructive",
      });
    },
  });

  // Manual sync all sites mutation
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/voucher-sync/all");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sincronização Concluída",
        description: "Todos os sites foram sincronizados com sucesso",
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha na sincronização",
        variant: "destructive",
      });
    },
  });

  // Manual sync single site mutation
  const syncSiteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const response = await apiRequest("POST", `/api/voucher-sync/site/${siteId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Site Sincronizado",
        description: "Site foi sincronizado com sucesso",
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha na sincronização do site",
        variant: "destructive",
      });
    },
  });

  const formatSyncInterval = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    return `${minutes} minutos`;
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sincronização de Vouchers</h1>
          <p className="text-muted-foreground">
            Sistema de callback para atualizar status dos vouchers automaticamente
          </p>
        </div>
      </div>

      {/* Status da Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className={`h-5 w-5 ${syncStatus?.isRunning ? 'animate-spin' : ''}`} />
            Status da Sincronização Automática
          </CardTitle>
          <CardDescription>
            Monitor e controle da sincronização automática entre Omada Controller e banco local
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                {syncStatus?.isRunning ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={syncStatus?.isRunning ? "default" : "secondary"}>
                    {syncStatus?.isRunning ? "Ativo" : "Parado"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Intervalo</p>
                  <p className="text-sm text-muted-foreground">
                    {syncStatus?.syncIntervalMs ? formatSyncInterval(syncStatus.syncIntervalMs) : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Sync className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Última Sincronização</p>
                  <p className="text-sm text-muted-foreground">
                    {formatLastSync(syncStatus?.lastSyncTime || null)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!syncStatus?.isRunning ? (
              <Button
                onClick={() => startSyncMutation.mutate()}
                disabled={startSyncMutation.isPending || statusLoading}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Iniciar Sincronização Automática
              </Button>
            ) : (
              <Button
                onClick={() => stopSyncMutation.mutate()}
                disabled={stopSyncMutation.isPending || statusLoading}
                variant="outline"
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Parar Sincronização Automática
              </Button>
            )}

            <Button
              onClick={() => syncAllMutation.mutate()}
              disabled={syncAllMutation.isPending}
              variant="secondary"
              className="gap-2"
            >
              {syncAllMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sincronizar Todos os Sites Agora
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sincronização Manual por Site */}
      <Card>
        <CardHeader>
          <CardTitle>Sincronização Manual por Site</CardTitle>
          <CardDescription>
            Execute sincronização imediata para sites específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userSites.map((site) => (
              <div
                key={site.id}
                className="p-4 border rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{site.name}</p>
                  <p className="text-sm text-muted-foreground">{site.location}</p>
                  <Badge variant={site.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                    {site.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <Button
                  onClick={() => syncSiteMutation.mutate(site.id)}
                  disabled={syncSiteMutation.isPending || site.status !== 'active'}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  {syncSiteMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sync className="h-4 w-4" />
                  )}
                  Sincronizar
                </Button>
              </div>
            ))}
          </div>

          {userSites.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Sync className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum site encontrado para sincronização</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Sincronização Automática</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Executa a cada 1 minuto automaticamente</li>
                <li>• Verifica status de todos os vouchers no Omada</li>
                <li>• Atualiza banco local com mudanças de status</li>
                <li>• Cria registros de venda quando vouchers são usados</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Status dos Vouchers</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>0 (Não usado):</strong> Voucher disponível</li>
                <li>• <strong>1 (Em uso):</strong> Voucher sendo usado - registra venda</li>
                <li>• <strong>2 (Expirado):</strong> Voucher expirou - registra venda</li>
                <li>• Vendas são criadas automaticamente quando status muda</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}