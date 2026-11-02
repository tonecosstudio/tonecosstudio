import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateGroupActions, useGroupCollections } from "@/hooks/groups/useCreateGroupActions";

const createGroupSchema = z.object({
  name: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome deve ter no maximo 100 caracteres"),
  type: z.enum(["manual", "assinantes", "colecao", "lancamentos", "pedidos"], {
    error: "Selecione um tipo de grupo",
  }),
  subscriptionCollectionId: z.string().optional(),
  subscriptionPlan: z.string().optional(),
  collectionId: z.string().optional(),
  launchCriteria: z.enum(["all_users", "previous_buyers"]).optional(),
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

export function CreateGroupModal({ open, onOpenChange, onSuccess }: CreateGroupModalProps) {
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
  const { data: collections = [] } = useGroupCollections(selectedType);
  const { createGroup, isCreating } = useCreateGroupActions({
    onSuccess: () => {
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
  });

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
    try {
      await createGroup(data);
    } catch {
      // Error feedback is handled by the hook.
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
                      <SelectItem value="colecao">Colecao</SelectItem>
                      <SelectItem value="lancamentos">Lancamentos</SelectItem>
                      <SelectItem value="pedidos">Pedidos</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Define como os membros sao adicionados ao grupo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType === "assinantes" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium text-sm">Filtros de Assinantes</h3>

                <FormField
                  control={form.control}
                  name="subscriptionCollectionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colecao (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas as colecoes" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {collections.map((collection) => (
                            <SelectItem key={collection.id} value={collection.id}>
                              {collection.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Filtrar por colecao especifica</FormDescription>
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
                      <FormDescription>Filtrar por plano especifico</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {selectedType === "colecao" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium text-sm">Selecao de Colecao</h3>

                <FormField
                  control={form.control}
                  name="collectionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colecao *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma colecao" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {collections.map((collection) => (
                            <SelectItem key={collection.id} value={collection.id}>
                              {collection.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Grupo incluira assinantes desta colecao</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {selectedType === "lancamentos" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium text-sm">Criterio de Lancamento</h3>

                <FormField
                  control={form.control}
                  name="launchCriteria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Criterio *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o criterio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all_users">Todos os usuarios</SelectItem>
                          <SelectItem value="previous_buyers">Compradores anteriores</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Define quem recebera notificacoes de lancamento
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
                                      field.onChange(
                                        checked
                                          ? [...current, status.value]
                                          : current.filter((value) => value !== status.value),
                                      );
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
                        <FormDescription>Pedidos ate</FormDescription>
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
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Grupo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
