import { differenceInCalendarDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";

const RELEASE_TIME_ZONE = "America/Bahia";

export interface NextRelease {
  collection_id: string | null;
  collection_slug?: string | null;
  collection_name: string;
  character_name: string;
  character_image: string | null;
  release_date: string;
  days_until_release: number;
}

function todayDateString(): string {
  return formatInTimeZone(new Date(), RELEASE_TIME_ZONE, "yyyy-MM-dd");
}

function parseReleaseDate(date: string): Date {
  return fromZonedTime(`${date}T00:00:00`, RELEASE_TIME_ZONE);
}

function startOfTodayInBahia(): Date {
  return fromZonedTime(`${todayDateString()}T00:00:00`, RELEASE_TIME_ZONE);
}

export async function getNextRelease(): Promise<NextRelease | null> {
  const { data, error } = await supabase
    .from("collection_characters")
    .select(
      `
        collection_id,
        name,
        image_url,
        release_date,
        collections!inner (
          name,
          slug,
          is_active,
          status
        )
      `,
    )
    .not("release_date", "is", null)
    .gte("release_date", todayDateString())
    .eq("collections.is_active", true)
    .eq("collections.status", "active")
    .neq("status", "archived")
    .order("release_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar proximo lancamento: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  if (!data.release_date || !data.name || !data.collections?.name) {
    throw new Error("Proximo lancamento retornou dados incompletos");
  }

  return {
    collection_id: data.collection_id,
    collection_slug: data.collections.slug,
    collection_name: data.collections.name,
    character_name: data.name,
    character_image: data.image_url,
    release_date: data.release_date,
    days_until_release: Math.max(
      0,
      differenceInCalendarDays(parseReleaseDate(data.release_date), startOfTodayInBahia()),
    ),
  };
}
