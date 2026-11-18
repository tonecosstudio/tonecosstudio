import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_CATALOG_CHARACTER_EDITORIAL_PROFILE,
  getCatalogCharacterEditorialProfile,
  saveCatalogCharacterEditorialProfile,
  setCatalogCharacterPublicationApproval,
  type CatalogCharacterEditorialClaim,
  type CatalogCharacterEditorialProfile,
  type CatalogEditorialEvidenceKind,
  type CatalogEditorialEvidenceSource,
} from "@/services/admin/catalog/admin-internal-collection-curation-service";
import {
  buildEditorialResearchDraft,
  fillEmptyEditorialProfileFields,
  findEditorialResearchMatchesForModels,
  getEditorialResearchClaimValue,
  type EditorialResearchPreparation,
} from "@/components/admin/collections/character-editorial-research-import";

const evidenceKinds: { value: CatalogEditorialEvidenceKind; label: string }[] =
  [
    { value: "official", label: "Fonte oficial" },
    { value: "publisher", label: "Editora" },
    { value: "licensor", label: "Licenciante" },
    { value: "institution", label: "Instituição" },
    { value: "reputable_reference", label: "Referência confiável" },
    { value: "other", label: "Outra fonte" },
  ];

const emptySource = (): CatalogEditorialEvidenceSource => ({
  title: "",
  url: "",
  kind: "official",
});

function SourceListEditor({
  id,
  label,
  sources,
  onChange,
}: {
  id: string;
  label: string;
  sources: CatalogEditorialEvidenceSource[];
  onChange: (sources: CatalogEditorialEvidenceSource[]) => void;
}) {
  return (
    <fieldset className="space-y-2 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Fontes de {label}
      </legend>
      {sources.map((source, index) => (
        <div
          key={`${id}-source-${index}`}
          className="grid gap-2 sm:grid-cols-2"
        >
          <div className="space-y-1">
            <Label htmlFor={`${id}-title-${index}`}>Título da fonte</Label>
            <Input
              id={`${id}-title-${index}`}
              maxLength={200}
              value={source.title}
              onChange={(event) =>
                onChange(
                  sources.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, title: event.target.value }
                      : item,
                  ),
                )
              }
              placeholder="Ex.: página oficial do personagem"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-url-${index}`}>URL HTTPS</Label>
            <Input
              id={`${id}-url-${index}`}
              type="url"
              inputMode="url"
              maxLength={2048}
              value={source.url}
              onChange={(event) =>
                onChange(
                  sources.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, url: event.target.value }
                      : item,
                  ),
                )
              }
              placeholder="https://"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${id}-kind-${index}`}>Tipo da fonte</Label>
            <select
              id={`${id}-kind-${index}`}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={source.kind}
              onChange={(event) =>
                onChange(
                  sources.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          kind: event.target
                            .value as CatalogEditorialEvidenceKind,
                        }
                      : item,
                  ),
                )
              }
            >
              {evidenceKinds.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-destructive sm:col-span-2"
            onClick={() =>
              onChange(sources.filter((_, itemIndex) => itemIndex !== index))
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remover fonte
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={sources.length >= 10}
        onClick={() => onChange([...sources, emptySource()])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Adicionar fonte
      </Button>
    </fieldset>
  );
}

function ClaimListEditor({
  id,
  title,
  maxNameLength = 240,
  claims,
  onChange,
}: {
  id: string;
  title: string;
  maxNameLength?: number;
  claims: CatalogCharacterEditorialClaim[];
  onChange: (claims: CatalogCharacterEditorialClaim[]) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      {claims.map((claim, index) => (
        <div
          key={`${id}-claim-${index}`}
          className="space-y-2 rounded-md bg-muted/30 p-3"
        >
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1 space-y-1">
              <Label htmlFor={`${id}-claim-${index}`}>Informação</Label>
              <Input
                id={`${id}-claim-${index}`}
                maxLength={maxNameLength}
                value={claim.name}
                onChange={(event) =>
                  onChange(
                    claims.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, name: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() =>
                onChange(claims.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </Button>
          </div>
          <SourceListEditor
            id={`${id}-${index}`}
            label={claim.name || "esta informação"}
            sources={claim.sources}
            onChange={(sources) =>
              onChange(
                claims.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, sources } : item,
                ),
              )
            }
          />
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={claims.length >= 30}
        onClick={() => onChange([...claims, { name: "", sources: [] }])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Adicionar informação
      </Button>
    </fieldset>
  );
}

export function CharacterEditorialProfileEditor({
  identityId,
  characterName,
  editorialResearch = null,
}: {
  identityId: string;
  characterName: string;
  editorialResearch?: EditorialResearchPreparation | null;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState<CatalogCharacterEditorialProfile>(
    EMPTY_CATALOG_CHARACTER_EDITORIAL_PROFILE,
  );
  const [formError, setFormError] = useState("");
  const [staleVersion, setStaleVersion] = useState(false);
  const [researchCandidateName, setResearchCandidateName] = useState("");
  const queryKey = ["admin-character-editorial-profile", identityId] as const;
  const profileQuery = useQuery({
    queryKey,
    queryFn: () => getCatalogCharacterEditorialProfile(identityId),
    enabled: expanded,
  });
  const researchMatches = useMemo(() => {
    if (!editorialResearch || !profileQuery.data) return [];
    return findEditorialResearchMatchesForModels(
      editorialResearch,
      profileQuery.data.activeModelLinks.map((link) => ({
        modelId: link.modelId,
        slug: link.modelSlug,
      })),
    ).filter((match) =>
      [
        match.candidate.candidateName,
        match.candidate.catalogDisplayNameCandidate,
        getEditorialResearchClaimValue(
          match.candidate,
          "identity.canonical_name_candidate",
        ) ?? "",
      ].some(
        (name) =>
          name.trim().toLocaleLowerCase() ===
          characterName.trim().toLocaleLowerCase(),
      ),
    );
  }, [characterName, editorialResearch, profileQuery.data]);

  useEffect(() => {
    if (profileQuery.data) setProfile(profileQuery.data.profile);
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (status: "draft" | "reviewed") => {
      if (!profileQuery.data)
        throw new Error("Carregue a ficha antes de salvar.");
      return saveCatalogCharacterEditorialProfile({
        identityId,
        profile,
        status,
        expectedRevision: profileQuery.data.revision,
      });
    },
    onSuccess: async (saved) => {
      setProfile(saved.profile);
      setFormError("");
      setStaleVersion(false);
      await queryClient.setQueryData(queryKey, saved);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a ficha.";
      setStaleVersion(message.includes("atualizada por outra pessoa"));
      setFormError(message);
    },
  });

  const publicationMutation = useMutation({
    mutationFn: (approved: boolean) => {
      const current = profileQuery.data;
      if (!current) throw new Error("Carregue a ficha antes de aprovar.");
      return setCatalogCharacterPublicationApproval({
        identityId,
        expectedRevision: current.revision,
        expectedRelationRevision: current.relationRevision,
        approved,
      });
    },
    onSuccess: async (saved) => {
      setProfile(saved.profile);
      setFormError("");
      setStaleVersion(false);
      await queryClient.setQueryData(queryKey, saved);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a aprovação pública.";
      setStaleVersion(message.includes("atualizada por outra pessoa"));
      setFormError(message);
    },
  });

  const update = <K extends keyof CatalogCharacterEditorialProfile>(
    key: K,
    value: CatalogCharacterEditorialProfile[K],
  ) => setProfile((current) => ({ ...current, [key]: value }));
  const hasUnsavedChanges = profileQuery.data
    ? JSON.stringify(profile) !== JSON.stringify(profileQuery.data.profile)
    : true;
  const selectedResearchMatch =
    researchMatches.length === 1
      ? researchMatches[0]
      : researchMatches.find(
          (match) => match.candidate.candidateName === researchCandidateName,
        );

  return (
    <details
      className="mt-3 rounded-md border bg-background"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span>Ficha editorial · {characterName}</span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </summary>
      <div className="space-y-4 border-t p-4">
        <Alert>
          <AlertDescription>
            Esta ficha e suas fontes permanecem privadas. Marcar como revisada
            não publica a página. Para entrar na exportação ao catálogo, a
            revisão atual precisa de aprovação pública humana; cada vínculo de
            modelo também precisa de URL HTTPS e uma nota de evidência.
          </AlertDescription>
        </Alert>
        {profileQuery.isLoading && (
          <p
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando ficha
            editorial…
          </p>
        )}
        {profileQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Não foi possível carregar a ficha. Feche e reabra esta seção para
              tentar novamente.
            </AlertDescription>
          </Alert>
        )}
        {profileQuery.data && (
          <>
            {researchMatches.length > 0 && (
              <Alert>
                <AlertDescription className="space-y-3">
                  <span>
                    Dossiê pesquisado pendente. A importação só preenche campos
                    vazios nesta ficha em memória; não salva, não revisa e não
                    aprova. Confirme cada claim e cada relação no processo
                    humano.
                  </span>
                  {researchMatches.length > 1 && (
                    <div className="space-y-1">
                      <Label
                        htmlFor={`character-${identityId}-research-candidate`}
                      >
                        Escolher dossiê candidato
                      </Label>
                      <select
                        id={`character-${identityId}-research-candidate`}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={researchCandidateName}
                        onChange={(event) =>
                          setResearchCandidateName(event.target.value)
                        }
                      >
                        <option value="">Selecione um candidato</option>
                        {researchMatches.map((match) => (
                          <option
                            key={match.candidate.candidateName}
                            value={match.candidate.candidateName}
                          >
                            {match.candidate.candidateName} ·{" "}
                            {match.candidate.franchiseCandidate}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {researchMatches.length === 1 && (
                    <span className="block">
                      Candidato: {researchMatches[0].candidate.candidateName} ·{" "}
                      {researchMatches[0].candidate.franchiseCandidate}
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={profileQuery.isLoading || !selectedResearchMatch}
                    onClick={() => {
                      if (!selectedResearchMatch) return;
                      const draft = buildEditorialResearchDraft(
                        selectedResearchMatch.candidate,
                        selectedResearchMatch.sources,
                      );
                      setProfile((current) =>
                        fillEmptyEditorialProfileFields(current, draft),
                      );
                      setFormError("");
                    }}
                  >
                    Preencher campos vazios como rascunho
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              Estado:{" "}
              {profileQuery.data.status === "reviewed"
                ? "revisada e privada"
                : "rascunho privado"}
              {profileQuery.data.revision > 0
                ? ` · revisão ${profileQuery.data.revision}`
                : ""}
              {profileQuery.data.reviewedAt
                ? ` · revisada em ${new Date(profileQuery.data.reviewedAt).toLocaleString("pt-BR")}`
                : ""}
            </p>
            <p className="text-xs text-muted-foreground" role="status">
              Publicação:{" "}
              {profileQuery.data.publicationStatus === "approved" &&
              profileQuery.data.publicationRevision ===
                profileQuery.data.revision &&
              profileQuery.data.approvedRelationRevision ===
                profileQuery.data.relationRevision
                ? `aprovada para exportação · revisão ${profileQuery.data.publicationRevision}, vínculos ${profileQuery.data.relationRevision}`
                : "sem aprovação para a revisão atual"}
              {profileQuery.data.publicationApprovedAt
                ? ` · aprovada em ${new Date(profileQuery.data.publicationApprovedAt).toLocaleString("pt-BR")}`
                : ""}
            </p>
            <section
              className="space-y-2 rounded-md border p-3"
              aria-label="Vínculos incluídos na aprovação"
            >
              <p className="text-sm font-medium">
                Estatuetas e evidências desta personagem ·{" "}
                {profileQuery.data.activeModelLinks.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Revisão dos vínculos: {profileQuery.data.relationRevision}. A
                aprovação cobre todos os registros abaixo, inclusive de outras
                coleções. Mudanças posteriores exigem nova aprovação.
              </p>
              {profileQuery.data.activeModelLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma estatueta vinculada. A aprovação pública será
                  recusada.
                </p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-auto text-xs">
                  {profileQuery.data.activeModelLinks.map((link) => (
                    <li
                      key={link.modelId}
                      className="space-y-1 border-t pt-2 first:border-0 first:pt-0"
                    >
                      <p className="font-medium">{link.modelSlug}</p>
                      <p className="break-all text-muted-foreground">
                        ID: {link.modelId}
                      </p>
                      <p>{link.evidenceTitle || "Sem nota de evidência"}</p>
                      <p className="break-all text-muted-foreground">
                        Fonte: {link.evidenceUrl}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <p className="text-xs text-muted-foreground">
              Para revisar, cite nome, franquia, biografia e obra de origem.
              Cada alias e característica também precisa de fonte; idade é
              opcional e exige evidência quando preenchida.
            </p>
            <div className="space-y-2">
              <Label htmlFor={`character-${identityId}-slug`}>
                Slug público estável
              </Label>
              <Input
                id={`character-${identityId}-slug`}
                maxLength={120}
                autoComplete="off"
                value={profile.slug ?? ""}
                placeholder="exemplo-personagem"
                onChange={(event) => update("slug", event.target.value || null)}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <SourceListEditor
                id={`character-${identityId}-name`}
                label="nome canônico"
                sources={profile.nameSources}
                onChange={(value) => update("nameSources", value)}
              />
              <SourceListEditor
                id={`character-${identityId}-franchise`}
                label="franquia"
                sources={profile.franchiseSources}
                onChange={(value) => update("franchiseSources", value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`character-${identityId}-biography`}>
                Biografia original
              </Label>
              <Textarea
                id={`character-${identityId}-biography`}
                maxLength={6000}
                rows={5}
                value={profile.biography}
                onChange={(event) => update("biography", event.target.value)}
                placeholder="Redija com suas próprias palavras e mantenha apenas fatos sustentados pelas fontes abaixo."
              />
              <SourceListEditor
                id={`character-${identityId}-biography`}
                label="biografia"
                sources={profile.biographySources}
                onChange={(value) => update("biographySources", value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`character-${identityId}-origin`}>
                Obra de origem
              </Label>
              <Input
                id={`character-${identityId}-origin`}
                maxLength={240}
                value={profile.originWork}
                onChange={(event) => update("originWork", event.target.value)}
              />
              <SourceListEditor
                id={`character-${identityId}-origin`}
                label="obra de origem"
                sources={profile.originWorkSources}
                onChange={(value) => update("originWorkSources", value)}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`character-${identityId}-age`}>
                  Idade contextualizada (opcional)
                </Label>
                <Input
                  id={`character-${identityId}-age`}
                  maxLength={500}
                  value={profile.ageContext ?? ""}
                  onChange={(event) => {
                    update("ageContext", event.target.value || null);
                    if (!event.target.value) update("ageSources", []);
                  }}
                  placeholder="Somente quando confirmada na obra ou fonte oficial"
                />
                <SourceListEditor
                  id={`character-${identityId}-age`}
                  label="idade"
                  sources={profile.ageSources}
                  onChange={(value) => update("ageSources", value)}
                />
              </div>
              <ClaimListEditor
                id={`character-${identityId}-alias`}
                title="Aliases confirmados"
                maxNameLength={160}
                claims={profile.aliases}
                onChange={(value) => update("aliases", value)}
              />
            </div>
            <ClaimListEditor
              id={`character-${identityId}-characteristic`}
              title="Características confirmadas"
              claims={profile.characteristics}
              onChange={(value) => update("characteristics", value)}
            />
          </>
        )}
        {formError && (
          <Alert variant="destructive">
            <AlertDescription className="space-y-2">
              <span>{formError}</span>
              {staleVersion && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const current = await profileQuery.refetch();
                    if (current.data) {
                      setProfile(current.data.profile);
                      setStaleVersion(false);
                      setFormError("");
                    }
                  }}
                >
                  Carregar revisão atual
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {profileQuery.data && (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={
                saveMutation.isPending ||
                publicationMutation.isPending ||
                profileQuery.isLoading
              }
              onClick={() => saveMutation.mutate("draft")}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar rascunho privado
            </Button>
            <Button
              type="button"
              disabled={
                saveMutation.isPending ||
                publicationMutation.isPending ||
                profileQuery.isLoading
              }
              onClick={() => saveMutation.mutate("reviewed")}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Revisar ficha (mantém privada)
            </Button>
            {profileQuery.data.status === "reviewed" &&
              (profileQuery.data.publicationStatus === "approved" &&
              profileQuery.data.publicationRevision ===
                profileQuery.data.revision &&
              profileQuery.data.approvedRelationRevision ===
                profileQuery.data.relationRevision ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={publicationMutation.isPending || hasUnsavedChanges}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Revogar a aprovação desta revisão? A próxima exportação editorial retirará esta ficha da projeção pública.",
                      )
                    )
                      publicationMutation.mutate(false);
                  }}
                >
                  {publicationMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Revogar aprovação pública
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    publicationMutation.isPending ||
                    saveMutation.isPending ||
                    hasUnsavedChanges
                  }
                  onClick={() => {
                    if (
                      window.confirm(
                        "Aprovar a revisão da ficha e dos vínculos ativos (revisão " +
                          profileQuery.data.relationRevision +
                          ")? Confirme antes as estatuetas e fontes vinculadas à personagem. A aprovação não publica nem sincroniza o catálogo automaticamente.",
                      )
                    )
                      publicationMutation.mutate(true);
                  }}
                >
                  {publicationMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Aprovar para publicação
                </Button>
              ))}
          </div>
        )}
      </div>
    </details>
  );
}
