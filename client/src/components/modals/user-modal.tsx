import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const userFormSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserModal({ open, onOpenChange }: UserModalProps) {
  const { toast } = useToast();
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  const { data: sites = [] } = useQuery({
    queryKey: ["/api/sites"],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "admin"
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const { confirmPassword, ...userToCreate } = userData;
      const res = await apiRequest("POST", "/api/users", userToCreate);
      return await res.json();
    },
    onSuccess: async (newUser) => {
      // Assign sites if any selected
      if (selectedSites.length > 0) {
        await apiRequest("POST", `/api/users/${newUser.id}/sites/assign`, {
          siteIds: selectedSites
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário criado",
        description: `${newUser.role === 'admin' ? 'Administrador' : 'Vendedor'} criado com sucesso`
      });
      onOpenChange(false);
      form.reset();
      setSelectedSites([]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar usuário",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const toggleSite = (siteId: string) => {
    setSelectedSites(prev => 
      prev.includes(siteId) 
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Nome de Usuário</Label>
              <Input
                id="username"
                {...form.register("username")}
                placeholder="Digite o username"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="usuario@exemplo.com"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                placeholder="Digite a senha"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...form.register("confirmPassword")}
                placeholder="Confirme a senha"
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="role">Tipo de Usuário</Label>
              <Select value={form.watch("role")} onValueChange={(value) => form.setValue("role", value as "admin" | "vendedor")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.role && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.role.message}</p>
              )}
            </div>
          </div>

          {/* Site Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Atribuição de Sites</CardTitle>
            </CardHeader>
            <CardContent>
              {(sites as any[]).length === 0 ? (
                <p className="text-slate-500 text-center py-4">
                  Nenhum site disponível. Execute a sincronização primeiro.
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(sites as any[]).map((site: any) => (
                    <div key={site.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={site.id}
                        checked={selectedSites.includes(site.id)}
                        onCheckedChange={() => toggleSite(site.id)}
                      />
                      <Label htmlFor={site.id} className="flex-1 cursor-pointer">
                        <div>
                          <p className="font-medium">{site.name}</p>
                          <p className="text-sm text-slate-500">{site.location}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createUserMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}