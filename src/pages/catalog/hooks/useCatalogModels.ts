import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ModelRow } from "../catalogTypes";
import { PAGE_SIZE } from "../catalogTypes";

export type CatalogSort = "recent" | "az";

export function useCatalogModels(
  needle: string,
  page: number,
  filters: {
    franchise: string;
    category: string;
    tagsCSV: string;
    sort: CatalogSort;
  }
) {
  return useQuery({
    queryKey: [
      "models",
      {
        q: needle,
        page,
        pageSize: PAGE_SIZE,
        franchise: filters.franchise,
        category: filters.category,
        tagsCSV: filters.tagsCSV,
        sort: filters.sort,
      },
    ],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE;

      let query = supabase
        .from("models")
        .select("id,name,franchise,category,subcategory,tags,image_bucket,image_path,created_at")
        .range(from, to);

      if (filters.sort === "az") query = query.order("name", { ascending: true });
      else query = query.order("created_at", { ascending: false });

      if (needle) {
        if (needle.length <= 2) query = query.ilike("name", `${needle}%`);
        else query = query.ilike("name", `%${needle}%`);
      }

      const franchise = (filters.franchise ?? "").trim();
      if (franchise) query = query.ilike("franchise", `%${franchise}%`);

      const category = (filters.category ?? "").trim();
      if (category) query = query.eq("category", category);

      const tags = (filters.tagsCSV ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10);
      if (tags.length) query = query.overlaps("tags", tags);

      const { data, error } = await query;
      if (error) throw error;

      const all = (data ?? []) as ModelRow[];
      // .range(from, to) é inclusivo; com to=from+PAGE_SIZE, buscamos PAGE_SIZE+1 para detectar "próxima página".
      const hasNext = all.length > PAGE_SIZE;
      const rows = hasNext ? all.slice(0, PAGE_SIZE) : all;

      return { rows, hasNext };
    },
  });
}
