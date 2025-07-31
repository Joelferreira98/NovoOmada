import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Edit } from "lucide-react";

const vendedorSchema = insertUserSchema.extend({
  password: insertUserSchema.shape.password.min(6, "Senha deve ter pelo menos 6 caracteres"),
}).pick({
  username: true,
  email: true,
  password: true,
});

type VendedorFormData = {
  username: string;
  email: string;
  password: string;
};

interface VendedorModalProps {
  siteId: string;
  siteName: string;
  vendedor?: any;
  mode?: "create" | "edit";
  onClose?: () => void;
}

export function VendedorModal({ siteId, siteName, vendedor, mode = "create", onClose }: VendedorModalProps) {
  const [open, setOpen] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<VendedorFormData>({
    resolver: zodResolver(vendedorSchema),
    defaultValues: {
      username: vendedor?.username || "",
      email: vendedor?.email || "",
      password: "",
    },
  });

  const vendedorMutation = useMutation({
    mutationFn: async (data: VendedorFormData) => {
      if (mode === "edit" && vendedor) {
        // Update existing vendedor
        const updateData = {
          username: data.username,
          email: data.email,
          ...(data.password && { password: data.password })
        };
        const response = await apiRequest("PUT", `/api/users/${vendedor.id}`, updateData);
        return await response.json();
      } else {
        // Create vendedor user
        const vendedorData: InsertUser = {
          ...data,
          role: "vendedor",
        };
        
        const response = await apiRequest("POST", "/api/users", vendedorData);
        const newVendedor = await response.json();
        
        // Assign the current site to the vendedor
        await apiRequest("POST", `/api/users/${newVendedor.id}/sites/assign`, {
          siteIds: [siteId]
        });
        
        return newVendedor;
      }
    },
    onSuccess: () => {
      setOpen(false);
      onClose?.();
      form.reset();
      toast({
        title: mode === "edit" ? "Vendedor atualizado com sucesso" : "Vendedor criado com sucesso",
        description: mode === "edit" 
          ? `Vendedor foi atualizado com sucesso` 
          : `Vendedor foi criado e atribuído ao site "${siteName}"`,
      });
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "vendedores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: mode === "edit" ? "Erro ao atualizar vendedor" : "Erro ao criar vendedor",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VendedorFormData) => {
    vendedorMutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar Vendedor" : "Criar Novo Vendedor"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" 
              ? `Edite as informações do vendedor "${vendedor?.username}"`
              : `Crie um vendedor para o site "${siteName}". O vendedor será automaticamente atribuído a este site.`
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome de usuário</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome de usuário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Digite o e-mail"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Digite a senha"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={vendedorMutation.isPending}
              >
                {vendedorMutation.isPending 
                  ? (mode === "edit" ? "Atualizando..." : "Criando...") 
                  : (mode === "edit" ? "Atualizar Vendedor" : "Criar Vendedor")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}