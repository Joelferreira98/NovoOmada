import { useForm } from "react-hook-form";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wifi, Shield, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type LoginForm = {
  username: string;
  password: string;
};

export default function AuthPage() {
  const { user, loginMutation } = useAuth();

  const loginForm = useForm<LoginForm>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    const redirectPath = user.role === "master" ? "/" : 
                        user.role === "admin" ? "/admin" : "/vendedor";
    return <Redirect to={redirectPath} />;
  }

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hero Section */}
        <div className="flex flex-col justify-center space-y-8 p-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500 p-3 rounded-lg">
                <Wifi className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Omada Voucher</h1>
                <p className="text-slate-600">Sistema de Gestão de Vouchers WiFi</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-slate-800">
                Gerencie sua rede WiFi com facilidade
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed">
                Sistema completo para gerenciamento de vouchers WiFi integrado com Omada Controller. 
                Controle total sobre vendas, usuários e relatórios em uma plataforma única.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Seguro</h3>
                <p className="text-sm text-slate-600">Sistema com autenticação robusta</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="bg-amber-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Multi-usuário</h3>
                <p className="text-sm text-slate-600">Diferentes níveis de acesso</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="bg-emerald-100 p-3 rounded-lg">
                <Wifi className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Integrado</h3>
                <p className="text-sm text-slate-600">Conecta com Omada Controller</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Acesso ao Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div>
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    {...loginForm.register("username")}
                    placeholder="Digite seu usuário"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    {...loginForm.register("password")}
                    placeholder="Digite sua senha"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}