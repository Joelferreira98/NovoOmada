import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, User, Lock, Save } from "lucide-react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [profileData, setProfileData] = useState({
    username: user?.username || "",
    email: user?.email || "",
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}/password`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso.",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Verifique se a senha atual está correta.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleGoBack = () => {
    if (user?.role === "master") {
      setLocation("/master");
    } else if (user?.role === "admin") {
      setLocation("/admin");
    } else {
      setLocation("/vendedor");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={handleGoBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Meu Perfil
                </h1>
                <p className="text-sm text-gray-600">
                  Gerencie suas informações pessoais e configurações
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Informações Pessoais</TabsTrigger>
              <TabsTrigger value="password">Alterar Senha</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Informações Pessoais
                  </CardTitle>
                  <CardDescription>
                    Atualize suas informações básicas de perfil
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Nome de usuário</Label>
                      <Input
                        id="username"
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          username: e.target.value
                        }))}
                        placeholder="Digite seu nome de usuário"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          email: e.target.value
                        }))}
                        placeholder="Digite seu e-mail"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Função</Label>
                      <Input
                        value={user?.role === "master" ? "Master" : user?.role === "admin" ? "Administrador" : "Vendedor"}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={updateProfileMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="h-5 w-5 mr-2" />
                    Alterar Senha
                  </CardTitle>
                  <CardDescription>
                    Atualize sua senha para manter sua conta segura
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Senha atual</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          currentPassword: e.target.value
                        }))}
                        placeholder="Digite sua senha atual"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nova senha</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          newPassword: e.target.value
                        }))}
                        placeholder="Digite sua nova senha"
                        required
                        minLength={6}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          confirmPassword: e.target.value
                        }))}
                        placeholder="Confirme sua nova senha"
                        required
                        minLength={6}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={updatePasswordMutation.isPending}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {updatePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}