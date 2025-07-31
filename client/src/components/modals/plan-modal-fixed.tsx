import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { insertPlanSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

// Validation schema with enhanced rules for plan creation
const planFormSchema = insertPlanSchema.extend({
  nome: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  comprimentoVoucher: z.number().min(6, "Mínimo 6 caracteres").max(10, "Máximo 10 caracteres"),
  duration: z.number().min(1, "Mínimo 1 minuto").max(14400000, "Máximo 14.400.000 minutos"),
  unitPrice: z.string().min(1, "Preço é obrigatório"),
  downLimit: z.number().min(0).max(10485760).optional(),
  upLimit: z.number().min(0).max(10485760).optional(),
  durationUnit: z.string().default("horas").optional(), // Helper field for UI
  userLimit: z.number().min(1).max(999).default(1).optional(), // Number of concurrent users or usage count
  omadaLimitType: z.number().min(0).max(2).default(1).optional(), // Omada API mapping: 0=Limited Usage, 1=Limited Online Users, 2=Unlimited
  tipoCodigo: z.string().default("mixed").optional(), // Helper field for UI
  tipoLimite: z.string().default("duration").optional(), // Helper field for UI
});

type PlanFormData = z.infer<typeof planFormSchema>;

interface PlanModalProps {
  siteId: string;
  siteName: string;
  plan?: any; // For editing existing plans
  mode?: "create" | "edit";
  onClose?: () => void;
}

export function PlanModal({ siteId, siteName, plan, mode = "create", onClose }: PlanModalProps) {
  const [open, setOpen] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: isEdit ? {
      nome: plan?.nome || "",
      comprimentoVoucher: plan?.comprimentoVoucher || 8,
      tipoCodigo: plan?.tipoCodigo || "mixed",
      tipoLimite: "duration", // Always Limited Online Users
      codeForm: plan?.codeForm || "[0,1]",
      duration: plan?.duration || 60,
      durationUnit: "horas",
      downLimit: plan?.downLimit || 0,
      upLimit: plan?.upLimit || 0,
      unitPrice: plan?.unitPrice || "0.00",
      userLimit: plan?.userLimit || 1,
      omadaLimitType: plan?.omadaLimitType || 1,
      siteId: siteId,
    } : {
      nome: "",
      comprimentoVoucher: 8,
      tipoCodigo: "mixed",
      tipoLimite: "duration", // Always Limited Online Users
      codeForm: "[0,1]",
      duration: 60,
      durationUnit: "horas",
      downLimit: 0,
      upLimit: 0,
      unitPrice: "0.00",
      userLimit: 1,
      omadaLimitType: 1,
      siteId: siteId,
    },
  });

  const planMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const url = isEdit ? `/api/plans/${plan.id}` : `/api/sites/${siteId}/plans`;
      const method = isEdit ? "PUT" : "POST";
      const response = await apiRequest(method, url, data);
      return await response.json();
    },
    onSuccess: () => {
      setOpen(false);
      onClose?.();
      form.reset();
      toast({
        title: isEdit ? "Plano atualizado" : "Plano criado com sucesso",
        description: isEdit 
          ? `Plano "${form.getValues('nome')}" foi atualizado`
          : `Plano "${form.getValues('nome')}" foi criado para o site "${siteName}"`,
      });
      // Invalidate plans query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/sites/${siteId}/plans`] });
    },
    onError: (error: Error) => {
      toast({
        title: isEdit ? "Erro ao atualizar plano" : "Erro ao criar plano",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PlanFormData) => {
    // Convert tipoCodigo to correct codeForm JSON format for Omada API
    let codeForm = "[0,1]"; // Default mixed
    if (data.tipoCodigo === "digits") {
      codeForm = "[0]"; // Only numbers
    } else if (data.tipoCodigo === "letters") {
      codeForm = "[1]"; // Only letters
    } else if (data.tipoCodigo === "mixed") {
      codeForm = "[0,1]"; // Numbers and letters
    }
    
    // Remove the helper fields before sending to backend, keep userLimit and omadaLimitType
    const { durationUnit, tipoCodigo, ...planData } = data;
    
    // Ensure unitPrice is a valid decimal string
    const finalData = {
      ...planData,
      codeForm: codeForm,
      unitPrice: parseFloat(planData.unitPrice || "0").toFixed(2)
    };
    
    console.log('Submitting plan data:', finalData);
    planMutation.mutate(finalData);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Plano" : "Criar Novo Plano"}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? `Editar plano para o site "${siteName}"`
              : `Criar um novo plano para o site "${siteName}"`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome do Plano</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Voucher 1 Hora" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 5.00"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuários Simultâneos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="999"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (minutos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Ex: 60"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comprimentoVoucher"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamanho do Código</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="6"
                        max="10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 8)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipoCodigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Código</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mixed">Números e Letras</SelectItem>
                        <SelectItem value="digits">Apenas Números</SelectItem>
                        <SelectItem value="letters">Apenas Letras</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="downLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite Download (KB/s)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Ex: 1024"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={planMutation.isPending}>
                {planMutation.isPending ? "Salvando..." : isEdit ? "Atualizar" : "Criar Plano"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}