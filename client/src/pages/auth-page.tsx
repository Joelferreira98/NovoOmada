import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wifi, Shield, User, Crown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "vendedor",
    },
  });

  if (user) {
    // Redirect based on user role
    switch (user.role) {
      case "master":
        return <Redirect to="/master" />;
      case "admin":
        return <Redirect to="/admin" />;
      case "vendedor":
        return <Redirect to="/vendedor" />;
      default:
        return <Redirect to="/" />;
    }
  }

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-primary w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Wifi className="text-white text-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Sistema Omada</h1>
            <p className="text-slate-600 mt-2">Gerenciamento de vouchers e sites</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Registro</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Fazer Login</CardTitle>
                  <CardDescription>Entre com suas credenciais</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div>
                      <Label htmlFor="username">Usuário</Label>
                      <Input
                        id="username"
                        {...loginForm.register("username")}
                        placeholder="Seu usuário"
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-red-600 mt-1">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        {...loginForm.register("password")}
                        placeholder="••••••••"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-600 mt-1">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Criar Conta</CardTitle>
                  <CardDescription>Registre-se no sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <div>
                      <Label htmlFor="reg-username">Usuário</Label>
                      <Input
                        id="reg-username"
                        {...registerForm.register("username")}
                        placeholder="Seu usuário"
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...registerForm.register("email")}
                        placeholder="seu@email.com"
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="role">Tipo de Usuário</Label>
                      <Select onValueChange={(value) => registerForm.setValue("role", value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="master">Master</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="vendedor">Vendedor</SelectItem>
                        </SelectContent>
                      </Select>
                      {registerForm.formState.errors.role && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.role.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="reg-password">Senha</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        {...registerForm.register("password")}
                        placeholder="••••••••"
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="confirm-password">Confirmar Senha</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        {...registerForm.register("confirmPassword")}
                        placeholder="••••••••"
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Registrando..." : "Registrar"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-primary-50 to-slate-100 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-bold text-slate-800 mb-6">
            Sistema Multi-Usuário Omada
          </h2>
          <p className="text-slate-600 mb-8">
            Gerencie vouchers, sites e usuários de forma centralizada com três níveis de acesso
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3 p-4 bg-white/50 rounded-lg">
              <Crown className="text-primary w-6 h-6" />
              <div className="text-left">
                <p className="font-semibold text-slate-800">Master</p>
                <p className="text-sm text-slate-600">Configurações Omada e gerenciamento de sites</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-3 p-4 bg-white/50 rounded-lg">
              <Shield className="text-emerald-600 w-6 h-6" />
              <div className="text-left">
                <p className="font-semibold text-slate-800">Admin</p>
                <p className="text-sm text-slate-600">Gerenciamento de planos e vendedores</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-3 p-4 bg-white/50 rounded-lg">
              <User className="text-amber-600 w-6 h-6" />
              <div className="text-left">
                <p className="font-semibold text-slate-800">Vendedor</p>
                <p className="text-sm text-slate-600">Geração de vouchers e relatórios</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
