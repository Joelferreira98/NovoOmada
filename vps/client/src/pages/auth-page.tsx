import { useForm } from "react-hook-form";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Wifi, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/hooks/use-app-settings";

type LoginForm = {
  username: string;
  password: string;
  rememberMe: boolean;
};

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const { data: appSettings } = useAppSettings();

  const loginForm = useForm<LoginForm>({
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
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
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center justify-center space-x-3">
              {appSettings?.logoUrl ? (
                <img 
                  src={appSettings.logoUrl} 
                  alt="Logo" 
                  className="w-16 h-16 object-contain rounded-lg"
                />
              ) : (
                <div className="bg-emerald-500 p-3 rounded-lg">
                  <Wifi className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-800">
                  {appSettings?.appName || "Omada Voucher"}
                </h1>
                <p className="text-sm text-slate-600">Sistema de Gestão</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Digite seu usuário"
                  {...loginForm.register("username", { required: true })}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  {...loginForm.register("password", { required: true })}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  {...loginForm.register("rememberMe")}
                />
                <Label 
                  htmlFor="rememberMe" 
                  className="text-sm font-normal text-slate-600 cursor-pointer"
                >
                  Manter conectado
                </Label>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
  );
}