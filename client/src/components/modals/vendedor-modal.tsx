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
import { UserPlus } from "lucide-react";

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
}

export function VendedorModal({ siteId, siteName }: VendedorModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<VendedorFormData>({
    resolver: zodResolver(vendedorSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const createVendedorMutation = useMutation({
    mutationFn: async (data: VendedorFormData) => {
      // Create vendedor user
      const vendedorData: InsertUser = {
        ...data,
        role: "vendedor",
      };
      
      const response = await apiRequest("POST", "/api/users", vendedorData);
      const vendedor = await response.json();
      
      // Assign the current site to the vendedor
      await apiRequest("POST", `/api/users/${vendedor.id}/sites/assign`, {
        siteIds: [siteId]
      });
      
      return vendedor;
    },
    onSuccess: () => {
      setOpen(false);
      form.reset();
      toast({
        title: "Vendedor criado com sucesso",
        description: `Vendedor foi criado e atribuído ao site "${siteName}"`,
      });
      // Invalidate users query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar vendedor",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VendedorFormData) => {
    createVendedorMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Criar Vendedor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Vendedor</DialogTitle>
          <DialogDescription>
            Crie um vendedor para o site "{siteName}". O vendedor será automaticamente atribuído a este site.
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
                disabled={createVendedorMutation.isPending}
              >
                {createVendedorMutation.isPending ? "Criando..." : "Criar Vendedor"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}