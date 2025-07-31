import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image, Smartphone, Download } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AppSettings {
  appName: string;
  appDescription: string;
  themeColor: string;
  hasCustomIcons: boolean;
}

export default function AppSettings() {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current app settings
  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ["/api/app-settings"],
  });

  // Update app settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<AppSettings>) => {
      const res = await apiRequest("PUT", "/api/app-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
      toast({
        title: "Configurações atualizadas",
        description: "As configurações do app foram salvas com sucesso.",
      });
    }
  });

  // Upload icons mutation
  const uploadIconsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("icon", file);
      
      const res = await fetch("/api/upload-icons", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error("Falha no upload do ícone");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
      toast({
        title: "Ícones atualizados",
        description: "Os ícones do app foram atualizados. A PWA usará os novos ícones.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Generate default icons mutation
  const generateDefaultIconsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/generate-default-icons");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
      toast({
        title: "Ícones padrão gerados",
        description: "Ícones padrão foram criados para a PWA.",
      });
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 5MB.",
        variant: "destructive",
      });
      return;
    }

    uploadIconsMutation.mutate(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleSettingsUpdate = (field: string, value: string) => {
    updateSettingsMutation.mutate({ [field]: value });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando configurações...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Configurações do App</h1>
        <p className="text-gray-600 mt-2">Configure o nome, ícones e aparência da PWA</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Informações do App
            </CardTitle>
            <CardDescription>
              Configure o nome e descrição que aparecerão na PWA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="appName">Nome do App</Label>
              <Input
                id="appName"
                defaultValue={settings?.appName || "Omada Vouchers"}
                onBlur={(e) => handleSettingsUpdate("appName", e.target.value)}
                placeholder="Nome do aplicativo"
              />
            </div>
            
            <div>
              <Label htmlFor="appDescription">Descrição</Label>
              <Input
                id="appDescription"
                defaultValue={settings?.appDescription || "Sistema de gestão de vouchers WiFi"}
                onBlur={(e) => handleSettingsUpdate("appDescription", e.target.value)}
                placeholder="Descrição do aplicativo"
              />
            </div>
            
            <div>
              <Label htmlFor="themeColor">Cor do tema</Label>
              <Input
                id="themeColor"
                type="color"
                defaultValue={settings?.themeColor || "#2563eb"}
                onChange={(e) => handleSettingsUpdate("themeColor", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Icon Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Ícones da PWA
            </CardTitle>
            <CardDescription>
              Faça upload de um ícone personalizado ou use os padrão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Arraste uma imagem aqui ou clique para selecionar
              </p>
              <p className="text-xs text-gray-500 mb-4">
                PNG, JPG até 5MB. Recomendado: 512x512px
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
              
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadIconsMutation.isPending}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadIconsMutation.isPending ? "Enviando..." : "Selecionar Arquivo"}
                </Button>
                
                <Button 
                  onClick={() => generateDefaultIconsMutation.mutate()}
                  disabled={generateDefaultIconsMutation.isPending}
                  variant="secondary"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {generateDefaultIconsMutation.isPending ? "Gerando..." : "Usar Padrão"}
                </Button>
              </div>
            </div>
            
            {settings?.hasCustomIcons && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✅ Ícones personalizados configurados
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PWA Installation Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Como Instalar a PWA</CardTitle>
          <CardDescription>
            Instruções para instalar o app no dispositivo móvel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">📱 Android (Chrome/Edge)</h4>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Abra o site no navegador</li>
                <li>2. Toque no menu (⋮) do navegador</li>
                <li>3. Selecione "Adicionar à tela inicial"</li>
                <li>4. Confirme a instalação</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">🍎 iPhone (Safari)</h4>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Abra o site no Safari</li>
                <li>2. Toque no botão Compartilhar</li>
                <li>3. Selecione "Adicionar à Tela de Início"</li>
                <li>4. Toque em "Adicionar"</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}