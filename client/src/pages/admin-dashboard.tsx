import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings,
  MapPin,
  Wifi,
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";
import { Site } from "@shared/schema";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Get selected site from localStorage
  useEffect(() => {
    const storedSiteId = localStorage.getItem("selectedSiteId");
    setSelectedSiteId(storedSiteId);
  }, []);

  const { data: userSites } = useQuery<Site[]>({
    queryKey: ["/api/users", user?.id, "sites"],
    enabled: !!user?.id,
  });

  const { data: selectedSite } = useQuery<Site>({
    queryKey: ["/api/sites", selectedSiteId],
    enabled: !!selectedSiteId,
  });

  // Redirect to site selection if no site selected or if user has multiple sites
  useEffect(() => {
    console.log("AdminDashboard useEffect:", {
      userRole: user?.role,
      userSitesLength: userSites?.length,
      selectedSiteId,
      userSites
    });
    
    if (user?.role === "admin" && userSites) {
      if (userSites.length === 0) {
        // No sites assigned - show error or redirect
        console.log("No sites assigned, redirecting to auth");
        setLocation("/auth");
      } else if (userSites.length > 1 && !selectedSiteId) {
        // Multiple sites but none selected - redirect to selection
        console.log("Multiple sites but no selection, redirecting to site-selection");
        setLocation("/site-selection");
      } else if (userSites.length === 1 && !selectedSiteId) {
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
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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
              <Button className="w-full" disabled>
                Em Breve
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Gerenciar Planos
              </CardTitle>
              <CardDescription>
                Criar e configurar planos de vouchers WiFi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Em Breve
              </Button>
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