// @ts-nocheck
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FranchiseRow = {
  id: string;
  canonical: string;
  aliases: string[];
  created_at: string;
};

type FranchiseRuleRow = {
  id: string;
  pattern: string;
  franchise_canonical: string;
  enabled: boolean;
  priority: number;
  note: string | null;
  created_at: string;
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Componente interno sem layout (para uso em AdminModelsAndFranchises)
export function AdminFranchisesContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [newFranchise, setNewFranchise] = useState({ canonical: "", aliases: "" });
  const [newRule, setNewRule] = useState({ pattern: "", franchise: "", note: "" });
  const [editingFranchise, setEditingFranchise] = useState<FranchiseRow | null>(null);
  const [editForm, setEditForm] = useState({ canonical: "", aliases: "" });

  const franchisesQuery = useQuery({
    queryKey: ["admin-franchises", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("franchises")
        .select("id,canonical,aliases,created_at")
        .order("canonical", { ascending: true });

      if (searchTerm.trim()) {
        query = query.ilike("canonical", `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as FranchiseRow[];
    },
  });

  const rulesQuery = useQuery({
    queryKey: ["admin-franchise-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("franchise_rules")
        .select("id,pattern,franchise_canonical,enabled,priority,note,created_at")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as FranchiseRuleRow[];
    },
  });

  const addFranchise = async () => {
    if (!newFranchise.canonical.trim()) {
      toast({ title: "Nome obrigatório", description: "Digite o nome canônico da franquia." });
      return;
    }

    try {
      const aliases = newFranchise.aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const { error } = await supabase.from("franchises").insert({
        canonical: newFranchise.canonical.trim(),
        aliases: aliases.length > 0 ? aliases : [],
      });

      if (error) throw error;

      toast({ title: "Adicionada", description: "Franquia criada com sucesso." });
      setNewFranchise({ canonical: "", aliases: "" });
      qc.invalidateQueries({ queryKey: ["admin-franchises"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao adicionar", description: msg, variant: "destructive" });
    }
  };

  const deleteFranchise = async (id: string) => {
    try {
      const { error } = await supabase.from("franchises").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Deletada", description: "Franquia removida." });
      qc.invalidateQueries({ queryKey: ["admin-franchises"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao deletar", description: msg, variant: "destructive" });
    }
  };

  const openEditDialog = (franchise: FranchiseRow) => {
    setEditingFranchise(franchise);
    setEditForm({
      canonical: franchise.canonical,
      aliases: franchise.aliases.join(", "),
    });
  };

  const saveEdit = async () => {
    if (!editingFranchise) return;

    try {
      const aliases = editForm.aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from("franchises")
        .update({
          canonical: editForm.canonical.trim(),
          aliases: aliases.length > 0 ? aliases : [],
        })
        .eq("id", editingFranchise.id);

      if (error) throw error;

      toast({ title: "Atualizada", description: "Franquia editada com sucesso." });
      setEditingFranchise(null);
      qc.invalidateQueries({ queryKey: ["admin-franchises"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao editar", description: msg, variant: "destructive" });
    }
  };

  const addRule = async () => {
    if (!newRule.pattern.trim() || !newRule.franchise.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha padrão e franquia." });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("franchise_rules").insert({
        pattern: newRule.pattern.trim(),
        franchise_canonical: newRule.franchise.trim(),
        note: newRule.note.trim() || null,
        created_by: userData.user.id,
      });

      if (error) throw error;

      toast({ title: "Regra criada", description: "Regra automática adicionada." });
      setNewRule({ pattern: "", franchise: "", note: "" });
      qc.invalidateQueries({ queryKey: ["admin-franchise-rules"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao criar regra", description: msg, variant: "destructive" });
    }
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("franchise_rules")
        .update({ enabled: !enabled })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Atualizada", description: `Regra ${!enabled ? "ativada" : "desativada"}.` });
      qc.invalidateQueries({ queryKey: ["admin-franchise-rules"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha", description: msg, variant: "destructive" });
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase.from("franchise_rules").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Deletada", description: "Regra removida." });
      qc.invalidateQueries({ queryKey: ["admin-franchise-rules"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao deletar", description: msg, variant: "destructive" });
    }
  };

  const franchises = franchisesQuery.data ?? [];
  const rules = rulesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="mb-12">
        <div className="h-px w-20 bg-foreground mb-6" />
        <h1 className="text-5xl font-bold tracking-tight mb-4">Gerenciar Franquias</h1>
        <p className="text-lg text-muted-foreground">
          Controle as franquias canônicas e regras automáticas de classificação.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Franquias Canônicas */}
        <div className="space-y-6">
          <Card className="border border-border bg-card shadow-premium">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xl font-semibold">Adicionar Franquia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-2">
                <Label htmlFor="new-canonical">Nome Canônico</Label>
                <Input
                  id="new-canonical"
                  value={newFranchise.canonical}
                  onChange={(e) => setNewFranchise({ ...newFranchise, canonical: e.target.value })}
                  placeholder="Ex: X-Men"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-aliases">Aliases (separados por vírgula)</Label>
                <Textarea
                  id="new-aliases"
                  value={newFranchise.aliases}
                  onChange={(e) => setNewFranchise({ ...newFranchise, aliases: e.target.value })}
                  placeholder="Ex: X Men, Xmen, Patrulha X"
                  rows={2}
                />
              </div>
              <Button onClick={addFranchise} className="w-full">
                Adicionar Franquia
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-premium">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-xl font-semibold">
                  Franquias ({franchises.length})
                </CardTitle>
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs h-9"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {franchisesQuery.isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando…</div>
              ) : franchises.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Nenhuma franquia encontrada." : "Nenhuma franquia cadastrada."}
                </div>
              ) : (
                <div className="space-y-3">
                  {franchises.map((f) => (
                    <div key={f.id} className="rounded-sm border border-border bg-muted/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">{f.canonical}</p>
                          {f.aliases.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {f.aliases.map((alias) => (
                                <Badge key={alias} variant="secondary" className="text-xs">
                                  {alias}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Criada em {fmtDate(f.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(f)}>
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Franquia</DialogTitle>
                                <DialogDescription>
                                  Atualize o nome canônico e aliases.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="edit-canonical">Nome Canônico</Label>
                                  <Input
                                    id="edit-canonical"
                                    value={editForm.canonical}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, canonical: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="edit-aliases">Aliases</Label>
                                  <Textarea
                                    id="edit-aliases"
                                    value={editForm.aliases}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, aliases: e.target.value })
                                    }
                                    rows={3}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingFranchise(null)}>
                                  Cancelar
                                </Button>
                                <Button onClick={saveEdit}>Salvar</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive">
                                Deletar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deletar franquia?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  A franquia <strong>{f.canonical}</strong> será removida
                                  permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteFranchise(f.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sim, deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Regras Automáticas */}
        <div className="space-y-6">
          <Card className="border border-border bg-card shadow-premium">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xl font-semibold">Adicionar Regra Automática</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-2">
                <Label htmlFor="new-pattern">Padrão (palavra-chave)</Label>
                <Input
                  id="new-pattern"
                  value={newRule.pattern}
                  onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                  placeholder="Ex: magneto"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-franchise">Franquia Canônica</Label>
                <Input
                  id="new-franchise"
                  value={newRule.franchise}
                  onChange={(e) => setNewRule({ ...newRule, franchise: e.target.value })}
                  placeholder="Ex: X-Men"
                  list="franchise-suggestions"
                />
                <datalist id="franchise-suggestions">
                  {franchises.map((f) => (
                    <option key={f.id} value={f.canonical} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-note">Nota (opcional)</Label>
                <Input
                  id="new-note"
                  value={newRule.note}
                  onChange={(e) => setNewRule({ ...newRule, note: e.target.value })}
                  placeholder="Ex: Personagem principal"
                />
              </div>
              <Button onClick={addRule} className="w-full">
                Adicionar Regra
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-premium">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xl font-semibold">
                Regras Ativas ({rules.filter((r) => r.enabled).length}/{rules.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {rulesQuery.isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando…</div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma regra cadastrada.
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-sm border p-4 ${r.enabled ? "border-border bg-muted/30" : "border-border bg-muted/10 opacity-60"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={r.enabled ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {r.enabled ? "Ativa" : "Inativa"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Prioridade: {r.priority}
                            </Badge>
                          </div>
                          <p className="text-sm">
                            <span className="font-semibold">Padrão:</span> {r.pattern}
                          </p>
                          <p className="text-sm">
                            <span className="font-semibold">→ Franquia:</span>{" "}
                            {r.franchise_canonical}
                          </p>
                          {r.note && <p className="text-xs text-muted-foreground mt-1">{r.note}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleRule(r.id, r.enabled)}
                          >
                            {r.enabled ? "Desativar" : "Ativar"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive">
                                Deletar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deletar regra?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  A regra "{r.pattern} → {r.franchise_canonical}" será removida
                                  permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteRule(r.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sim, deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Componente padrão com layout (para uso standalone)
export default function AdminFranchises() {
  return (
    <AdminLayout>
      <AdminFranchisesContent />
    </AdminLayout>
  );
}
