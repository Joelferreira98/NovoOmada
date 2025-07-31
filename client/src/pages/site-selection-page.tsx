import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Wifi, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { Site } from "@shared/schema";

export default function SiteSelectionPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: userSites, isLoading } = useQuery<Site[]>({
    queryKey: ["/api/users", user?.id, "sites"],
    enabled: !!user?.id,
  });

  const handleSiteSelect = (siteId: string) => {
    // Store selected site in localStorage
    localStorage.setItem("selectedSiteId", siteId);
    // Redirect to admin dashboard
    setLocation("/admin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando sites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Selecionar Site
            </h1>
            <p className="text-gray-600">
              Olá {user?.username}, selecione o site que deseja gerenciar
            </p>
          </div>

          {userSites && userSites.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {userSites.map((site) => (
                <Card key={site.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{site.name}</CardTitle>
                      <Badge variant={site.status === "active" ? "default" : "secondary"}>
                        {site.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {site.location || "Localização não informada"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Wifi className="h-4 w-4 mr-2" />
                        ID Omada: {site.omadaSiteId || "Não configurado"}
                      </div>
                      
                      {site.lastSync && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          Última sync: {new Date(site.lastSync).toLocaleString("pt-BR")}
                        </div>
                      )}

                      <Button 
                        onClick={() => handleSiteSelect(site.id)}
                        className="w-full mt-4"
                        disabled={site.status !== "active"}
                      >
                        {site.status === "active" ? "Gerenciar Site" : "Site Inativo"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Wifi className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum site atribuído
                </h3>
                <p className="text-gray-600 mb-6">
                  Você ainda não tem sites atribuídos. Entre em contato com o administrador master.
                </p>
                <Button variant="outline" onClick={() => setLocation("/auth")}>
                  Voltar ao Login
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}