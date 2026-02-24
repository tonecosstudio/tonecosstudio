import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { groupService } from "@/lib/services/groupService";
import { supabase } from "@/integrations/supabase/client";
import type { GroupType, CreateGroupInput } from "@/types/groups";
import { toast } from "sonner";

// =====================================================
// Validation Schema
// =====================================================

const createGroupSchema = z.object({
  name: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  type: z.enum(["manual", "assinantes", "colecao", "lancamentos", "pedidos"], {
    required_error: "Selecione um tipo de grupo",
  }),
  // Conditional fields
  subscriptionCollectionId: z.string().optional(),
  subscriptionPlan: z.string().optional(),
  collectionId: z.string().optional(),
  launchCriteria: z.enum(["all_users", "previous_buyers"]).optional(),
  orderStatuses: z.array(z.string()).optional(),
  orderDateFrom: z.string().optional(),
  orderDateTo: z.string().optional(),
});

type CreateGroupFormData = z.infer<typeof createGroupSchema>;

// =====================================================
// Component Props
// =====================================================

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// =====================================================
// Main Component
// =====================================================

/**
 * CreateGroupModal - Modal for creating new broadcast groups
 *
 * Features:
 * - Form validation with Zod
 * - Conditional fields based on group type
 * - Collection selection for assinantes/colecao types
 * - Order status selection for pedidos type
 * - Date range selection for pedidos type
 */
export function CreateGroupModal({ open, onOpenChange, onSuccess }: CreateGroupModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      type: undefined,
      subscriptionCollectionId: "",
      subscriptionPlan: "",
      collectionId: "",
      launchCriteria: undefined,
      orderStatuses: [],
      orderDateFrom: "",
      orderDateTo: "",
    },
  });

  const selectedType = form.watch("type");

  // Fetch collections when needed
  const { data: collections = [] } = useQuery({
    queryKey: ["collections-for-groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("id, name").order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: selectedType === "assinantes" || selectedType === "colecao",
  });

  // Reset conditional fields when type changes
  useEffect(() => {
    form.setValue("subscriptionCollectionId", "");
    form.setValue("subscriptionPlan", "");
    form.setValue("collectionId", "");
    form.setValue("launchCriteria", undefined);
    form.setValue("orderStatuses", []);
    form.setValue("orderDateFrom", "");
    form.setValue("orderDateTo", "");
  }, [selectedType, form]);

  const onSubmit = async (data: CreateGroupFormData) => {
    setIsSubmitting(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Build membership criteria based on type
      let membershipCriteria = null;

      if (data.type === "assinantes") {
        membershipCriteria = {
          type: "assinantes" as const,
          subscriptionStatus: "active" as const,
          ...(data.subscriptionCollectionId && {
            collectionId: data.subscriptionCollectionId,
          }),
          ...(data.subscriptionPlan && { plan: data.subscriptionPlan }),
        };
      } else if (data.type === "colecao") {
        if (!data.collectionId) {
          throw new Error("Selecione uma coleção");
        }
        membershipCriteria = {
          type: "colecao" as const,
          collectionId: data.collectionId,
        };
      } else if (data.type === "lancamentos") {
        if (!data.launchCriteria) {
          throw new Error("Selecione um critério de lançamento");
        }
        membershipCriteria = {
          type: "lancamentos" as const,
          criteria: data.launchCriteria,
        };
      } else if (data.type === "pedidos") {
        membershipCriteria = {
          type: "pedidos" as const,
          ...(data.orderStatuses &&
            data.orderStatuses.length > 0 && { status: data.orderStatuses }),
          ...(data.orderDateFrom && { dateFrom: data.orderDateFrom }),
          ...(data.orderDateTo && { dateTo: data.orderDateTo }),
        };
      }

      const input: CreateGroupInput = {
        name: data.name,
        type: data.type,
        membership_criteria: membershipCriteria,
        created_by: user.id,
      };

      await groupService.createGroup(input);

      toast.success("Grupo criado com sucesso");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar grupo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Grupo</DialogTitle>
          <DialogDescription>
            Crie um grupo para enviar mensagens broadcast para segmentos de clientes
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Group Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Grupo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Assinantes Premium 2024" {...field} />
                  </FormControl>
                  <FormDescription>Entre 3 e 100 caracteres</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Group Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Grupo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="assinantes">Assinantes</SelectItem>
                      <SelectItem value="colecao">Coleção</SelectItem>
                      <SelectItem value="lancamentos">Lançamentos</SelectItem>
                      <SelectItem value="pedidos">Pedidos</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Define como os membros são adicionados ao grupo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional Fields - Assinantes */}
            {selectedType === "assinantes" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium text-sm">Filtros de Assinantes</h3>

                <FormField
                  control={form.control}
                  name="subscriptionCollectionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coleção (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas as coleções" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {collections.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Filtrar por coleção específica</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subscriptionPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plano (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: premium, basic" {...field} />
                      </FormControl>
                      <FormDescription>Filtrar por plano específico</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Conditional Fields - Coleção */}
            {selectedType === "colecao" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium text-sm">Seleção de Coleção</h3>

                <FormField
                  control={form.control}
                  name="collectionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coleção *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma coleção" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {collections.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Grupo incluirá assinantes desta coleção</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Conditional Fields - Lançamentos */}
            {selectedType === "lancamentos" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium text-sm">Critério de Lançamento</h3>

                <FormField
                  control={form.control}
                  name="launchCriteria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Critério *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o critério" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all_users">Todos os usuários</SelectItem>
                          <SelectItem value="previous_buyers">Compradores anteriores</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Define quem receberá notificações de lançamento
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Conditional Fields - Pedidos */}
            {selectedType === "pedidos" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium text-sm">Filtros de Pedidos</h3>

                <FormField
                  control={form.control}
                  name="orderStatuses"
                  render={() => (
                    <FormItem>
                      <FormLabel>Status dos Pedidos</FormLabel>
                      <div className="space-y-2">
                        {[
                          { value: "pending", label: "Pendente" },
                          { value: "processing", label: "Processando" },
                          { value: "shipped", label: "Enviado" },
                          { value: "delivered", label: "Entregue" },
                        ].map((status) => (
                          <FormField
                            key={status.value}
                            control={form.control}
                            name="orderStatuses"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(status.value)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, status.value]);
                                      } else {
                                        field.onChange(current.filter((s) => s !== status.value));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {status.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormDescription>Selecione os status de pedidos a incluir</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="orderDateFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Inicial</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>Pedidos a partir de</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="orderDateTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Final</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>Pedidos até</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Grupo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
