import { supabase } from "@/integrations/supabase/client";

type RpcError = { message?: string } | null;

export interface NextRelease {
  collection_id: string | null;
  collection_slug?: string | null;
  collection_name: string;
  character_name: string;
  character_image: string | null;
  release_date: string;
  days_until_release: number;
}

interface NextReleaseRpcClient {
  rpc(functionName: "get_next_release"): PromiseLike<{
    data: NextRelease[] | null;
    error: RpcError;
  }>;
}

const nextReleaseRpc = supabase as unknown as NextReleaseRpcClient;

export async function getNextRelease(): Promise<NextRelease | null> {
  const { data, error } = await nextReleaseRpc.rpc("get_next_release");

  if (error) {
    throw new Error(error.message ?? "Erro ao buscar proximo lancamento");
  }

  const nextRelease = data?.[0] ?? null;

  if (!nextRelease?.collection_id) {
    return nextRelease;
  }

  const { data: collectionData } = await supabase
    .from("collections")
    .select("slug")
    .eq("id", nextRelease.collection_id)
    .maybeSingle();

  return {
    ...nextRelease,
    collection_slug: collectionData?.slug ?? null,
  };
}
