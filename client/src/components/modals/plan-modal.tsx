import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertPlanSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Save, X } from "lucide-react";

const planFormSchema = insertPlanSchema.omit({ 
  siteId: true, 
  createdBy: true, 
  status: true 
});

type PlanFormData = z.infer<typeof planFormSchema>;

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
}

export function PlanModal({ isOpen, onClose, siteId }: PlanModalProps) {
  const { toast } = useToast();

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      nome: "",
      comprimentoVoucher: 8,
      tipoCodigo: "alfanumérico",
      tipoLimite: "Por Tempo",
      codeForm: "",
      duration: 60,
      downLimit: 10,
      upLimit: 5,
      unitPrice: "5.00",
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const res = await apiRequest("POST", `/api/sites/${siteId}/plans`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/site", siteId] });
      toast({
        title: "Plano criado",
        description: "Plano foi criado com sucesso",
      });
      form.reset();
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar plano",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PlanFormData) => {
    createPlanMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Criar Novo Plano</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="nome">Nome do Plano</Label>
              <Input
                id="nome"
                {...form.register("nome")}
                placeholder="Ex: Plano 1 Hora"
              />
              {form.formState.errors.nome && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.nome.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="comprimentoVoucher">Comprimento do Voucher</Label>
              <Select onValueChange={(value) => form.setValue("comprimentoVoucher", parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o comprimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 caracteres</SelectItem>
                  <SelectItem value="8">8 caracteres</SelectItem>
                  <SelectItem value="10">10 caracteres</SelectItem>
                  <SelectItem value="12">12 caracteres</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tipoCodigo">Tipo de Código</Label>
              <Select onValueChange={(value) => form.setValue("tipoCodigo", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alfanumérico">Alfanumérico</SelectItem>
                  <SelectItem value="apenas números">Apenas Números</SelectItem>
                  <SelectItem value="apenas letras">Apenas Letras</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tipoLimite">Tipo de Limite</Label>
              <Select onValueChange={(value) => form.setValue("tipoLimite", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Por Tempo">Por Tempo</SelectItem>
                  <SelectItem value="Por Dados">Por Dados</SelectItem>
                  <SelectItem value="Tempo + Dados">Tempo + Dados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="codeForm">CodeForm</Label>
              <Input
                id="codeForm"
                {...form.register("codeForm")}
                placeholder="Ex: 1H_BASIC"
              />
            </div>
            
            <div>
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                type="number"
                {...form.register("duration", { valueAsNumber: true })}
                placeholder="60"
              />
            </div>
            
            <div>
              <Label htmlFor="downLimit">Limite Download (Mbps)</Label>
              <Input
                id="downLimit"
                type="number"
                {...form.register("downLimit", { valueAsNumber: true })}
                placeholder="10"
              />
            </div>
            
            <div>
              <Label htmlFor="upLimit">Limite Upload (Mbps)</Label>
              <Input
                id="upLimit"
                type="number"
                {...form.register("upLimit", { valueAsNumber: true })}
                placeholder="5"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="unitPrice">Preço Unitário (R$)</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                {...form.register("unitPrice")}
                placeholder="5.00"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createPlanMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {createPlanMutation.isPending ? "Criando..." : "Criar Plano"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
