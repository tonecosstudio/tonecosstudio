import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Tag, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useCollectionPricingTiers,
  useDeleteCollectionPricingTier,
  useSaveCollectionPricingTier,
} from "@/hooks/admin/useCollectionPricingManager";

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

export function CollectionPricingManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceFull, setPriceFull] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [pixDiscount, setPixDiscount] = useState(5);

  const { data: tiers, isLoading } = useCollectionPricingTiers();
  const saveMutation = useSaveCollectionPricingTier();
  const deleteMutation = useDeleteCollectionPricingTier();

  const pricePix = priceFull * (1 - pixDiscount / 100);

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

  const handleSave = () => {
    saveMutation.mutate(
      {
        id: editingTier?.id,
        name,
        description,
        price_full: priceFull,
        deposit_amount: depositAmount,
        price_pix: pricePix,
        pix_discount_percentage: pixDiscount,
      },
      {
        onSuccess: () => {
          toast({
            title: editingTier ? "Nivel atualizado!" : "Nivel criado!",
            description: "As alteracoes foram salvas com sucesso.",
          });
          handleCloseDialog();
        },
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : "Erro desconhecido";
          toast({ title: "Erro ao salvar", description: message, variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (tier: PricingTier) => {
    if (tier.collections_count && tier.collections_count > 0) {
      toast({
        title: "Nao e possivel excluir",
        description: `Este nivel esta atribuido a ${tier.collections_count} colecao(oes).`,
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o nivel "${tier.name}"?`)) return;
    deleteMutation.mutate(tier.id, {
      onSuccess: () => toast({ title: "Nivel excluido!", description: "O nivel de preco foi removido." }),
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        toast({ title: "Erro ao excluir", description: message, variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Niveis de Preco para Colecoes</h2>
          <p className="text-muted-foreground mt-1">Configure niveis de preco reutilizaveis para atribuir as colecoes</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          Criar Nivel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Niveis Cadastrados</CardTitle>
          <CardDescription>Gerencie os niveis de preco disponiveis para as colecoes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : tiers && tiers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preco Cheio</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Preco PIX</TableHead>
                    <TableHead>Desconto PIX</TableHead>
                    <TableHead className="text-center">Colecoes</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
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
                            {tier.description && <div className="text-xs text-muted-foreground">{tier.description}</div>}
                          </div>
                          {tier.is_default && <Badge variant="secondary" className="text-xs">Padrao</Badge>}
                        </div>
                      </TableCell>
                      <TableCell><span className="font-mono">R$ {tier.price_full.toFixed(2)}</span></TableCell>
                      <TableCell><span className="font-mono">R$ {tier.deposit_amount.toFixed(2)}</span></TableCell>
                      <TableCell><span className="font-mono text-green-600">R$ {tier.price_pix.toFixed(2)}</span></TableCell>
                      <TableCell><Badge variant="outline">{tier.pix_discount_percentage}%</Badge></TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary"><Package className="h-3 w-3 mr-1" />{tier.collections_count || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(tier)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(tier)} disabled={(tier.collections_count || 0) > 0}>
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
              <p className="text-muted-foreground mb-4">Nenhum nivel de preco cadastrado</p>
              <Button onClick={() => handleOpenDialog()}><Plus className="h-4 w-4 mr-2" />Criar Primeiro Nivel</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTier ? "Editar Nivel de Preco" : "Criar Nivel de Preco"}</DialogTitle>
            <DialogDescription>Configure os valores para este nivel de preco</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome do Nivel *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Premium" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descricao</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descricao opcional do nivel" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price-full">Preco Cheio (R$) *</Label>
                <Input id="price-full" type="number" step="0.01" value={priceFull} onChange={(e) => setPriceFull(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit">Valor de Entrada (R$) *</Label>
                <Input id="deposit" type="number" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pix-discount">Desconto PIX (%)</Label>
              <Input id="pix-discount" type="number" step="0.1" value={pixDiscount} onChange={(e) => setPixDiscount(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name || priceFull <= 0 || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : editingTier ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
