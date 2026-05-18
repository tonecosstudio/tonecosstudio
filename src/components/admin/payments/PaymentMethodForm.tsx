/**
 * PaymentMethodForm Component
 *
 * Form for creating and editing payment methods in admin interface.
 */

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CreditCard, Banknote, QrCode, Link, Key, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import type { PaymentMethod, PaymentMethodType } from "@/types/manual-payment";
import { createPaymentMethod, updatePaymentMethod } from "@/lib/payment-method-service";
import {
  buildPaymentMethodPayload,
  getInitialPaymentMethodFormState,
  validatePaymentMethodForm,
} from "@/lib/payment-method-form";

interface PaymentMethodFormProps {
  method?: PaymentMethod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PaymentMethodForm({ method, open, onOpenChange, onSuccess }: PaymentMethodFormProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(method);

  const [name, setName] = useState("");
  const [type, setType] = useState<PaymentMethodType>("other");
  const [instructions, setInstructions] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [accountDetails, setAccountDetails] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    const initialState = getInitialPaymentMethodFormState(method);
    setName(initialState.name);
    setType(initialState.type);
    setInstructions(initialState.instructions);
    setPaymentLink(initialState.paymentLink);
    setPixKey(initialState.pixKey);
    setAccountDetails(initialState.accountDetails);
    setIsActive(initialState.isActive);
    setIsDefault(initialState.isDefault);
  }, [method, open]);

  const formState = {
    name,
    type,
    instructions,
    paymentLink,
    pixKey,
    accountDetails,
    isActive,
    isDefault,
  };

  const createMutation = useMutation({
    mutationFn: () => createPaymentMethod(buildPaymentMethodPayload(formState)),
    onSuccess: () => {
      toast({
        title: "Metodo de pagamento criado",
        description: `O metodo "${name}" foi criado com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar metodo de pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updatePaymentMethod(method!.id, buildPaymentMethodPayload(formState)),
    onSuccess: () => {
      toast({
        title: "Metodo de pagamento atualizado",
        description: `O metodo "${name}" foi atualizado com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar metodo de pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validatePaymentMethodForm(formState);
    if (validationError) {
      toast({
        title: validationError.title,
        description: validationError.description,
        variant: "destructive",
      });
      return;
    }

    if (isEditing) {
      updateMutation.mutate();
      return;
    }

    createMutation.mutate();
  };

  const getTypeIcon = (paymentType: PaymentMethodType) => {
    switch (paymentType) {
      case "pix":
        return <QrCode className="h-4 w-4" />;
      case "bank_transfer":
        return <Building className="h-4 w-4" />;
      case "credit_card":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Banknote className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (paymentType: PaymentMethodType) => {
    switch (paymentType) {
      case "pix":
        return "PIX";
      case "bank_transfer":
        return "Transferencia Bancaria";
      case "credit_card":
        return "Cartao de Credito";
      default:
        return "Outro";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Metodo de Pagamento" : "Novo Metodo de Pagamento"}</DialogTitle>
          <DialogDescription>
            {isEditing ? `Editando: ${method?.name}` : "Configure um novo metodo de pagamento para os clientes."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Informacoes Basicas</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: PIX, Cartao de Credito, Boleto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Nome exibido para os clientes</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select value={type} onValueChange={(value: PaymentMethodType) => setType(value)} disabled={isLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(type)}
                        {getTypeLabel(type)}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        PIX
                      </div>
                    </SelectItem>
                    <SelectItem value="bank_transfer">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Transferencia Bancaria
                      </div>
                    </SelectItem>
                    <SelectItem value="credit_card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cartao de Credito
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Outro
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instrucoes de Pagamento</Label>
              <Textarea
                id="instructions"
                placeholder="Ex: Faca o PIX para a chave abaixo..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Instrucoes exibidas para os clientes durante o pagamento</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Configuracoes Especificas</h3>

            {type === "pix" && (
              <div className="space-y-2">
                <Label htmlFor="pix-key">Chave PIX *</Label>
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pix-key"
                    placeholder="Ex: email@exemplo.com"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {type === "bank_transfer" && (
              <div className="space-y-2">
                <Label htmlFor="account-details">Dados Bancarios *</Label>
                <Textarea
                  id="account-details"
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  rows={6}
                  disabled={isLoading}
                  placeholder='Ex: { "bank": "Banco do Brasil", "agency": "1234", "account": "56789-0" }'
                />
              </div>
            )}

            {(type === "credit_card" || type === "other") && (
              <div className="space-y-2">
                <Label htmlFor="payment-link">Link de Pagamento</Label>
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="payment-link"
                    placeholder="Ex: https://gateway/pagamento/123"
                    value={paymentLink}
                    onChange={(e) => setPaymentLink(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Configuracoes</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-0">
                <div className="space-y-0.5">
                  <Label htmlFor="is-active">Ativo</Label>
                  <p className="text-xs text-muted-foreground">Metodo disponivel para os clientes</p>
                </div>
                <Switch
                  id="is-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={isLoading}
                  className="mt-1 sm:mt-0"
                />
              </div>

              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-0">
                <div className="space-y-0.5">
                  <Label htmlFor="is-default">Padrao</Label>
                  <p className="text-xs text-muted-foreground">Metodo selecionado por padrao</p>
                </div>
                <Switch
                  id="is-default"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                  disabled={isLoading}
                  className="mt-1 sm:mt-0"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar Alteracoes" : "Criar Metodo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
