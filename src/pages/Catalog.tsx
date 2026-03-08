import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { likeModel, unlikeModel } from "@/lib/model-likes";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { ModelRow } from "@/pages/catalog/catalogTypes";
import { CatalogHero } from "@/pages/catalog/components/CatalogHero";
import { CatalogToolbar } from "@/pages/catalog/components/CatalogToolbar";
import { CatalogForYouSection } from "@/pages/catalog/components/CatalogForYouSection";
import { CatalogGridSection } from "@/pages/catalog/components/CatalogGridSection";
import { CatalogPagination } from "@/pages/catalog/components/CatalogPagination";
import { useCatalogModels, type CatalogSort } from "@/pages/catalog/hooks/useCatalogModels";
import { useLikedModelIdsQuery } from "@/pages/catalog/hooks/useLikedModelIdsQuery";
import { useProfileQuery } from "@/pages/catalog/hooks/useProfileQuery";
import { useForYouModels } from "@/pages/catalog/hooks/useForYouModels";

export default function Catalog() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const [franchise, setFranchise] = useState("");
  const [category, setCategory] = useState("");
  const [tagsCSV, setTagsCSV] = useState("");
  const [sort, setSort] = useState<CatalogSort>("recent");

  const needle = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    setPage(0);
  }, [needle, franchise, category, tagsCSV, sort]);

  const modelsQuery = useCatalogModels(needle, page, { franchise, category, tagsCSV, sort });
  const rows = modelsQuery.data?.rows ?? [];
  const hasNext = modelsQuery.data?.hasNext ?? false;

  const likesQuery = useLikedModelIdsQuery(user?.id);
  const likedIds = likesQuery.data ?? new Set<string>();

  const profileQuery = useProfileQuery(user?.id);

  const forYouQuery = useForYouModels({
    userId: user?.id,
    needle,
    likedIds,
    profilePreferenceTags: profileQuery.data?.preference_tags,
    profileLoading: profileQuery.isLoading,
  });

  const getIsLiked = (modelId: string) => Boolean(user?.id) && likedIds.has(modelId);

  const handleToggleLike = async (m: ModelRow, isLiked: boolean) => {
    if (!user?.id) {
      toast({
        title: "Entre para favoritar",
        description: "Faça login para salvar seus modelos preferidos.",
      });
      return;
    }
    try {
      if (isLiked) await unlikeModel(user.id, m.id);
      else await likeModel(user.id, m.id);
      await likesQuery.refetch();
    } catch {
      toast({
        title: "Não foi possível salvar o favorito",
        description: "Verifique se a tabela de curtidas foi criada e tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppShell>
      <SEOHead
        title="Catálogo de Colecionáveis Premium"
        description="Explore o catálogo completo de estatuetas artesanais da Tonecos Studios. Produção sob encomenda com pintura artística feita à mão."
        keywords={[
          "catálogo",
          "estatuetas",
          "colecionáveis",
          "premium",
          "tonecos",
          "artesanal",
          "sob encomenda",
        ]}
        type="website"
      />
      <CatalogHero />
      <CatalogToolbar
        q={q}
        onChangeQ={setQ}
        needle={needle}
        page={page}
        franchise={franchise}
        onChangeFranchise={setFranchise}
        category={category}
        onChangeCategory={setCategory}
        tagsCSV={tagsCSV}
        onChangeTagsCSV={setTagsCSV}
        sort={sort}
        onChangeSort={setSort}
      />

      {user && !needle && forYouQuery.data && forYouQuery.data.length > 0 ? (
        <CatalogForYouSection
          models={forYouQuery.data}
          getIsLiked={getIsLiked}
          onToggleLike={handleToggleLike}
        />
      ) : null}

      <section className="container py-12">
        <CatalogGridSection
          isLoading={modelsQuery.isLoading}
          rows={rows}
          needle={needle}
          getIsLiked={getIsLiked}
          onToggleLike={handleToggleLike}
          onClearSearch={() => setQ("")}
        />

        <CatalogPagination
          page={page}
          hasNext={hasNext}
          isFetching={modelsQuery.isFetching}
          rowsCount={rows.length}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </section>
    </AppShell>
  );
}