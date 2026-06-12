import { supabase } from "@/integrations/supabase/client";
import { catalogModelDetailsPath } from "@/config/routes";
import { COLLECTION_CATALOG_VISIBILITIES } from "@/config/catalog";

export type PublicCollectionPreview = {
  id: string;
  name: string;
  slug?: string;
  description: string | null;
  cover_image_url: string | null;
  image_url?: string | null;
  total_characters?: number | null;
  is_active?: boolean;
};

export async function listActiveCollectionPreviews(
  limit = 3,
): Promise<PublicCollectionPreview[]> {
  const { data, error } = await supabase
    .from("collections")
    .select(
      "id,name,slug,description,cover_image_url,total_characters,is_active",
    )
    .eq("is_active", true)
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PublicCollectionPreview[];
}

export type ShowcaseCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  total_characters: number | null;
  is_active: boolean;
};

export type ArcadeCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  character_count: number;
};

export type ArcadeCatalogCharacter = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_catalog: boolean;
  price_category_id: string | null;
  price_category_name?: string | null;
  price_category_display_name: string | null;
  price_coins: number | null;
  price_standalone: number | null;
  price_category_order?: number;
  status: string;
};

export type CollectionDetailsCharacter = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  detail_url?: string | null;
  release_order: number | null;
  release_month: number | null;
  release_date: string | null;
  unlock_override: boolean;
  is_catalog: boolean | null;
  status: string | null;
};

export type CollectionDetails = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  collection_characters: CollectionDetailsCharacter[];
};

export type CharacterSelectCharacter = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  release_order: number;
  status: string;
};

export type CharacterSelectCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  collection_characters: CharacterSelectCharacter[];
};

export type CharacterDetailsData = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  status: string;
  is_catalog: boolean;
  collection_id: string;
  franchise: string | null;
  product_line: string | null;
  theme_category: string | null;
  release_order: number | null;
  release_month: number | null;
  release_date: string | null;
  stock_quantity: number | null;
  price_category_id: string | null;
  price_categories: {
    display_name: string;
    price_coins: number;
    price_standalone: number;
  } | null;
  collections: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    total_characters: number | null;
  } | null;
};

export type RelatedCharacter = {
  id: string;
  name: string;
  image_url: string | null;
  status: string;
};

type CatalogCharacterPriceCategory = {
  name: string | null;
  display_name: string | null;
  price_coins: number | null;
  price_standalone: number | null;
  display_order: number | null;
};

type CatalogCharacterDbRow = Omit<
  ArcadeCatalogCharacter,
  | "price_category_name"
  | "price_category_display_name"
  | "price_coins"
  | "price_standalone"
  | "price_category_order"
> & {
  price_categories?: CatalogCharacterPriceCategory | null;
};

type ArcadeCollectionDbRow = Omit<
  ArcadeCollection,
  "character_count" | "image_url"
> & {
  cover_image_url: string | null;
};

type CharacterSelectCollectionDbRow = Omit<
  CharacterSelectCollection,
  "image_url"
> & {
  cover_image_url: string | null;
};

type CollectionCharacterDbRow = {
  id: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  is_catalog: boolean | null;
  release_order: number | null;
  release_month: number | null;
  release_date: string | null;
  unlock_override: boolean | null;
  status: string | null;
  source_model_id: string | null;
};

type CollectionModelDbRow = {
  id: string;
  name: string;
  description: string | null;
  image_bucket: string | null;
  image_path: string | null;
  thumbnail_url: string | null;
};

function getPublicStorageUrl(bucket: string | null, path: string | null) {
  if (!bucket || !path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function normalizeCharacterDetailsRow(
  row: Partial<CharacterDetailsData> | null,
): CharacterDetailsData | null {
  if (!row?.id || !row.name || !row.collection_id) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    image_url: row.image_url ?? null,
    image_urls: Array.isArray(row.image_urls)
      ? row.image_urls
      : row.image_url
        ? [row.image_url]
        : null,
    status: row.status ?? "released",
    is_catalog: row.is_catalog === true,
    collection_id: row.collection_id,
    franchise: row.franchise ?? null,
    product_line: row.product_line ?? null,
    theme_category: row.theme_category ?? null,
    release_order: row.release_order ?? null,
    release_month: row.release_month ?? null,
    release_date: row.release_date ?? null,
    stock_quantity: row.stock_quantity ?? null,
    price_category_id: row.price_category_id ?? null,
    price_categories: row.price_categories ?? null,
    collections: row.collections
      ? {
          id: row.collections.id,
          name: row.collections.name,
          slug: row.collections.slug,
          description: row.collections.description ?? null,
          cover_image_url: row.collections.cover_image_url ?? null,
          total_characters: row.collections.total_characters ?? null,
        }
      : null,
  };
}

function mapCollectionCharacter(
  character: CollectionCharacterDbRow,
  index: number,
): CollectionDetailsCharacter {
  return {
    id: character.id,
    name: character.name || "Personagem",
    description: character.description,
    image_url: character.image_url,
    detail_url: null,
    release_order: character.release_order ?? index + 1,
    release_month: character.release_month,
    release_date: character.release_date,
    unlock_override: character.unlock_override ?? false,
    is_catalog: character.is_catalog ?? false,
    status: character.status ?? "released",
  };
}

function mapCollectionModel(
  model: CollectionModelDbRow,
  index: number,
): CollectionDetailsCharacter {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    image_url:
      model.thumbnail_url ||
      getPublicStorageUrl(model.image_bucket, model.image_path),
    detail_url: catalogModelDetailsPath(model.id, model.name),
    release_order: index + 1,
    release_month: null,
    release_date: null,
    unlock_override: false,
    is_catalog: false,
    status: "released",
  };
}

export async function listShowcaseCollections(): Promise<ShowcaseCollection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select(
      "id, name, slug, description, cover_image_url, total_characters, is_active",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ShowcaseCollection[];
}

export async function listArcadeCollectionsWithCounts(): Promise<
  ArcadeCollection[]
> {
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, slug, description, cover_image_url, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return Promise.all(
    ((data ?? []) as ArcadeCollectionDbRow[]).map(async (collection) => {
      const { count, error: countError } = await supabase
        .from("collection_characters")
        .select("*", { count: "exact", head: true })
        .eq("collection_id", collection.id)
        .eq("is_catalog", false);

      if (countError) throw countError;
      return {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        image_url: collection.cover_image_url,
        is_active: collection.is_active,
        character_count: count ?? 0,
      };
    }),
  );
}

export async function listReleasedCatalogCharacters(): Promise<
  ArcadeCatalogCharacter[]
> {
  const { data, error } = await supabase
    .from("collection_characters")
    .select(
      `
        id,
        name,
        description,
        image_url,
        is_catalog,
        price_category_id,
        status,
        price_categories (
          name,
          display_name,
          price_coins,
          price_standalone,
          display_order
        )
      `,
    )
    .eq("is_catalog", true)
    .eq("status", "released")
    .order("name", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as CatalogCharacterDbRow[]).map((character) => ({
    ...character,
    price_category_name: character.price_categories?.name,
    price_category_display_name:
      character.price_categories?.display_name ?? null,
    price_coins: character.price_categories?.price_coins ?? null,
    price_standalone: character.price_categories?.price_standalone ?? null,
    price_category_order: character.price_categories?.display_order ?? 999,
    price_categories: undefined,
  }));
}

export async function getCollectionDetailsBySlug(
  slug: string,
): Promise<CollectionDetails | null> {
  const { data: collectionData, error: collectionError } = await supabase
    .from("collections")
    .select("id, name, slug, description, cover_image_url, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (collectionError) throw collectionError;
  if (!collectionData) return null;

  const { data: charactersData, error: charactersError } = await supabase
    .from("collection_characters")
    .select(
      "id, name, description, image_url, is_catalog, release_order, release_month, release_date, unlock_override, status, source_model_id",
    )
    .eq("collection_id", collectionData.id)
    .order("release_order", { ascending: true });

  if (charactersError) throw charactersError;

  const legacyCharacters = (
    (charactersData ?? []) as CollectionCharacterDbRow[]
  ).map(mapCollectionCharacter);

  if (legacyCharacters.length > 0) {
    return {
      ...(collectionData as Omit<CollectionDetails, "collection_characters">),
      collection_characters: legacyCharacters,
    };
  }

  const { data: modelData, error: modelError } = await supabase
    .from("models")
    .select("id, name, description, image_bucket, image_path, thumbnail_url")
    .eq("collection_id", collectionData.id)
    .eq("is_active", true)
    .in("catalog_visibility", COLLECTION_CATALOG_VISIBILITIES)
    .order("name", { ascending: true });

  if (modelError) throw modelError;

  const catalogCharacters = ((modelData ?? []) as CollectionModelDbRow[]).map(
    mapCollectionModel,
  );

  return {
    ...(collectionData as Omit<CollectionDetails, "collection_characters">),
    collection_characters: catalogCharacters,
  };
}

export async function listCollectionsWithCharacters(): Promise<
  CharacterSelectCollection[]
> {
  const { data, error } = await supabase
    .from("collections")
    .select(
      `
        id, name, slug, description, cover_image_url, is_active,
        collection_characters (id, name, description, image_url, release_order, status)
      `,
    )
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as CharacterSelectCollectionDbRow[]).map(
    (collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      image_url: collection.cover_image_url,
      is_active: collection.is_active,
      collection_characters: collection.collection_characters,
    }),
  );
}

export async function getCharacterDetailsById(
  characterId: string,
): Promise<CharacterDetailsData | null> {
  const characterDetailsSelect = `
    id, name, description, image_url, image_urls, status, is_catalog,
    collection_id, franchise, product_line, theme_category,
    release_order, release_month, release_date, stock_quantity,
    price_category_id,
    price_categories (display_name, price_coins, price_standalone),
    collections (id, name, slug, description, cover_image_url, total_characters)
  `;

  const { data, error } = await supabase
    .from("collection_characters")
    .select(characterDetailsSelect)
    .eq("id", characterId)
    .maybeSingle();

  if (error) throw error;
  return normalizeCharacterDetailsRow(
    (data ?? null) as Partial<CharacterDetailsData> | null,
  );
}

export async function listRelatedCharacters(
  collectionId: string,
  characterId: string,
): Promise<RelatedCharacter[]> {
  const { data, error } = await supabase
    .from("collection_characters")
    .select("id, name, image_url, status")
    .eq("collection_id", collectionId)
    .neq("id", characterId)
    .eq("status", "released")
    .order("release_order", { ascending: true })
    .limit(6);

  if (error) throw error;
  return (data ?? []) as RelatedCharacter[];
}
