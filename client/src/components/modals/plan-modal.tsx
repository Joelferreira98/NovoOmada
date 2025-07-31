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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { insertPlanSchema, type InsertPlan } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Plus } from "lucide-react";
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
}

export function PlanModal({ siteId, siteName, plan, mode = "create" }: PlanModalProps) {
  const [open, setOpen] = useState(false);
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
    
    // Add the correctly formatted codeForm
    const finalData = {
      ...planData,
      codeForm: codeForm
    };
    
    planMutation.mutate(finalData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Editar
          </Button>
        ) : (
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Criar Plano
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Plano" : "Criar Novo Plano"}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? `Editar plano para o site "${siteName}"`
              : `Criar um template de plano para facilitar a geração de vouchers no site "${siteName}"`
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Plano</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Plano 1 Hora" {...field} />
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
                      <Input type="number" step="0.01" placeholder="5.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>



            {/* Voucher Code Settings */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="comprimentoVoucher"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comprimento do Código</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={6} 
                        max={10} 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>6-10 caracteres</FormDescription>
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
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="digits">Apenas Números</SelectItem>
                        <SelectItem value="letters">Apenas Letras</SelectItem>
                        <SelectItem value="mixed">Números e Letras</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Hidden field - always Limited Online Users */}
              <input type="hidden" {...form.register("tipoLimite")} value="duration" />
              <input type="hidden" {...form.register("omadaLimitType")} value="1" />
            </div>

            {/* Duration and Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel>Duração</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            value={form.watch("durationUnit") === "minutos" ? field.value : 
                                   form.watch("durationUnit") === "horas" ? Math.floor(field.value / 60) :
                                   Math.floor(field.value / (60 * 24))}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              const unit = form.watch("durationUnit") || "horas";
                              const minutes = unit === "minutos" ? value :
                                            unit === "horas" ? value * 60 :
                                            value * 60 * 24;
                              field.onChange(minutes);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationUnit"
                    render={({ field }) => (
                      <FormItem>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Convert current duration to new unit
                            const currentDuration = form.getValues("duration");
                            const currentUnit = field.value || "horas";
                            let minutes = currentDuration;
                            
                            // Convert to minutes first
                            if (currentUnit === "horas") minutes = currentDuration * 60;
                            else if (currentUnit === "dias") minutes = currentDuration * 60 * 24;
                            
                            // Convert to new unit
                            if (value === "horas") form.setValue("duration", Math.floor(minutes / 60));
                            else if (value === "dias") form.setValue("duration", Math.floor(minutes / (60 * 24)));
                            else form.setValue("duration", minutes);
                          }} 
                          defaultValue={field.value || "horas"}
                        >
                          <FormControl>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="minutos">Min</SelectItem>
                            <SelectItem value="horas">Hrs</SelectItem>
                            <SelectItem value="dias">Dias</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

            </div>

            {/* Limit Type and Number Configuration */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="omadaLimitType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Limite</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString() || "1"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Uso Limitado (contagem de usos)</SelectItem>
                        <SelectItem value="1">Usuários Online Limitados (simultâneos)</SelectItem>
                        <SelectItem value="2">Ilimitado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Escolha como controlar o uso dos vouchers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show limit number input only for limited types */}
              {form.watch("omadaLimitType") !== 2 && (
                <FormField
                  control={form.control}
                  name="userLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("omadaLimitType") === 0 
                          ? "Número de Usos Permitidos" 
                          : "Usuários Simultâneos Máximo"
                        }
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={999} 
                          placeholder="1"
                          {...field}
                          value={field.value || 1}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        {form.watch("omadaLimitType") === 0 
                          ? "Quantas vezes este voucher pode ser usado (1-999)" 
                          : "Quantos usuários podem usar este voucher ao mesmo tempo (1-999)"
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Speed Limits */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Limites de Velocidade</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="downLimitEnable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Limite Download</FormLabel>
                          <FormDescription>Ativar limite de download</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {form.watch("downLimitEnable") && (
                    <FormField
                      control={form.control}
                      name="downLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Download (Kbps)" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="upLimitEnable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Limite Upload</FormLabel>
                          <FormDescription>Ativar limite de upload</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {form.watch("upLimitEnable") && (
                    <FormField
                      control={form.control}
                      name="upLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Upload (Kbps)" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Traffic Limits */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="trafficLimitEnable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Limite de Tráfego</FormLabel>
                      <FormDescription>Ativar limite de dados</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {form.watch("trafficLimitEnable") && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="trafficLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite (MB)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1024" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trafficLimitFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequência</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Total</SelectItem>
                            <SelectItem value="1">Diário</SelectItem>
                            <SelectItem value="2">Semanal</SelectItem>
                            <SelectItem value="3">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="printComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentários para Impressão</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Comentários que aparecerão nos vouchers impressos..." {...field} value={field.value || ""} />
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
                disabled={planMutation.isPending}
              >
                {planMutation.isPending 
                  ? (isEdit ? "Atualizando..." : "Criando...") 
                  : (isEdit ? "Atualizar Plano" : "Criar Plano")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}