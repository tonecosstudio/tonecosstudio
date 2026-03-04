// @ts-nocheck
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Star, Heart, Calendar, TrendingUp } from "lucide-react";

type PublicProfileData = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  collector_level: number;
  collector_xp: number;
  pieces_owned: number;
  total_spent: number;
  joined_at: string;
};

type BadgeData = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  earned_at: string;
};

type CollectionItem = {
  id: string;
  model_id: string;
  notes: string | null;
  added_at: string;
  model: {
    name: string;
    image_url: string | null;
    franchise_name: string | null;
  };
};

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();

  const profileQuery = useQuery({
    queryKey: ["public-profile", username],
    enabled: Boolean(username),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select(
          "id, username, display_name, bio, avatar_url, collector_level, collector_xp, pieces_owned, total_spent, joined_at"
        )
        .eq("username", username)
        .eq("is_public", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Perfil não encontrado ou privado");
      return data as PublicProfileData;
    },
  });

  const badgesQuery = useQuery({
    queryKey: ["user-badges", profileQuery.data?.id],
    enabled: Boolean(profileQuery.data?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_badges")
        .select(
          `
          badge_id,
          earned_at,
          collector_badges (
            id,
            name,
            description,
            icon,
            rarity
          )
        `
        )
        .eq("user_id", profileQuery.data!.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.collector_badges.id,
        name: item.collector_badges.name,
        description: item.collector_badges.description,
        icon: item.collector_badges.icon,
        rarity: item.collector_badges.rarity,
        earned_at: item.earned_at,
      })) as BadgeData[];
    },
  });

  const collectionQuery = useQuery({
    queryKey: ["public-collection", profileQuery.data?.id],
    enabled: Boolean(profileQuery.data?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("public_collection")
        .select(
          `
          id,
          model_id,
          notes,
          added_at,
          models (
            name,
            image_path,
            image_bucket,
            franchise
          )
        `
        )
        .eq("user_id", profileQuery.data!.id)
        .order("display_order", { ascending: true })
        .order("added_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.id,
        model_id: item.model_id,
        notes: item.notes,
        added_at: item.added_at,
        model: {
          name: item.models.name,
          image_url: `${(supabase as any).supabaseUrl}/storage/v1/object/public/${item.models.image_bucket}/${item.models.image_path}`,
          franchise_name: item.models.franchise || null,
        },
      })) as CollectionItem[];
    },
  });

  if (profileQuery.isLoading) {
    return <ProfileSkeleton />;
  }

  if (profileQuery.isError) {
    return (
      <div className="container py-12 max-w-4xl">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              {profileQuery.error instanceof Error
                ? profileQuery.error.message
                : "Erro ao carregar perfil"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = profileQuery.data!;
  const badges = badgesQuery.data || [];
  const collection = collectionQuery.data || [];

  const displayName = profile.display_name || profile.username;
  const xpForNextLevel = calculateXPForNextLevel(profile.collector_level);
  const xpProgress = ((profile.collector_xp % xpForNextLevel) / xpForNextLevel) * 100;

  return (
    <>
      <SEOHead
        title={`${displayName} - Perfil de Colecionador`}
        description={profile.bio || `Perfil público de ${displayName} na Ordax`}
        keywords={["colecionador", "perfil", "badges", "coleção"]}
      />

      <div className="container py-8 sm:py-12 max-w-6xl">
        {/* Header do Perfil */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <Avatar className="h-24 w-24 border-4 border-primary">
                <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="text-2xl">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-3xl font-bold">{displayName}</h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>

                {profile.bio && <p className="text-sm max-w-2xl">{profile.bio}</p>}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Membro desde{" "}
                    {new Date(profile.joined_at).toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            icon={<Trophy className="h-5 w-5" />}
            label="Nível"
            value={profile.collector_level.toString()}
            color="text-yellow-500"
          />
          <StatCard
            icon={<Star className="h-5 w-5" />}
            label="Peças"
            value={profile.pieces_owned.toString()}
            color="text-blue-500"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Investido"
            value={`R$ ${profile.total_spent.toFixed(0)}`}
            color="text-green-500"
          />
          <StatCard
            icon={<Heart className="h-5 w-5" />}
            label="Badges"
            value={badges.length.toString()}
            color="text-pink-500"
          />
        </div>

        {/* Progresso de Nível */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Progresso de Nível</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Nível {profile.collector_level}</span>
              <span className="text-muted-foreground">
                {profile.collector_xp % xpForNextLevel} / {xpForNextLevel} XP
              </span>
            </div>
            <Progress value={xpProgress} className="h-3" />
          </CardContent>
        </Card>

        {/* Badges */}
        {badges.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Badges Conquistados ({badges.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {badges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coleção Pública */}
        <Card>
          <CardHeader>
            <CardTitle>Coleção Pública ({collection.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {collection.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Este colecionador ainda não adicionou peças à coleção pública.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {collection.map((item) => (
                  <CollectionCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`${color}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BadgeCard({ badge }: { badge: BadgeData }) {
  const rarityColors = {
    common: "border-gray-400 bg-gray-50",
    rare: "border-blue-400 bg-blue-50",
    epic: "border-purple-400 bg-purple-50",
    legendary: "border-yellow-400 bg-yellow-50",
  };

  return (
    <div
      className={`border-2 rounded-lg p-4 ${rarityColors[badge.rarity as keyof typeof rarityColors]}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{badge.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm">{badge.name}</h3>
            <Badge variant="secondary" className="text-xs capitalize">
              {badge.rarity}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(badge.earned_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
    </div>
  );
}

function CollectionCard({ item }: { item: CollectionItem }) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square relative bg-muted">
        {item.model.image_url ? (
          <img
            src={item.model.image_url}
            alt={item.model.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sem imagem
          </div>
        )}
      </div>
      <CardContent className="pt-4">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{item.model.name}</h3>
        {item.model.franchise_name && (
          <p className="text-xs text-muted-foreground mb-2">{item.model.franchise_name}</p>
        )}
        {item.notes && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">{item.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <div className="container py-12 max-w-6xl">
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex gap-6 items-center">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 sm:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function calculateXPForNextLevel(level: number): number {
  if (level < 2) return 100;
  if (level < 3) return 200;
  if (level < 4) return 300;
  if (level < 5) return 400;
  return 500;
}
