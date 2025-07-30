import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertPlanSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
}

type PlanForm = {
  nome: string;
  comprimentoVoucher: number;
  tipoLimite: string;
  codeForm: string;
  duration: number;
  downLimit: number;
  upLimit: number;
  unitPrice: number;
};

export function PlanModal({ isOpen, onClose, siteId }: PlanModalProps) {
  const { toast } = useToast();
  
  const form = useForm<PlanForm>({
    resolver: zodResolver(insertPlanSchema.omit({ siteId: true, status: true, createdBy: true })),
    defaultValues: {
      nome: "",
      comprimentoVoucher: 6,
      tipoLimite: "time",
      codeForm: "ALPHANUMERIC",
      duration: 60,
      downLimit: 10,
      upLimit: 5,
      unitPrice: 5.00,
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanForm) => {
      const res = await apiRequest("POST", "/api/plans", {
        ...data,
        siteId
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "plans"] });
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

  const onSubmit = (data: PlanForm) => {
    createPlanMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Plano</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="nome">Nome do Plano</Label>
              <Input
                id="nome"
                {...form.register("nome")}
                placeholder="Ex: Plano 30 minutos"
              />
            </div>

            <div>
              <Label htmlFor="comprimentoVoucher">Comprimento do Voucher</Label>
              <Input
                id="comprimentoVoucher"
                type="number"
                min="4"
                max="12"
                {...form.register("comprimentoVoucher", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="codeForm">Tipo de Código</Label>
              <Select 
                value={form.watch("codeForm")} 
                onValueChange={(value) => form.setValue("codeForm", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALPHANUMERIC">Alfanumérico</SelectItem>
                  <SelectItem value="NUMERIC">Numérico</SelectItem>
                  <SelectItem value="ALPHA">Alfabético</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tipoLimite">Tipo de Limite</Label>
              <Select 
                value={form.watch("tipoLimite")} 
                onValueChange={(value) => form.setValue("tipoLimite", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">Tempo</SelectItem>
                  <SelectItem value="data">Dados</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                {...form.register("duration", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="unitPrice">Preço Unitário (R$)</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0"
                {...form.register("unitPrice", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="downLimit">Download (Mbps)</Label>
              <Input
                id="downLimit"
                type="number"
                min="1"
                {...form.register("downLimit", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="upLimit">Upload (Mbps)</Label>
              <Input
                id="upLimit"
                type="number"
                min="1"
                {...form.register("upLimit", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createPlanMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {createPlanMutation.isPending ? "Criando..." : "Criar Plano"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}