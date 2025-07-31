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
  Users, 
  CreditCard, 
  BarChart3, 
  Settings,
  MapPin,
  Wifi,
  ArrowLeft,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Plus,
  Calculator,
  LogOut,
  User,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { Site } from "@shared/schema";
import { VendedorModal } from "@/components/modals/vendedor-modal";
import { PlanModal } from "@/components/modals/plan-modal";

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get selected site from localStorage on component mount
  useEffect(() => {
    const storedSiteId = localStorage.getItem("selectedSiteId");
    console.log("Reading from localStorage:", storedSiteId);
    if (storedSiteId) {
      setSelectedSiteId(storedSiteId);
    }
  }, []);

  const { data: userSites } = useQuery<Site[]>({
    queryKey: ["/api/users", user?.id, "sites"],
    enabled: !!user?.id,
  });

  const { data: selectedSite } = useQuery<Site>({
    queryKey: ["/api/sites", selectedSiteId],
    enabled: !!selectedSiteId,
  });

  // Fetch plans for the selected site
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/sites", selectedSiteId, "plans"],
    enabled: !!selectedSiteId,
  });

  // Delete mutations
  const deleteVendedorMutation = useMutation({
    mutationFn: async (vendedorId: string) => {
      await apiRequest("DELETE", `/api/users/${vendedorId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Vendedor excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", selectedSiteId, "vendedores"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir vendedor",
        variant: "destructive",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      await apiRequest("DELETE", `/api/plans/${planId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Plano excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", selectedSiteId, "plans"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir plano",
        variant: "destructive",
      });
    },
  });

  // Fetch vendedores for the selected site
  const { data: vendedores, isLoading: vendedoresLoading } = useQuery({
    queryKey: ["/api/sites", selectedSiteId, "vendedores"],
    enabled: !!selectedSiteId,
  });

  // Redirect to site selection if no site selected or if user has multiple sites
  useEffect(() => {
    console.log("AdminDashboard routing useEffect:", {
      userRole: user?.role,
      userSitesLength: userSites?.length,
      selectedSiteId,
      userSites
    });
    
    if (user?.role === "admin" && userSites) {
      // Check localStorage again in case it was just updated
      const currentStoredSiteId = localStorage.getItem("selectedSiteId");
      console.log("Current localStorage value:", currentStoredSiteId);
      
      if (currentStoredSiteId && !selectedSiteId) {
        // localStorage has value but state doesn't - update state
        console.log("Updating selectedSiteId from localStorage:", currentStoredSiteId);
        setSelectedSiteId(currentStoredSiteId);
        return; // Don't redirect, let state update first
      }
      
      if (userSites.length === 0) {
        // No sites assigned - show error or redirect
        console.log("No sites assigned, redirecting to auth");
        setLocation("/auth");
      } else if (userSites.length > 1 && !currentStoredSiteId) {
        // Multiple sites but none selected - redirect to selection
        console.log("Multiple sites but no selection, redirecting to site-selection");
        setLocation("/site-selection");
      } else if (userSites.length === 1 && !currentStoredSiteId) {
        // Only one site - auto-select it
        const siteId = userSites[0].id;
        console.log("Auto-selecting single site:", siteId);
        localStorage.setItem("selectedSiteId", siteId);
        setSelectedSiteId(siteId);
      }
    }
  }, [user, userSites, selectedSiteId, setLocation]);

  const handleChangeSite = () => {
    localStorage.removeItem("selectedSiteId");
    setLocation("/site-selection");
  };

  if (!selectedSite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Dashboard - {selectedSite.name}
                </h1>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {selectedSite.location || "Localização não informada"}
                  <Badge 
                    variant={selectedSite.status === "active" ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {selectedSite.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/cash")}
                size="sm"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Caixa
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation("/reports")}
                size="sm"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Relatórios
              </Button>
              {userSites && userSites.length > 1 && (
                <Button variant="outline" onClick={handleChangeSite}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Trocar Site
                </Button>
              )}
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              
              {/* Menu do Usuário */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{user?.username}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Editar Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => logoutMutation.mutate()}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Vendedores Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +0% desde o mês passado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Vouchers Vendidos
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +0% desde o mês passado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Receita Total
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
              <p className="text-xs text-muted-foreground">
                +0% desde o mês passado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Planos Ativos
              </CardTitle>
              <Wifi className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                0 planos configurados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Gerenciar Vendedores
              </CardTitle>
              <CardDescription>
                Criar e gerenciar contas de vendedores para este site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VendedorModal 
                siteId={selectedSite.id} 
                siteName={selectedSite.name}
              />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Gerenciar Planos
              </CardTitle>
              <CardDescription>
                Criar e configurar templates de planos de vouchers WiFi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlanModal 
                siteId={selectedSite.id} 
                siteName={selectedSite.name}
              />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Relatórios
              </CardTitle>
              <CardDescription>
                Visualizar vendas e estatísticas do site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Em Breve
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CRUD Tables */}
        <div className="mt-8">
          <Tabs defaultValue="vendedores" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
              <TabsTrigger value="planos">Planos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="vendedores" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Vendedores - {selectedSite.name}
                      </CardTitle>
                      <CardDescription>
                        Gerencie vendedores que podem criar vouchers neste site
                      </CardDescription>
                    </div>
                    <VendedorModal siteId={selectedSiteId!} siteName={selectedSite.name} />
                  </div>
                </CardHeader>
                <CardContent>
                  {vendedoresLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome de usuário</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Data de criação</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendedores && Array.isArray(vendedores) && vendedores.length > 0 ? (
                          vendedores.map((vendedor: any) => (
                            <TableRow key={vendedor.id}>
                              <TableCell className="font-medium">{vendedor.username}</TableCell>
                              <TableCell>{vendedor.email}</TableCell>
                              <TableCell>
                                {new Date(vendedor.createdAt).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <VendedorModal 
                                    siteId={selectedSiteId!} 
                                    siteName={selectedSite.name}
                                    vendedor={vendedor}
                                    mode="edit"
                                  />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir o vendedor "{vendedor.username}"? 
                                          Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteVendedorMutation.mutate(vendedor.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              Nenhum vendedor encontrado. 
                              <br />
                              Clique em "Adicionar Vendedor" para começar.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="planos" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2" />
                        Planos - {selectedSite.name}
                      </CardTitle>
                      <CardDescription>
                        Configure planos de vouchers que vendedores podem usar
                      </CardDescription>
                    </div>
                    <PlanModal siteId={selectedSiteId!} siteName={selectedSite.name} />
                  </div>
                </CardHeader>
                <CardContent>
                  {plansLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome do Plano</TableHead>
                          <TableHead>Duração</TableHead>
                          <TableHead>Usuários Simultâneos</TableHead>
                          <TableHead>Preço</TableHead>
                          <TableHead>Data de criação</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plans && Array.isArray(plans) && plans.length > 0 ? (
                          plans.map((plan: any) => (
                            <TableRow key={plan.id}>
                              <TableCell className="font-medium">{plan.nome}</TableCell>
                              <TableCell>
                                {plan.duration >= 60 
                                  ? `${Math.floor(plan.duration / 60)}h ${plan.duration % 60 || ''}${plan.duration % 60 ? 'm' : ''}`
                                  : `${plan.duration}m`
                                }
                              </TableCell>
                              <TableCell>{plan.userLimit || 1}</TableCell>
                              <TableCell>R$ {parseFloat(plan.unitPrice).toFixed(2)}</TableCell>
                              <TableCell>
                                {new Date(plan.createdAt).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <PlanModal 
                                    siteId={selectedSiteId!} 
                                    siteName={selectedSite.name}
                                    plan={plan}
                                    mode="edit"
                                  />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir o plano "{plan.nome}"? 
                                          Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deletePlanMutation.mutate(plan.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              Nenhum plano encontrado. 
                              <br />
                              Clique em "Criar Plano" para começar.
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

        {/* Site Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Informações do Site</CardTitle>
            <CardDescription>
              Detalhes e configurações do site selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Detalhes Gerais</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Nome:</span> {selectedSite.name}
                  </div>
                  <div>
                    <span className="font-medium">Localização:</span> {selectedSite.location || "Não informada"}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <Badge 
                      variant={selectedSite.status === "active" ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {selectedSite.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Integração Omada</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Site ID:</span> {selectedSite.omadaSiteId || "Não configurado"}
                  </div>
                  {selectedSite.lastSync && (
                    <div>
                      <span className="font-medium">Última Sync:</span> {new Date(selectedSite.lastSync).toLocaleString("pt-BR")}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Criado em:</span> {new Date(selectedSite.createdAt).toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}