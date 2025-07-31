import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const editUserSchema = z.object({
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().optional(),
  confirmPassword: z.string().optional()
}).refine((data) => {
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function EditUserModal({ open, onOpenChange, user }: EditUserModalProps) {
  const { toast } = useToast();
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  const { data: sites = [] } = useQuery({
    queryKey: ["/api/sites"],
  });

  const { data: userSites = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "sites"],
    enabled: !!user?.id
  });

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        email: user.email,
        password: "",
        confirmPassword: ""
      });
      
      // Set selected sites
      const siteIds = (userSites as any[]).map((site: any) => site.id);
      setSelectedSites(siteIds);
    }
  }, [user, userSites, form]);

  const updateUserMutation = useMutation({
    mutationFn: async (userData: EditUserFormData) => {
      const updateData: any = {
        username: userData.username,
        email: userData.email
      };
      
      // Only include password if it's provided
      if (userData.password && userData.password.length > 0) {
        updateData.password = userData.password;
      }
      
      const res = await apiRequest("PUT", `/api/users/${user.id}`, updateData);
      return await res.json();
    },
    onSuccess: async () => {
      // Update site assignments
      await apiRequest("POST", `/api/users/${user.id}/sites/assign`, {
        siteIds: selectedSites
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "sites"] });
      toast({
        title: "Usuário atualizado",
        description: "Administrador atualizado com sucesso"
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar usuário",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: EditUserFormData) => {
    updateUserMutation.mutate(data);
  };

  const toggleSite = (siteId: string) => {
    setSelectedSites(prev => 
      prev.includes(siteId) 
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Administrador - {user.username}</DialogTitle>
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
              <Label htmlFor="password">Nova Senha (opcional)</Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                placeholder="Deixe vazio para manter atual"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...form.register("confirmPassword")}
                placeholder="Confirme a nova senha"
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Site Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sites Atribuídos</CardTitle>
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
              disabled={updateUserMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? "Atualizando..." : "Atualizar Administrador"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}