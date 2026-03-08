// @ts-nocheck
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { likeModel, unlikeModel } from "@/lib/model-likes";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLikedModelIdsQuery } from "@/pages/catalog/hooks/useLikedModelIdsQuery";
import { buildModelTitle } from "@/pages/catalog/catalogUtils";

type ModelRow = {
  id: string;
  name: string;
  franchise: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[] | null;
  image_bucket: string;
  image_path: string;
  created_at: string;
};

export default function ModelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const modelQuery = useQuery({
    queryKey: ["model", { id: id ?? null }],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("models")
        .select("id,name,franchise,category,subcategory,tags,image_bucket,image_path,created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ModelRow | null;
    },
  });

  const model = modelQuery.data;
  const title = model ? buildModelTitle(model.name, model.franchise) : "Modelo";
  const description = model
    ? `Veja detalhes do modelo ${title} e solicite um orçamento sob encomenda com a Tonecos Studios.`
    : "Veja detalhes do modelo e solicite um orçamento sob encomenda com a Tonecos Studios.";

  const imageUrl = model
    ? supabase.storage.from(model.image_bucket).getPublicUrl(model.image_path).data.publicUrl
    : null;

  const likesQuery = useLikedModelIdsQuery(user?.id);
  const likedIds = likesQuery.data ?? new Set<string>();
  const isLiked = Boolean(user?.id) && Boolean(model?.id) && likedIds.has(model!.id);

  const onToggleLike = async () => {
    if (!model) return;
    if (!user?.id) {
      toast({
        title: "Entre para favoritar",
        description: "Faça login para salvar seus modelos preferidos.",
      });
      navigate("/login");
      return;
    }
    try {
      if (isLiked) await unlikeModel(user.id, model.id);
      else await likeModel(user.id, model.id);
      await likesQuery.refetch();
    } catch {
      toast({
        title: "Não foi possível salvar o favorito",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppShell>
      <SEOHead title={title} description={description} type="product" />

      <section className="container py-8 sm:py-12">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        {modelQuery.isLoading ? (
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="aspect-[3/4] w-full rounded-lg bg-muted animate-pulse" />
            <div className="space-y-4">
              <div className="h-10 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-6 w-1/2 rounded bg-muted animate-pulse" />
              <div className="h-28 w-full rounded bg-muted animate-pulse" />
            </div>
          </div>
        ) : !model ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold">Modelo não encontrado</h1>
              <p className="mt-2 text-muted-foreground">
                Esse item pode ter sido removido ou o link está incorreto.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link to="/">Voltar ao Catálogo</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Card className="border-border overflow-hidden">
                <div className="relative aspect-[3/4] w-full bg-muted">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={model.name}
                      className="h-full w-full object-contain p-4"
                      loading="eager"
                    />
                  ) : null}

                  <button
                    type="button"
                    className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-popover/95 text-foreground shadow-elevated backdrop-blur-sm"
                    onClick={onToggleLike}
                    aria-pressed={isLiked}
                    aria-label={isLiked ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Heart className={isLiked ? "h-5 w-5 fill-current" : "h-5 w-5"} />
                  </button>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <header>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
                <p className="mt-2 text-muted-foreground">
                  {[model.franchise, model.category, model.subcategory]
                    .filter(Boolean)
                    .join(" • ") || "—"}
                </p>
              </header>

              {(model.tags ?? []).length ? (
                <div className="flex flex-wrap gap-2">
                  {(model.tags ?? [])
                    .map((t) => String(t).trim())
                    .filter(Boolean)
                    .slice(0, 14)
                    .map((t) => (
                      <Badge key={t} variant="outline" className="border-border">
                        {t}
                      </Badge>
                    ))}
                </div>
              ) : null}

              <Card className="border-border">
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Produção artesanal sob encomenda. Explore as coleções disponíveis.
                  </p>
                  <Button
                    className="w-full h-12 bg-foreground text-background hover:bg-foreground/90"
                    onClick={() => navigate(`/colecoes`)}
                  >
                    Ver Coleções
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
