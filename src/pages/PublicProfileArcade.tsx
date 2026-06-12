import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeSectionTitle,
  GlitchText,
} from "@/components/arcade/ArcadeLayout";
import { FloatingParticles } from "@/components/arcade/ArcadeEffects";
import { Trophy } from "lucide-react";
import {
  getPublicCollectionImageUrl,
  getPublicProfileByUsername,
  listPublicBadges,
  listPublicCollectionItems,
} from "@/lib/public-profile-service";
import { catalogModelDetailsPath } from "@/config/routes";
import {
  getCatalogCharacterName,
  getCatalogPublicTags,
  getCatalogSourceName,
} from "@/lib/catalog-utils";

export default function PublicProfileArcade() {
  const { username } = useParams<{ username: string }>();

  const profileQuery = useQuery({
    queryKey: ["public-profile", username],
    enabled: Boolean(username),
    queryFn: () => getPublicProfileByUsername(username),
  });

  const badgesQuery = useQuery({
    queryKey: ["public-badges", profileQuery.data?.id],
    enabled: Boolean(profileQuery.data?.id),
    queryFn: () => listPublicBadges(profileQuery.data!.id),
  });

  const collectionQuery = useQuery({
    queryKey: ["public-collection-items", profileQuery.data?.id],
    enabled: Boolean(profileQuery.data?.id),
    queryFn: () => listPublicCollectionItems(profileQuery.data!.id),
  });

  const profile = profileQuery.data;
  const badges = badgesQuery.data || [];
  const collection = collectionQuery.data || [];

  if (profileQuery.isLoading) {
    return (
      <Page title="Carregando..." description="">
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-[hsl(var(--gold-accent))] border-t-transparent rounded-full animate-spin" />
        </div>
      </Page>
    );
  }

  if (!profile) {
    return (
      <Page title="Perfil não encontrado" description="">
        <div className="text-center py-32">
          <h1
            className="text-3xl font-bold tracking-wider mb-2"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
          >
            SOLDIER NOT FOUND
          </h1>
          <p className="font-mono text-xs text-[hsl(0,0%,45%)] tracking-wider">
            Este perfil não existe ou é privado
          </p>
        </div>
      </Page>
    );
  }

  const xpForNextLevel = profile.collector_level * 1000;
  const xpProgress = Math.min(
    100,
    (profile.collector_xp / xpForNextLevel) * 100,
  );

  return (
    <Page
      title={`${profile.display_name || profile.username} | ORDAX`}
      description={profile.bio || ""}
    >
      {/* Hero */}
      <section className="relative py-16 px-6 overflow-hidden">
        <FloatingParticles />
        <div className="relative max-w-4xl mx-auto text-center">
          {/* Avatar */}
          <div className="w-24 h-24 mx-auto mb-4 border-2 border-[hsl(var(--gold-accent)/0.5)] overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
              />
            ) : (
              <div className="w-full h-full bg-[hsl(0,0%,12%)] flex items-center justify-center font-mono text-2xl text-[hsl(var(--gold-accent))]">
                {(profile.display_name ||
                  profile.username ||
                  "?")[0].toUpperCase()}
              </div>
            )}
          </div>

          <h1
            className="text-4xl md:text-5xl font-black tracking-[0.15em] mb-2"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
          >
            <GlitchText
              text={profile.display_name || profile.username || "ANÔNIMO"}
            />
          </h1>
          <p className="font-mono text-xs text-[hsl(var(--gold-accent)/0.6)] tracking-[0.2em] mb-4">
            @{profile.username}
          </p>
          {profile.bio && (
            <p className="font-mono text-xs text-[hsl(0,0%,50%)] max-w-md mx-auto leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-8 font-mono text-xs">
            <div className="text-center">
              <p className="text-2xl font-bold text-[hsl(var(--gold-accent))] tabular-nums">
                {profile.collector_level}
              </p>
              <p className="text-[hsl(0,0%,40%)] text-[10px] tracking-widest uppercase mt-1">
                NÍVEL
              </p>
            </div>
            <div className="w-px h-10 bg-[hsl(0,0%,20%)]" />
            <div className="text-center">
              <p className="text-2xl font-bold text-[hsl(var(--gold-accent))] tabular-nums">
                {profile.pieces_owned}
              </p>
              <p className="text-[hsl(0,0%,40%)] text-[10px] tracking-widest uppercase mt-1">
                PEÇAS
              </p>
            </div>
            <div className="w-px h-10 bg-[hsl(0,0%,20%)]" />
            <div className="text-center">
              <p className="text-2xl font-bold text-[hsl(var(--gold-accent))] tabular-nums">
                {badges.length}
              </p>
              <p className="text-[hsl(0,0%,40%)] text-[10px] tracking-widest uppercase mt-1">
                BADGES
              </p>
            </div>
          </div>

          {/* XP Bar */}
          <div className="max-w-xs mx-auto mt-6">
            <div className="flex justify-between font-mono text-[9px] text-[hsl(0,0%,40%)] tracking-widest mb-1">
              <span>XP</span>
              <span>
                {profile.collector_xp}/{xpForNextLevel}
              </span>
            </div>
            <div className="h-1.5 bg-[hsl(0,0%,12%)] overflow-hidden">
              <div
                className="h-full bg-[hsl(var(--gold-accent))]"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-16 space-y-8">
        {/* Badges */}
        {badges.length > 0 && (
          <div>
            <ArcadeSectionTitle>BADGES</ArcadeSectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {badges.map((b) => (
                <ArcadeCard key={b.id} className="p-3 text-center">
                  <span className="text-2xl mb-1 block">
                    {b.collector_badges?.icon || "🏆"}
                  </span>
                  <p className="font-mono text-[10px] text-[hsl(var(--gold-accent))] tracking-wider">
                    {b.collector_badges?.name}
                  </p>
                </ArcadeCard>
              ))}
            </div>
          </div>
        )}

        {/* Collection */}
        {collection.length > 0 && (
          <div>
            <ArcadeSectionTitle>COLEÇÃO PÚBLICA</ArcadeSectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {collection.map((item) => {
                const model = item.models;
                const imageUrl = getPublicCollectionImageUrl(model);
                const characterName = getCatalogCharacterName(model);
                const sourceName = getCatalogSourceName(model);
                const tags = getCatalogPublicTags(model, 2);
                return (
                  <ArcadeCard key={item.id} className="overflow-hidden">
                    <div className="aspect-square bg-[hsl(0,0%,8%)]">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={characterName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Trophy className="w-8 h-8 text-[hsl(0,0%,15%)]" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate font-mono text-xs text-[hsl(0,0%,80%)]">
                        {model?.id ? (
                          <Link
                            to={catalogModelDetailsPath(
                              model.id,
                              [model.character_name || model.name, model.variant_name]
                                .filter(Boolean)
                                .join(" "),
                            )}
                            className="hover:text-[hsl(var(--gold-accent))]"
                          >
                            {characterName}
                          </Link>
                        ) : (
                          characterName
                        )}
                      </p>
                      {sourceName && (
                        <p className="font-mono text-[9px] text-[hsl(var(--gold-accent)/0.5)] tracking-wider">
                          {sourceName}
                        </p>
                      )}
                      {tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="border border-[hsl(0,0%,18%)] px-1 py-0.5 font-mono text-[7px] uppercase text-[hsl(0,0%,42%)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </ArcadeCard>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </Page>
  );
}
