import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Upload, Download, Palette } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";

interface AppSettings {
  id: string;
  appName: string;
  appDescription: string;
  themeColor: string;
  hasCustomIcons: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PWASettings() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    appName: "",
    appDescription: "",
    themeColor: "#2563eb"
  });

  // Fetch current app settings
  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ["/api/app-settings"],
  });

  // Update form data when settings are loaded
  React.useEffect(() => {
    if (settings) {
      setFormData({
        appName: settings.appName || "",
        appDescription: settings.appDescription || "",
        themeColor: settings.themeColor || "#2563eb"
      });
    }
  }, [settings]);

  // Update app settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("PUT", "/api/app-settings", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
      toast({
        title: "Configurações atualizadas",
        description: "As configurações do app foram salvas com sucesso."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Upload custom icons mutation
  const uploadIconsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("icon", file);
      
      const res = await fetch("/api/upload-icons", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error("Failed to upload icons");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
      toast({
        title: "Ícones personalizados enviados",
        description: "Os ícones do app foram atualizados com sucesso."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Generate default icons mutation
  const generateDefaultIconsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/generate-default-icons", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
      toast({
        title: "Ícones padrão gerados",
        description: "Ícones padrão foram criados com as iniciais do app."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar ícones",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo de imagem.",
          variant: "destructive"
        });
        return;
      }
      
      uploadIconsMutation.mutate(file);
    }
  };

  const installPWA = () => {
    toast({
      title: "Instalação PWA",
      description: "Use o menu do navegador para 'Adicionar à tela inicial' ou 'Instalar app'."
    });
  };

  if (isLoading) {
    return (
      <div className="d-flex bg-light min-vh-100">
        <Sidebar
          title="Master User"
          subtitle="Administrador Geral"
          icon={Smartphone}
          iconBg="bg-info"
          items={[]}
        />
        <div className="flex-fill p-4">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
            <div className="text-center">Carregando configurações...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar
        title="Master User"
        subtitle="Administrador Geral"
        icon={Smartphone}
        iconBg="bg-info"
        items={[]}
      />
      
      <div className="flex-fill p-3 p-lg-4 overflow-auto">
        <div className="container-fluid px-0">
          <div className="row">
            <div className="col-lg-8 mx-auto">
            <div className="d-flex align-items-center mb-4">
              <Smartphone className="h-6 w-6 me-3 text-primary" />
              <div>
                <h1 className="h3 mb-0">Configurações PWA</h1>
                <p className="text-muted mb-0">Configure o Progressive Web App do sistema</p>
              </div>
            </div>

            <div className="row g-4">
              {/* App Information */}
              <div className="col-12">
                <Card>
                  <CardHeader>
                    <CardTitle className="d-flex align-items-center">
                      <Palette className="h-5 w-5 me-2" />
                      Informações do App
                    </CardTitle>
                    <CardDescription>
                      Configure o nome, descrição e cor tema do aplicativo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <Label htmlFor="appName">Nome do App</Label>
                          <Input
                            id="appName"
                            value={formData.appName}
                            onChange={(e) => setFormData(prev => ({ ...prev, appName: e.target.value }))}
                            placeholder="Ex: Meu Sistema de Vouchers"
                          />
                        </div>
                        
                        <div className="col-md-6">
                          <Label htmlFor="themeColor">Cor Tema</Label>
                          <div className="d-flex">
                            <Input
                              id="themeColor"
                              type="color"
                              value={formData.themeColor}
                              onChange={(e) => setFormData(prev => ({ ...prev, themeColor: e.target.value }))}
                              className="w-100"
                            />
                          </div>
                        </div>
                        
                        <div className="col-12">
                          <Label htmlFor="appDescription">Descrição do App</Label>
                          <Textarea
                            id="appDescription"
                            value={formData.appDescription}
                            onChange={(e) => setFormData(prev => ({ ...prev, appDescription: e.target.value }))}
                            placeholder="Descrição breve do sistema para aparecer na instalação PWA"
                            rows={3}
                          />
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={updateSettingsMutation.isPending}
                        className="btn btn-primary"
                      >
                        {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* App Icons */}
              <div className="col-12">
                <Card>
                  <CardHeader>
                    <CardTitle className="d-flex align-items-center">
                      <Upload className="h-5 w-5 me-2" />
                      Ícones do App
                    </CardTitle>
                    <CardDescription>
                      Personalize os ícones que aparecem quando o app é instalado
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="d-flex align-items-center justify-content-between p-3 border rounded">
                        <div>
                          <div className="fw-bold">Status dos Ícones</div>
                          <div className="text-muted small">
                            {settings?.hasCustomIcons 
                              ? "✅ Ícones personalizados configurados" 
                              : "⚠️ Usando ícones padrão do sistema"}
                          </div>
                        </div>
                      </div>
                      
                      <div className="row g-3">
                        <div className="col-md-6">
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadIconsMutation.isPending}
                            variant="outline"
                            className="w-100"
                          >
                            <Upload className="h-4 w-4 me-2" />
                            {uploadIconsMutation.isPending ? "Enviando..." : "Enviar Ícone Personalizado"}
                          </Button>
                          
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="d-none"
                          />
                          
                          <div className="text-muted small mt-2">
                            Recomendado: PNG quadrado, mínimo 512x512px
                          </div>
                        </div>
                        
                        <div className="col-md-6">
                          <Button
                            onClick={() => generateDefaultIconsMutation.mutate()}
                            disabled={generateDefaultIconsMutation.isPending}
                            variant="secondary"
                            className="w-100"
                          >
                            <Palette className="h-4 w-4 me-2" />
                            {generateDefaultIconsMutation.isPending ? "Gerando..." : "Gerar Ícones Padrão"}
                          </Button>
                          
                          <div className="text-muted small mt-2">
                            Cria ícones com as iniciais do app
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* PWA Installation */}
              <div className="col-12">
                <Card>
                  <CardHeader>
                    <CardTitle className="d-flex align-items-center">
                      <Download className="h-5 w-5 me-2" />
                      Instalação PWA
                    </CardTitle>
                    <CardDescription>
                      Como instalar o aplicativo em dispositivos móveis e desktop
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="alert alert-info">
                        <strong>📱 No celular:</strong> Abra este site no navegador e toque em "Adicionar à tela inicial"
                      </div>
                      
                      <div className="alert alert-info">
                        <strong>💻 No computador:</strong> Use Chrome/Edge e clique no ícone de instalação na barra de endereços
                      </div>
                      
                      <Button onClick={installPWA} variant="outline" className="w-100">
                        <Download className="h-4 w-4 me-2" />
                        Instruções de Instalação
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}