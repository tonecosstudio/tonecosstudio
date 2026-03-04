// @ts-nocheck
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ModelRow } from "../catalogTypes";

export function useForYouModels(params: {
  userId: string | null | undefined;
  needle: string;
  likedIds: Set<string>;
  profilePreferenceTags: unknown;
  profileLoading: boolean;
}) {
  const { userId, needle, likedIds, profilePreferenceTags, profileLoading } = params;

  const preferenceTags = useMemo(() => {
    const tags = (Array.isArray(profilePreferenceTags) ? profilePreferenceTags : []) as unknown[];
    return new Set((tags ?? []).map((t) => String(t).trim().toLocaleLowerCase()).filter(Boolean));
  }, [profilePreferenceTags]);

  const preferenceTagKey = useMemo(
    () => Array.from(preferenceTags).sort().join("|"),
    [preferenceTags]
  );

  const query = useQuery({
    queryKey: ["models_for_you", { userId: userId ?? null, preferenceTagKey }],
    enabled: Boolean(userId) && !needle && !profileLoading,
    queryFn: async () => {
      const exclude = Array.from(likedIds).slice(0, 50);
      let q = supabase
        .from("models")
        .select("id,name,franchise,category,subcategory,tags,image_bucket,image_path,created_at")
        .order("created_at", { ascending: false })
        .limit(8);

      if (exclude.length) {
        q = q.not("id", "in", `(${exclude.map((id) => `"${id}"`).join(",")})`);
      }

      const { data, error } = await q;
      if (error) throw error;

      const out = (data ?? []) as ModelRow[];

      if (preferenceTags.size) {
        const score = (m: ModelRow) => {
          const tags = (m.tags ?? [])
            .map((t) => String(t).trim().toLocaleLowerCase())
            .filter(Boolean);
          let s = 0;
          for (const t of tags) if (preferenceTags.has(t)) s++;
          return s;
        };
        out.sort((a, b) => score(b) - score(a));
      }

      return out;
    },
    staleTime: 15_000,
  });

  return { ...query, preferenceTags, preferenceTagKey };
}
