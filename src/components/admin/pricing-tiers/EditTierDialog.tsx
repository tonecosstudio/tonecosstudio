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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useUpdatePricingTier } from "@/hooks/usePricingTiers";
import { updatePricingTierSchema } from "@/lib/validations/pricing-tiers";
import type { PricingTierWithStats, UpdatePricingTierInput } from "@/types/pricing-tiers";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface EditTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: PricingTierWithStats | null;
  onClose: () => void;
}

/**
 * Dialog para editar nível de preço existente
 * Requisitos: 1.6, 1.7
 */
export function EditTierDialog({
  open,
  onOpenChange,
  tier,
  onClose,
}: EditTierDialogProps) {
  const updateTier = useUpdatePricingTier();
  const [calculatedPricePix, setCalculatedPricePix] = useState<number>(0);
  const [priceWillChange, setPriceWillChange] = useState(false);

  const form = useForm<UpdatePricingTierInput>({
    resolver: zodResolver(updatePricingTierSchema),
    defaultValues: {
      name: "",
      description: "",
      price_full: 0,
      deposit_amount: 0,
      pix_discount_percentage: 5,
      is_active: true,
      is_default: false,
    },
  });

  // Pré-preencher formulário quando tier mudar
  useEffect(() => {
    if (tier) {
      form.reset({
        name: tier.name,
        description: tier.description || "",
        price_full: tier.price_full,
        deposit_amount: tier.deposit_amount,
        pix_discount_percentage: tier.pix_discount_percentage,
        is_active: tier.is_active,
        is_default: tier.is_default,
      });
    }
  }, [tier, form]);

  // Calcular price_pix em tempo real
  const priceFull = form.watch("price_full");
  const pixDiscount = form.watch("pix_discount_percentage");

  useEffect(() => {
    if (priceFull && pixDiscount !== undefined) {
      const calculated = priceFull * (1 - pixDiscount / 100);
      setCalculatedPricePix(Math.round(calculated * 100) / 100);
    }
  }, [priceFull, pixDiscount]);

  // Verificar se preços mudaram
  useEffect(() => {
    if (tier && priceFull && pixDiscount !== undefined) {
      const priceChanged =
        priceFull !== tier.price_full ||
        pixDiscount !== tier.pix_discount_percentage;
      setPriceWillChange(priceChanged);
    }
  }, [tier, priceFull, pixDiscount]);

  const onSubmit = async (data: UpdatePricingTierInput) => {
    if (!tier) return;

    try {
      await updateTier.mutateAsync({ tierId: tier.id, input: data });
      toast.success("Nível atualizado com sucesso");
      onClose();
    } catch (_error) {
      toast.error("Erro ao atualizar nível");
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!tier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Nível de Preço</DialogTitle>
          <DialogDescription>
            Atualize as informações do nível "{tier.name}"
          </DialogDescription>
        </DialogHeader>

        {priceWillChange && tier.collections_count && tier.collections_count > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ao alterar os preços, as mudanças serão propagadas automaticamente
              para {tier.collections_count} coleção(ões) atribuída(s) a este nível.
            </AlertDescription>
          </Alert>
        )}

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
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Ativo</FormLabel>
                    <FormDescription>
                      Níveis inativos não podem receber novas atribuições
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={tier.is_default}
                    />
                  </FormControl>
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
                onClick={handleClose}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateTier.isPending}>
                {updateTier.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
