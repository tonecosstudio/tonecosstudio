import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Tag, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PricingTier {
  id: string;
  name: string;
  description?: string;
  price_full: number;
  deposit_amount: number;
  price_pix: number;
  pix_discount_percentage: number;
  is_default: boolean;
  collections_count?: number;
}

interface TierQueryRow extends Omit<PricingTier, "collections_count"> {
  collections?: Array<{ count: number }> | null;
}

export function CollectionPricingManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceFull, setPriceFull] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [pixDiscount, setPixDiscount] = useState(5);

  // Fetch pricing tiers
  const { data: tiers, isLoading } = useQuery({
    queryKey: ["pricing-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_tiers")
        .select(`
          *,
          collections:collection_tier_assignments(count)
        `)
        .order("price_full", { ascending: true });

      if (error) throw error;

      return (data as TierQueryRow[]).map((tier) => ({
        ...tier,
        collections_count: tier.collections?.[0]?.count || 0
      }));
    },
  });

  // Calculate PIX price
  const pricePix = priceFull * (1 - pixDiscount / 100);

  // Save tier mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const tierData = {
        name,
        description,
        price_full: priceFull,
        deposit_amount: depositAmount,
        price_pix: pricePix,
        pix_discount_percentage: pixDiscount,
        is_default: false,
      };

      if (editingTier) {
        const { error } = await supabase
          .from("pricing_tiers")
          .update(tierData)
          .eq("id", editingTier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pricing_tiers")
          .insert([tierData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: editingTier ? "Nível atualizado!" : "Nível criado!",
        description: "As alterações foram salvas com sucesso.",
      });
      handleCloseDialog();
      qc.invalidateQueries({ queryKey: ["pricing-tiers"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro ao salvar",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Delete tier mutation
  const deleteMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const { error } = await supabase
        .from("pricing_tiers")
        .delete()
        .eq("id", tierId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Nível excluído!",
        description: "O nível de preço foi removido.",
      });
      qc.invalidateQueries({ queryKey: ["pricing-tiers"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro ao excluir",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (tier?: PricingTier) => {
    if (tier) {
      setEditingTier(tier);
      setName(tier.name);
      setDescription(tier.description || "");
      setPriceFull(tier.price_full);
      setDepositAmount(tier.deposit_amount);
      setPixDiscount(tier.pix_discount_percentage);
    } else {
      setEditingTier(null);
      setName("");
      setDescription("");
      setPriceFull(0);
      setDepositAmount(0);
      setPixDiscount(5);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTier(null);
  };

  const handleDelete = (tier: PricingTier) => {
    if (tier.collections_count && tier.collections_count > 0) {
      toast({
        title: "Não é possível excluir",
        description: `Este nível está atribuído a ${tier.collections_count} coleção(ões).`,
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o nível "${tier.name}"?`)) {
      deleteMutation.mutate(tier.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Níveis de Preço para Coleções</h2>
          <p className="text-muted-foreground mt-1">
            Configure níveis de preço reutilizáveis para atribuir às coleções
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          Criar Nível
        </Button>
      </div>

      {/* Tiers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Níveis Cadastrados</CardTitle>
          <CardDescription>
            Gerencie os níveis de preço disponíveis para as coleções
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : tiers && tiers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço Cheio</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Preço PIX</TableHead>
                    <TableHead>Desconto PIX</TableHead>
                    <TableHead className="text-center">Coleções</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((tier) => (
                    <TableRow key={tier.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{tier.name}</div>
                            {tier.description && (
                              <div className="text-xs text-muted-foreground">
                                {tier.description}
                              </div>
                            )}
                          </div>
                          {tier.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          R$ {tier.price_full.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          R$ {tier.deposit_amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-green-600">
                          R$ {tier.price_pix.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tier.pix_discount_percentage}%</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          <Package className="h-3 w-3 mr-1" />
                          {tier.collections_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(tier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tier)}
                            disabled={tier.collections_count > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhum nível de preço cadastrado
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Nível
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTier ? "Editar Nível de Preço" : "Criar Nível de Preço"}
            </DialogTitle>
            <DialogDescription>
              Configure os valores para este nível de preço
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Nome e Descrição */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome do Nível *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Premium, Standard, Básico"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional do nível"
                />
              </div>
            </div>

            <div className="border-t my-4" />

            {/* Preços */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price-full">Preço Cheio (R$) *</Label>
                <Input
                  id="price-full"
                  type="number"
                  step="0.01"
                  value={priceFull}
                  onChange={(e) => setPriceFull(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit">Valor de Entrada (R$) *</Label>
                <Input
                  id="deposit"
                  type="number"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="border-t my-4" />

            {/* Desconto PIX */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pix-discount">Desconto PIX (%)</Label>
                <Input
                  id="pix-discount"
                  type="number"
                  step="0.1"
                  value={pixDiscount}
                  onChange={(e) => setPixDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="5"
                />
              </div>

              {/* Preview */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="text-sm font-semibold mb-3">Preview dos Valores:</div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Preço Cheio</div>
                      <div className="text-lg font-bold">
                        R$ {priceFull.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Entrada</div>
                      <div className="text-lg font-bold">
                        R$ {depositAmount.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Preço PIX</div>
                      <div className="text-lg font-bold text-green-600">
                        R$ {pricePix.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ({pixDiscount}% desconto)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!name || priceFull <= 0 || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : editingTier ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
