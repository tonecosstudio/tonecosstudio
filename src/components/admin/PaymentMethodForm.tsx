// @ts-nocheck
/**
 * PaymentMethodForm Component
 *
 * Form for creating and editing payment methods in admin interface.
 *
 * Requirements: 1.1-1.10
 * Task: 11.1 Criar componente PaymentMethodForm
 */

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, CreditCard, Banknote, QrCode, Link, Key, Building } from "lucide-react";
import type { PaymentMethod, PaymentMethodType } from "@/types/manual-payment";
import { createPaymentMethod, updatePaymentMethod } from "@/lib/payment-method-service";

interface PaymentMethodFormProps {
  method?: PaymentMethod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PaymentMethodForm({
  method,
  open,
  onOpenChange,
  onSuccess,
}: PaymentMethodFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!method;

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<PaymentMethodType>("other");
  const [instructions, setInstructions] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [accountDetails, setAccountDetails] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  // Reset form when method changes
  useEffect(() => {
    if (method) {
      setName(method.name);
      setType(method.type);
      setInstructions(method.instructions || "");
      setPaymentLink(method.payment_link || "");
      setPixKey(method.pix_key || "");
      setAccountDetails(
        method.account_details ? JSON.stringify(method.account_details, null, 2) : ""
      );
      setIsActive(method.is_active);
      setIsDefault(method.is_default);
    } else {
      // Reset to defaults for new method
      setName("");
      setType("other");
      setInstructions("");
      setPaymentLink("");
      setPixKey("");
      setAccountDetails("");
      setIsActive(true);
      setIsDefault(false);
    }
  }, [method, open]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: () =>
      createPaymentMethod({
        name,
        type,
        instructions: instructions || undefined,
        payment_link: paymentLink || undefined,
        pix_key: pixKey || undefined,
        account_details: accountDetails ? JSON.parse(accountDetails) : undefined,
        is_active: isActive,
        is_default: isDefault,
      }),
    onSuccess: () => {
      toast({
        title: "Método de pagamento criado",
        description: `O método "${name}" foi criado com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar método de pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: () =>
      updatePaymentMethod(method!.id, {
        name,
        type,
        instructions: instructions || undefined,
        payment_link: paymentLink || undefined,
        pix_key: pixKey || undefined,
        account_details: accountDetails ? JSON.parse(accountDetails) : undefined,
        is_active: isActive,
        is_default: isDefault,
      }),
    onSuccess: () => {
      toast({
        title: "Método de pagamento atualizado",
        description: `O método "${name}" foi atualizado com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar método de pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do método de pagamento.",
        variant: "destructive",
      });
      return;
    }

    if (!type) {
      toast({
        title: "Tipo obrigatório",
        description: "Por favor, selecione o tipo do método de pagamento.",
        variant: "destructive",
      });
      return;
    }

    // Validate type-specific fields
    if (type === "pix" && !pixKey.trim()) {
      toast({
        title: "Chave PIX obrigatória",
        description: "Para métodos PIX, a chave PIX é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    if (type === "bank_transfer" && !accountDetails.trim()) {
      toast({
        title: "Dados bancários obrigatórios",
        description: "Para transferência bancária, os dados bancários são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Parse account details if provided
    if (accountDetails.trim()) {
      try {
        JSON.parse(accountDetails);
      } catch (error) {
        toast({
          title: "Dados bancários inválidos",
          description: "Os dados bancários devem estar em formato JSON válido.",
          variant: "destructive",
        });
        return;
      }
    }

    if (isEditing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  // Get type icon
  const getTypeIcon = (type: PaymentMethodType) => {
    switch (type) {
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

  // Get type label
  const getTypeLabel = (type: PaymentMethodType) => {
    switch (type) {
      case "pix":
        return "PIX";
      case "bank_transfer":
        return "Transferência Bancária";
      case "credit_card":
        return "Cartão de Crédito";
      default:
        return "Outro";
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Método de Pagamento" : "Novo Método de Pagamento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editando: ${method?.name}`
              : "Configure um novo método de pagamento para os clientes."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Informações Básicas</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: PIX, Cartão de Crédito, Boleto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Nome exibido para os clientes</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={type}
                  onValueChange={(value: PaymentMethodType) => setType(value)}
                  disabled={isLoading}
                >
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
                        Transferência Bancária
                      </div>
                    </SelectItem>
                    <SelectItem value="credit_card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cartão de Crédito
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
              <Label htmlFor="instructions">Instruções de Pagamento</Label>
              <Textarea
                id="instructions"
                placeholder="Ex: Faça o PIX para a chave abaixo, pague o boleto em qualquer banco..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Instruções exibidas para os clientes durante o pagamento
              </p>
            </div>
          </div>

          <Separator />

          {/* Type-Specific Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Configurações Específicas</h3>

            {type === "pix" && (
              <div className="space-y-2">
                <Label htmlFor="pix-key">Chave PIX *</Label>
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pix-key"
                    placeholder="Ex: 123.456.789-00, email@exemplo.com, +5511999999999"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Chave PIX (CPF/CNPJ, email, telefone ou chave aleatória)
                </p>
              </div>
            )}

            {type === "bank_transfer" && (
              <div className="space-y-2">
                <Label htmlFor="account-details">Dados Bancários *</Label>
                <Textarea
                  id="account-details"
                  placeholder={`Ex: {
  "bank": "Banco do Brasil",
  "agency": "1234",
  "account": "56789-0",
  "account_type": "corrente",
  "beneficiary": "Nome da Empresa",
  "cnpj": "12.345.678/0001-90"
}`}
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  rows={6}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Dados bancários em formato JSON. Inclua banco, agência, conta, tipo de conta,
                  beneficiário, CNPJ, etc.
                </p>
              </div>
            )}

            {(type === "credit_card" || type === "other") && (
              <div className="space-y-2">
                <Label htmlFor="payment-link">Link de Pagamento</Label>
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="payment-link"
                    placeholder="Ex: https://pagseguro.com/pay/12345"
                    value={paymentLink}
                    onChange={(e) => setPaymentLink(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Link para gateway de pagamento externo (PagSeguro, Mercado Pago, etc.)
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Configurações</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <div className="space-y-0.5">
                  <Label htmlFor="is-active">Ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Método disponível para os clientes
                  </p>
                </div>
                <Switch
                  id="is-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={isLoading}
                  className="mt-1 sm:mt-0"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <div className="space-y-0.5">
                  <Label htmlFor="is-default">Padrão</Label>
                  <p className="text-xs text-muted-foreground">Método selecionado por padrão</p>
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

            <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Nota:</strong> Ao definir um método como padrão, ele será automaticamente
                selecionado para novos pagamentos. Apenas um método pode ser padrão por vez.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Criar Método"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
