type PublicEdgeCache = {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}
export type BackgroundTasks = { waitUntil(promise: Promise<unknown>): void }

/**
 * Reuse the existing Cloudflare edge cache on anonymous public metadata only.
 * No cache namespace, KV, R2 objects or D1 counters are created. Details,
 * individual media, errors and authenticated requests always recheck storage.
 * Cache API is regional; a miss in another colo is not a publication grant.
 */
export async function serveCachedPublicMetadata(
  request: Request,
  build: () => Promise<Response>,
  background?: BackgroundTasks,
  normalize?: (url: URL) => void,
): Promise<Response> {
  const allowed = request.method === 'GET' &&
    !request.headers.has('authorization') && !request.headers.has('cookie') &&
    !request.headers.has('origin') && !request.headers.has('range') && !request.headers.has('if-none-match') &&
    !request.headers.has('if-modified-since')
  const cache = allowed
    ? (globalThis as unknown as { caches?: { default?: PublicEdgeCache } }).caches?.default
    : undefined
  if (!cache) return build()

  // The route already validated allowed parameters and rejected duplicates.
  // Canonicalize equivalent public-list URLs so parameter order and omitted
  // pagination defaults do not multiply D1 reads on regional cache misses.
  // Do not normalize studio, search, category or provisional filters.
  const cacheUrl = new URL(request.url)
  normalize?.(cacheUrl)
  cacheUrl.searchParams.sort()
  // Recreate a header-free request: user-controlled headers never vary the key.
  const key = new Request(cacheUrl.toString(), { method: 'GET' })
  try {
    const hit = await cache.match(key)
    if (hit?.status === 200) return hit
  } catch {
    // An unavailable cache is a miss, never a catalog outage.
  }

  const response = await build()
  if (response.status === 200 && response.headers.get('cache-control')?.startsWith('public,') &&
      !response.headers.has('set-cookie') && !response.headers.has('content-range') &&
      response.headers.get('content-type')?.startsWith('application/json')) {
    const write = cache.put(key, response.clone()).catch(() => {
      // Cache insertion failures must never hide a valid D1 response.
    })
    if (background) background.waitUntil(write)
    else await write
  }
  return response
}

