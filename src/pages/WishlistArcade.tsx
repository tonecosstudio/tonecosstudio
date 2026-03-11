import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeHero,
  ArcadeCard,
  ArcadeSectionTitle,
  ArcadeCTA,
} from "@/components/arcade/ArcadeLayout";
import { Heart, Trash2, Eye, Edit2, X, Check, Bell, BellOff, Crosshair } from "lucide-react";

export default function WishlistArcade() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editingItem, setEditingItem] = useState<{
    id: string; notes: string; priority: number; notify: boolean;
  } | null>(null);

  const wishlistQuery = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist")
        .select(`id, notes, priority, notify_when_available, added_at, models (id, name, image_path, image_bucket, franchise, category)`)
        .eq("user_id", user!.id)
        .order("priority", { ascending: false })
        .order("added_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wishlist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wishlist"] }); toast({ title: "Removido" }); },
    onError: () => { toast({ title: "Erro ao remover", variant: "destructive" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, notes, priority, notify }: { id: string; notes: string; priority: number; notify: boolean }) => {
      const { error } = await supabase.from("wishlist").update({ notes, priority, notify_when_available: notify }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wishlist"] }); toast({ title: "Atualizado" }); setEditingItem(null); },
    onError: () => { toast({ title: "Erro", variant: "destructive" }); },
  });

  const items = wishlistQuery.data || [];

  const getPriorityConfig = (p: number) => {
    if (p === 2) return { label: "URGENTE", color: "hsl(0,70%,50%)" };
    if (p === 1) return { label: "ALTA", color: "hsl(45,100%,50%)" };
    return { label: "NORMAL", color: "hsl(0,0%,40%)" };
  };

  const inputClass = "w-full bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,18%)] text-[hsl(0,0%,90%)] placeholder:text-[hsl(0,0%,30%)] font-mono text-xs px-3 py-2 focus:outline-none focus:border-[hsl(var(--gold-accent))] transition-all";

  return (
    <Page title="Lista de Desejos" description="Gerencie sua lista de desejos de colecionáveis">
      <ArcadeHero
        badge="Inventário"
        title="WISHLIST"
        subtitle="Seus itens desejados"
        stats={[{ value: items.length, label: "Itens" }]}
      />

      <section className="max-w-5xl mx-auto px-6 pb-16">
        {items.length === 0 ? (
          <ArcadeCard>
            <div className="p-12 text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-[hsl(0,0%,15%)]" />
              <p className="font-mono text-[hsl(0,0%,40%)] text-xs tracking-wider mb-1">INVENTÁRIO VAZIO</p>
              <p className="font-mono text-[hsl(0,0%,25%)] text-[9px] tracking-wider mb-6">Adicione itens pelo catálogo</p>
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] font-mono uppercase tracking-[0.15em] text-xs h-10 px-8 hover:brightness-110 transition-all"
              >
                <Crosshair className="w-4 h-4" /> EXPLORAR
              </Link>
            </div>
          </ArcadeCard>
        ) : (
          <div className="space-y-4">
            {items.map((item: any) => {
              const model = item.models;
              const imageUrl = model
                ? supabase.storage.from(model.image_bucket).getPublicUrl(model.image_path).data.publicUrl
                : null;
              const priority = getPriorityConfig(item.priority);
              const isEditing = editingItem?.id === item.id;

              return (
                <ArcadeCard key={item.id}>
                  <div className="p-5 flex flex-col sm:flex-row gap-5">
                    {/* Image */}
                    <div className="w-full sm:w-36 h-36 flex-shrink-0 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,12%)] overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} alt={model?.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[hsl(0,0%,20%)] font-mono text-[9px]">NO IMG</div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-mono text-sm text-[hsl(0,0%,90%)] font-bold uppercase tracking-wider line-clamp-2">
                            {model?.name || "???"}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {model?.franchise && <span className="font-mono text-[10px] text-[hsl(0,0%,40%)]">{model.franchise}</span>}
                            {model?.category && <span className="font-mono text-[10px] text-[hsl(0,0%,30%)]">• {model.category}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[8px] px-2 py-1 border tracking-[0.2em]" style={{ borderColor: priority.color, color: priority.color }}>
                            {priority.label}
                          </span>
                          {item.notify_when_available && (
                            <Bell className="w-3 h-3 text-[hsl(var(--gold-accent))]" />
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <textarea
                            value={editingItem.notes}
                            onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                            placeholder="Notas..."
                            maxLength={500}
                            className={`${inputClass} min-h-[60px] resize-none`}
                          />
                          <div className="flex flex-wrap gap-2">
                            <select
                              value={editingItem.priority}
                              onChange={(e) => setEditingItem({ ...editingItem, priority: Number(e.target.value) })}
                              className={`${inputClass} w-32`}
                            >
                              <option value={0}>Normal</option>
                              <option value={1}>Alta</option>
                              <option value={2}>Urgente</option>
                            </select>
                            <button
                              onClick={() => setEditingItem({ ...editingItem, notify: !editingItem.notify })}
                              className={`flex items-center gap-1 px-3 py-1.5 border font-mono text-[10px] uppercase tracking-wider transition-all ${
                                editingItem.notify
                                  ? "border-[hsl(var(--gold-accent))] text-[hsl(var(--gold-accent))]"
                                  : "border-[hsl(0,0%,18%)] text-[hsl(0,0%,40%)]"
                              }`}
                            >
                              {editingItem.notify ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                              {editingItem.notify ? "ON" : "OFF"}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateMutation.mutate({ id: item.id, notes: editingItem.notes, priority: editingItem.priority, notify: editingItem.notify })}
                              disabled={updateMutation.isPending}
                              className="flex items-center gap-1 px-4 py-1.5 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] font-mono text-[10px] uppercase tracking-wider hover:brightness-110 transition-all"
                            >
                              <Check className="w-3 h-3" /> SALVAR
                            </button>
                            <button onClick={() => setEditingItem(null)} className="flex items-center gap-1 px-3 py-1.5 border border-[hsl(0,0%,18%)] text-[hsl(0,0%,45%)] font-mono text-[10px] uppercase tracking-wider hover:text-[hsl(0,0%,70%)] transition-all">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {item.notes && (
                            <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] mb-3 line-clamp-2">{item.notes}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setEditingItem({ id: item.id, notes: item.notes || "", priority: item.priority, notify: item.notify_when_available })}
                              className="flex items-center gap-1 px-3 py-1.5 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.05)] font-mono text-[9px] uppercase tracking-wider transition-all"
                            >
                              <Edit2 className="w-3 h-3" /> EDITAR
                            </button>
                            <Link
                              to={`/catalogo/${model?.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 border border-[hsl(0,0%,18%)] text-[hsl(0,0%,50%)] hover:text-[hsl(var(--gold-accent))] hover:border-[hsl(var(--gold-accent)/0.3)] font-mono text-[9px] uppercase tracking-wider transition-all"
                            >
                              <Eye className="w-3 h-3" /> VER
                            </Link>
                            <button
                              onClick={() => removeMutation.mutate(item.id)}
                              disabled={removeMutation.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 border border-[hsl(0,70%,50%)/0.3] text-[hsl(0,70%,50%)] hover:bg-[hsl(0,70%,50%)/0.05] font-mono text-[9px] uppercase tracking-wider transition-all"
                            >
                              <Trash2 className="w-3 h-3" /> REMOVER
                            </button>
                          </div>
                        </>
                      )}

                      <p className="font-mono text-[9px] text-[hsl(0,0%,20%)] mt-3">
                        {new Date(item.added_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </ArcadeCard>
              );
            })}
          </div>
        )}
      </section>

      <ArcadeCTA
        badge="Explorar"
        title="ENCONTRE NOVOS ITENS"
        description="Descubra modelos incríveis no catálogo"
        primaryAction={{ label: "CATÁLOGO", href: "/catalogo" }}
      />
    </Page>
  );
}
