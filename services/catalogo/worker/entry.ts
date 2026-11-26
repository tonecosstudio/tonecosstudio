import apiWorker from './index'
import { PUBLIC_MEDIA_PREFIX, servePublicMedia, type PublicMediaBucket } from './media'
import { BLACKFRIDAY_DRIVE_ROUTE, routeBlackFridayDrive, type BlackFridayDriveEnv } from './blackFridayDrive'
import { validatePublicCatalogQuery } from './publicQueryBudget'
import type { TelegramDraftAccessContext } from './telegramDrafts'

type ApiEnv = Parameters<typeof apiWorker.fetch>[1] & BlackFridayDriveEnv

export default {
  async fetch(request: Request, env: ApiEnv, ctx?: { waitUntil(promise: Promise<unknown>): void } & TelegramDraftAccessContext): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === BLACKFRIDAY_DRIVE_ROUTE) {
      return routeBlackFridayDrive(request, env, async (path) => {
        const source = new Request(new URL(path, url.origin), { method: 'GET' })
        if (new URL(source.url).pathname.startsWith(PUBLIC_MEDIA_PREFIX)) {
          return servePublicMedia(source, env.MEDIA as unknown as PublicMediaBucket)
        }
        return apiWorker.fetch(source, env)
      })
    }
    if (url.pathname.startsWith(PUBLIC_MEDIA_PREFIX)) {
      // Immutable R2 keys never accept cache-busting query suffixes.
      if ((request.method === 'GET' || request.method === 'HEAD') &&
          validatePublicCatalogQuery(url) === false) {
        return new Response(null, { status: 400, headers: { 'cache-control': 'no-store' } })
      }
      return servePublicMedia(request, env.MEDIA as unknown as PublicMediaBucket)
    }
    return apiWorker.fetch(request, env, ctx)
  },
}
