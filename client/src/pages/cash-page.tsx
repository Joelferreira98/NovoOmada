import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  DollarSign, 
  Receipt, 
  Calculator,
  Clock,
  Archive,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";
import { Site } from "@shared/schema";

interface VoucherGroup {
  id: string;
  name: string;
  unitPrice: string;
  currency: string;
  totalCount: number;
  usedCount: number;
  inUseCount: number;
  unusedCount: number;
  expiredCount: number;
  totalAmount: string;
}

interface VoucherGroupDetail {
  id: string;
  name: string;
  unitPrice: string;
  data: Array<{
    id: string;
    code: string;
    status: number; // 0=unused, 1=in-use, 2=expired
  }>;
  usedCount: number;
  inUseCount: number;
}

interface CashClosure {
  id: string;
  totalVouchersUsed: number;
  totalVouchersInUse: number;
  totalAmount: number;
  summary: any[];
  closureDate: string;
}

export default function CashPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get selected site from localStorage
  useEffect(() => {
    const storedSiteId = localStorage.getItem("selectedSiteId");
    if (storedSiteId) {
      setSelectedSiteId(storedSiteId);
    } else if (user?.role === "vendedor") {
      // For vendedores, redirect to dashboard to select site
      setLocation("/vendedor");
    }
  }, [user, setLocation]);

  const { data: userSites } = useQuery<Site[]>({
    queryKey: ["/api/users", user?.id, "sites"],
    enabled: !!user?.id,
  });

  const selectedSite = userSites?.find(site => site.id === selectedSiteId);

  const { data: voucherGroups, isLoading: groupsLoading } = useQuery<{ data: VoucherGroup[] }>({
    queryKey: ["/api/sites", selectedSiteId, "voucher-groups"],
    enabled: !!selectedSiteId,
  });

  const { data: cashClosures, isLoading: closuresLoading } = useQuery<CashClosure[]>({
    queryKey: ["/api/sites", selectedSiteId, "cash-closures"],
    enabled: !!selectedSiteId,
  });

  const cashClosureMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sites/${selectedSiteId}/cash-closure`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Fechamento realizado com sucesso",
        description: `Total: R$ ${data.totalAmount.toFixed(2)} | ${data.totalVouchersUsed + data.totalVouchersInUse} vouchers processados`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", selectedSiteId, "voucher-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", selectedSiteId, "cash-closures"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no fechamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!selectedSite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando caixa...</p>
        </div>
      </div>
    );
  }

  const totalVouchersForClosure = voucherGroups?.data?.reduce((sum, group) => 
    sum + group.usedCount + group.inUseCount, 0) || 0;

  const totalAmountForClosure = voucherGroups?.data?.reduce((sum, group) => 
    sum + (group.usedCount + group.inUseCount) * parseFloat(group.unitPrice || '0'), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Caixa - {selectedSite.name}
                </h1>
                <p className="text-sm text-gray-600">
                  Gerencie vouchers e realize fechamentos de caixa
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => setLocation("/vendedor")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/sites", selectedSiteId, "voucher-groups"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/sites", selectedSiteId, "cash-closures"] });
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="vouchers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="vouchers">Grupos de Vouchers</TabsTrigger>
            <TabsTrigger value="closure">Fechamento</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="vouchers" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{voucherGroups?.data?.length || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vouchers Usados</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {voucherGroups?.data?.reduce((sum, group) => sum + group.usedCount, 0) || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vouchers em Uso</CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {voucherGroups?.data?.reduce((sum, group) => sum + group.inUseCount, 0) || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {totalAmountForClosure.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Voucher Groups Table */}
            <Card>
              <CardHeader>
                <CardTitle>Grupos de Vouchers</CardTitle>
                <CardDescription>
                  Lista de grupos com vouchers usados e em uso (prontos para fechamento)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome do Grupo</TableHead>
                        <TableHead>Preço Unitário</TableHead>
                        <TableHead>Usados</TableHead>
                        <TableHead>Em Uso</TableHead>
                        <TableHead>Não Utilizados</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voucherGroups?.data?.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>R$ {parseFloat(group.unitPrice || '0').toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {group.usedCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                              {group.inUseCount}
                            </Badge>
                          </TableCell>
                          <TableCell>{group.unusedCount}</TableCell>
                          <TableCell>{group.totalCount}</TableCell>
                          <TableCell>
                            R$ {((group.usedCount + group.inUseCount) * parseFloat(group.unitPrice || '0')).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            Nenhum grupo de vouchers encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="closure" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Fechamento de Caixa
                </CardTitle>
                <CardDescription>
                  Processe todos os vouchers usados e em uso, gerando um resumo e removendo-os do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Atenção</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        O fechamento de caixa é uma operação irreversível. Todos os vouchers usados (status 1 e 2) 
                        serão excluídos do controlador Omada após o processamento.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Total de Vouchers a Processar:</p>
                    <p className="text-2xl font-bold">{totalVouchersForClosure}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Valor Total:</p>
                    <p className="text-2xl font-bold text-green-600">R$ {totalAmountForClosure.toFixed(2)}</p>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="lg" 
                      disabled={totalVouchersForClosure === 0 || cashClosureMutation.isPending}
                      className="w-full"
                    >
                      {cashClosureMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Processando Fechamento...
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4 mr-2" />
                          Realizar Fechamento de Caixa
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Fechamento de Caixa</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá processar {totalVouchersForClosure} vouchers no valor total de R$ {totalAmountForClosure.toFixed(2)}.
                        <br /><br />
                        <strong>Esta operação é irreversível!</strong> Os vouchers processados serão excluídos do controlador Omada.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cashClosureMutation.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Confirmar Fechamento
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Fechamentos</CardTitle>
                <CardDescription>
                  Lista de todos os fechamentos de caixa realizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {closuresLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Vouchers Usados</TableHead>
                        <TableHead>Vouchers em Uso</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashClosures?.map((closure) => (
                        <TableRow key={closure.id}>
                          <TableCell>
                            {new Date(closure.closureDate).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {closure.totalVouchersUsed}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                              {closure.totalVouchersInUse}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {closure.totalVouchersUsed + closure.totalVouchersInUse}
                          </TableCell>
                          <TableCell className="font-medium">
                            R$ {closure.totalAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            Nenhum fechamento realizado ainda
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}