// @ts-nocheck
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { groupService } from "@/lib/services/groupService";
import type { GroupType, CreateGroupInput } from "@/types/groups";
import { supabase } from "@/integrations/supabase/client";

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
import { Loader2 } from "lucide-react";

// Schema de validação
const createGroupSchema = z.object({
  name: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  type: z.enum(["manual", "assinantes", "colecao", "lancamentos", "pedidos"], {
    required_error: "Selecione um tipo de grupo",
  }),
  // Campos condicionais para assinantes
  subscriptionCollectionId: z.string().optional(),
  subscriptionPlan: z.string().optional(),
  // Campo para coleção
  collectionId: z.string().optional(),
  // Campo para lançamentos
  launchCriteria: z.enum(["all_users", "previous_buyers"]).optional(),
  // Campos para pedidos
  orderStatuses: z.array(z.string()).optional(),
  orderDateFrom: z.string().optional(),
  orderDateTo: z.string().optional(),
});

type CreateGroupFormData = z.infer<typeof createGroupSchema>;

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateGroupModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateGroupModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);

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

  // Carregar coleções quando o tipo for "assinantes" ou "colecao"
  const loadCollections = async () => {
    if (collections.length > 0) return; // Já carregou

    setLoadingCollections(true);
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error("Erro ao carregar coleções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as coleções",
        variant: "destructive",
      });
    } finally {
      setLoadingCollections(false);
    }
  };

  // Carregar coleções quando necessário
  if ((selectedType === "assinantes" || selectedType === "colecao") && collections.length === 0 && !loadingCollections) {
    loadCollections();
  }

  const onSubmit = async (data: CreateGroupFormData) => {
    setIsLoading(true);

    try {
      // Obter ID do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Validar coleção existe (para tipo coleção)
      if (data.type === "colecao" && data.collectionId) {
        const { data: collection, error } = await supabase
          .from("collections")
          .select("id")
          .eq("id", data.collectionId)
          .single();

        if (error || !collection) {
          throw new Error("Coleção selecionada não existe");
        }
      }

      // Construir membership_criteria baseado no tipo
      let membershipCriteria = null;

      if (data.type === "assinantes") {
        membershipCriteria = {
          type: "assinantes",
          subscriptionStatus: "active",
          ...(data.subscriptionCollectionId && { collectionId: data.subscriptionCollectionId }),
          ...(data.subscriptionPlan && { plan: data.subscriptionPlan }),
        };
      } else if (data.type === "colecao") {
        if (!data.collectionId) {
          throw new Error("Selecione uma coleção");
        }
        membershipCriteria = {
          type: "colecao",
          collectionId: data.collectionId,
        };
      } else if (data.type === "lancamentos") {
        if (!data.launchCriteria) {
          throw new Error("Selecione um critério de lançamento");
        }
        membershipCriteria = {
          type: "lancamentos",
          criteria: data.launchCriteria,
        };
      } else if (data.type === "pedidos") {
        membershipCriteria = {
          type: "pedidos",
          ...(data.orderStatuses && data.orderStatuses.length > 0 && { status: data.orderStatuses }),
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

      toast({
        title: "Sucesso",
        description: "Grupo criado com sucesso",
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar grupo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Grupo</DialogTitle>
          <DialogDescription>
            Crie um grupo para enviar mensagens broadcast para clientes
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Nome do Grupo */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Grupo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Assinantes Premium 2024"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Entre 3 e 100 caracteres
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Grupo */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Grupo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
                  <FormDescription>
                    Define como os membros são adicionados ao grupo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Inputs Condicionais - Assinantes */}
            {selectedType === "assinantes" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium">Filtros de Assinantes</h3>

                <FormField
                  control={form.control}
                  name="subscriptionCollectionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coleção (Opcional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value || undefined)}
                        value={field.value || undefined}
                      >
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
                      <FormDescription>
                        Filtrar por coleção específica (deixe vazio para todas)
                      </FormDescription>
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
                        <Input
                          placeholder="Ex: premium, basic"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Filtrar por plano específico
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Inputs Condicionais - Coleção */}
            {selectedType === "colecao" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium">Seleção de Coleção</h3>

                <FormField
                  control={form.control}
                  name="collectionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coleção *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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
                      <FormDescription>
                        Grupo incluirá assinantes desta coleção
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Inputs Condicionais - Lançamentos */}
            {selectedType === "lancamentos" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium">Critério de Lançamento</h3>

                <FormField
                  control={form.control}
                  name="launchCriteria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Critério *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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

            {/* Inputs Condicionais - Pedidos */}
            {selectedType === "pedidos" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium">Filtros de Pedidos</h3>

                <FormField
                  control={form.control}
                  name="orderStatuses"
                  render={() => (
                    <FormItem>
                      <FormLabel>Status dos Pedidos</FormLabel>
                      <div className="space-y-2">
                        {["pending", "processing", "shipped", "delivered"].map((status) => (
                          <FormField
                            key={status}
                            control={form.control}
                            name="orderStatuses"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(status)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, status]);
                                      } else {
                                        field.onChange(current.filter((s) => s !== status));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {status === "pending" && "Pendente"}
                                  {status === "processing" && "Processando"}
                                  {status === "shipped" && "Enviado"}
                                  {status === "delivered" && "Entregue"}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormDescription>
                        Selecione os status de pedidos a incluir
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orderDateFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Inicial (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Pedidos a partir desta data
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orderDateTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Final (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Pedidos até esta data
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
                Criar Grupo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
