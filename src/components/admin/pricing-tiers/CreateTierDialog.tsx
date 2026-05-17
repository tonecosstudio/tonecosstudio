import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateTierWithPlans } from "@/hooks/useCreateTierWithPlans";
import { createTierWithPlansSchema } from "@/lib/validations/pricing-restructure";
import { PriceCalculatorPreview } from "../pricing-restructure/PriceCalculatorPreview";
import type { CreateTierWithPlansInput } from "@/types/pricing-restructure";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface CreateTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog para criar novo nível de preço com planos automáticos
 * Atualizado para usar create_tier_with_plans
 * Requisitos: 1.1, 1.2, 1.3, 1.4, 8.1
 * Tarefa: 8.2
 */
export function CreateTierDialog({ open, onOpenChange }: CreateTierDialogProps) {
  const createTier = useCreateTierWithPlans();
  const [calculatedPricePix, setCalculatedPricePix] = useState<number>(0);

  const form = useForm<CreateTierWithPlansInput>({
    resolver: zodResolver(createTierWithPlansSchema),
    defaultValues: {
      name: "",
      description: "",
      price_full: 0,
      deposit_amount: 0,
      pix_discount_percentage: 5,
      is_default: false,
      display_order: 0,
    },
  });

  // Calcular price_pix em tempo real
  const priceFull = form.watch("price_full");
  const pixDiscount = form.watch("pix_discount_percentage");

  useEffect(() => {
    if (priceFull && pixDiscount !== undefined) {
      const calculated = priceFull * (1 - pixDiscount / 100);
      setCalculatedPricePix(Math.round(calculated * 100) / 100);
    }
  }, [priceFull, pixDiscount]);

  const onSubmit = async (data: CreateTierWithPlansInput) => {
    try {
      const result = await createTier.mutateAsync(data);
      toast.success(`Nível criado com ${result.plans_created} planos automáticos`);
      form.reset();
      onOpenChange(false);
    } catch (_error) {
      toast.error("Erro ao criar nível");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nível de Preço com Planos</DialogTitle>
          <DialogDescription>
            Crie um nível e gere automaticamente planos para todas as modalidades ativas
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Formulário</TabsTrigger>
            <TabsTrigger value="preview">Prévia de Preços</TabsTrigger>
          </TabsList>

          <TabsContent value="form">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Nível</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Nível Intermediário" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva este nível de preço..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price_full"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Cheio (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deposit_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor de Entrada (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="pix_discount_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto PIX (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="5.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Preço PIX calculado: {formatCurrency(calculatedPricePix)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Nível Padrão</FormLabel>
                        <FormDescription>
                          Novas coleções receberão automaticamente este nível
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createTier.isPending}>
                    {createTier.isPending ? "Criando..." : "Criar Nível com Planos"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="preview">
            <PriceCalculatorPreview
              tierPrice={form.watch("price_full")}
              pixDiscountPercentage={form.watch("pix_discount_percentage")}
              depositAmount={form.watch("deposit_amount")}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
