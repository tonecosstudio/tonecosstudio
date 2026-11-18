import { createSharedCollection, getSharedCollection } from './sharedCollections'
import { aggregateGallerySources, type GallerySourceState } from './galleryAggregation'
import { type GalleryModelState } from './galleryValidation'
import { catalogSchemaStatus } from './schemaContract'
import { configuredPublicOrigins, validateTurnstile } from './turnstile'
import { RESOLVED_MODEL_BY_SLUG_CTE, resolvePublicModelIds } from './modelAliases'
import { validatePublicCatalogQuery } from './publicQueryBudget'

type D1Statement = {
  bind(...values: unknown[]): D1Statement
  all<T = unknown>(): Promise<{ results: T[] }>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<unknown>
}

type D1Database = {
  prepare(sql: string): D1Statement
  batch(statements: D1Statement[]): Promise<unknown>
}

type R2ObjectBody = {
  json<T = unknown>(): Promise<T>
}

type R2Bucket = {
  get(key: string): Promise<R2ObjectBody | null>
}

type Env = {
  DB: D1Database
  MEDIA: R2Bucket
  CORS_ORIGINS: string
  TURNSTILE_SECRET_KEY?: string
}

type CatalogRow = {
  id: string
  slug: string
  code: string
  name: string
  variant_name: string
  franchise: string
  franchise_slug: string
  category: string
  category_slug: string
  collection: string | null
  folder_path: string | null
  material: string | null
  height_cm: number | null
  image_count: number
  gallery_version: number
  cover_storage_key: string | null
}

type CatalogCursor = {
  name: string
  id: string
}

type QuoteRecord = {
  id: string
  reference: string | null
}

type EditorialEvidence = {
  id: string
  title: string
  url: string
  kind: 'official' | 'primary' | 'publisher' | 'catalog'
}

type EditorialIdentityRow = Record<string, unknown> & {
  id: string
  slug: string
  name: string
  franchise_id: number
  revision: string
  reviewed_at: string
  approval_ref: string
  evidence_json: string
  identity_evidence_ids_json: string
}

type EditorialUniverseRow = Record<string, unknown> & {
  franchise_id: number
  universe_slug: string
  universe_name: string
  category_slug: string
  revision: string
  reviewed_at: string
  approval_ref: string
  evidence_json: string
  identity_evidence_ids_json: string
}

type EditorialModelRow = {
  model_id: string
  slug: string
  name: string
  variant_name: string
  cover_storage_key: string | null
  evidence_ids_json?: string
}

const MAX_QUOTE_ITEMS = 50
const QUOTE_DEDUP_MINUTES = 10

const LOGICAL_IMAGE_COUNT_SQL = `(
  m.image_count + COALESCE((
    SELECT SUM(source.image_count)
    FROM model_gallery_members gallery_member
    JOIN models source ON source.id=gallery_member.source_model_id
    WHERE gallery_member.canonical_model_id=m.id
  ), 0)
)`

const PUBLIC_GALLERY_VERSION_SQL = 'm.public_gallery_version'

function allowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get('origin')
  if (!origin) return null
  const configured = configuredPublicOrigins(env.CORS_ORIGINS)
  return configured.includes(origin) ? origin : null
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = allowedOrigin(request, env)
  if (!origin) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'vary': 'Origin',
  }
}

function json(request: Request, env: Env, data: unknown, init: ResponseInit = {}, cacheControl = 'no-store') {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', cacheControl)
  for (const [name, value] of Object.entries(corsHeaders(request, env))) headers.set(name, value)
  return new Response(JSON.stringify(data), { ...init, headers })
}

function options(request: Request, env: Env) {
  if (!allowedOrigin(request, env)) return new Response(null, { status: 403 })
  return new Response(null, { status: 204, headers: corsHeaders(request, env) })
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function encodeUtf8Base64Url(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeUtf8Base64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeCatalogCursor(row: Pick<CatalogRow, 'name' | 'id'>) {
  return encodeUtf8Base64Url(JSON.stringify({ name: row.name, id: row.id }))
}

function decodeCatalogCursor(cursor: string | null): CatalogCursor | null {
  if (!cursor) return null
  try {
    const parsed = JSON.parse(decodeUtf8Base64Url(cursor)) as Partial<CatalogCursor>
    if (typeof parsed.name !== 'string' || typeof parsed.id !== 'string' || !parsed.id) return null
    return { name: parsed.name, id: parsed.id }
  } catch {
    return null
  }
}

function decodeOffsetCursor(cursor: string | null): number | null {
  if (!cursor) return 0
  try {
    const parsed = Number.parseInt(atob(cursor), 10)
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
  } catch {
    return null
  }
}

function toFtsPhrase(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function quoteReference(id: string) {
  const compact = id.replace(/-/g, '').slice(0, 20).toUpperCase()
  return `TCS-${compact.match(/.{1,4}/g)?.join('-') ?? compact}`
}

async function deterministicQuoteId(name: string, email: string, notes: string, modelIds: string[]) {
  const bucket = Math.floor(Date.now() / (QUOTE_DEDUP_MINUTES * 60_000))
  const canonical = JSON.stringify({ bucket, name, email, notes, modelIds: [...modelIds].sort() })
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

async function findRecentDuplicateQuote(env: Env, name: string, email: string, notes: string, modelIds: string[]) {
  const placeholders = modelIds.map(() => '?').join(',')
  return env.DB.prepare(`SELECT qr.id,qr.reference
    FROM quote_requests qr
    WHERE qr.name=? AND qr.email=? AND COALESCE(qr.notes,'')=?
      AND qr.created_at >= datetime('now', '-${QUOTE_DEDUP_MINUTES} minutes')
      AND (SELECT COUNT(*) FROM quote_request_items qi WHERE qi.quote_request_id=qr.id)=?
      AND (SELECT COUNT(*) FROM quote_request_items qi WHERE qi.quote_request_id=qr.id AND qi.model_id IN (${placeholders}))=?
    ORDER BY qr.created_at DESC
    LIMIT 1`)
    .bind(name, email, notes, modelIds.length, ...modelIds, modelIds.length)
    .first<QuoteRecord>()
}

function quoteResponse(request: Request, env: Env, quote: QuoteRecord, deduplicated: boolean, status = 200) {
  return json(request, env, {
    reference: quote.reference || quoteReference(quote.id),
    status: 'received',
    deduplicated,
  }, { status })
}

const encodeOffsetCursor = (offset: number) => btoa(String(offset))

async function listCategories(request: Request, env: Env) {
  // Select only the top franchise per category using the canonical discovery index.
  // Ranking the entire franchise table with ROW_NUMBER() scans every franchise on
  // each cache miss; these correlated lookups use existing covering indexes instead.
  const result = await env.DB.prepare(`SELECT c.slug AS id,c.name AS label,c.model_count AS count,
      (SELECT m.cover_storage_key
       FROM models m
       WHERE m.franchise_id=(
         SELECT f.id FROM franchises f
         WHERE f.category_id=c.id
         ORDER BY f.model_count DESC,f.name COLLATE NOCASE,f.id
         LIMIT 1
       )
         AND m.published=1
         AND m.cover_storage_key IS NOT NULL
       ORDER BY m.image_count DESC,m.name COLLATE NOCASE,m.id
       LIMIT 1) AS cover_storage_key
    FROM categories c
    ORDER BY c.sort_order,c.name COLLATE NOCASE`)
    .all<{ id: string; label: string; count: number; cover_storage_key: string | null }>()
  const total = result.results.reduce((sum, item) => sum + Number(item.count || 0), 0)
  return json(request, env, {
    items: [{ id: 'all', label: 'Todos', count: total, cover_storage_key: null }, ...result.results],
  }, {}, 'public, max-age=300, s-maxage=1800')
}

async function listFranchises(request: Request, env: Env) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')?.trim() || null
  const query = url.searchParams.get('q')?.trim().toLocaleLowerCase('pt-BR') || null
  const limit = clamp(Number.parseInt(url.searchParams.get('limit') ?? '24', 10) || 24, 1, 48)

  if (query) {
    const length = Array.from(query).length
    if (length < 3) return json(request, env, { error: 'franchise_search_too_short', minLength: 3 }, { status: 400 })
    if (length > 80) return json(request, env, { error: 'franchise_search_too_long', maxLength: 80 }, { status: 400 })
  }

  const where: string[] = []
  const values: unknown[] = []
  if (category) {
    where.push('c.slug=?')
    values.push(category)
  }
  if (query) {
    where.push('franchises_fts MATCH ?')
    values.push(toFtsPhrase(query))
  }

  const searchJoin = query ? 'JOIN franchises_fts ON franchises_fts.franchise_id=f.id' : ''
  const sql = `SELECT f.slug AS id,f.name AS label,f.model_count AS count,c.slug AS category,
      (SELECT m.cover_storage_key
       FROM models m
       WHERE m.franchise_id=f.id
         AND m.published=1
         AND m.cover_storage_key IS NOT NULL
       ORDER BY m.image_count DESC,m.name COLLATE NOCASE,m.id
       LIMIT 1) AS cover_storage_key
    FROM franchises f
    JOIN categories c ON c.id=f.category_id
    ${searchJoin}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY f.model_count DESC,f.name COLLATE NOCASE,f.id
    LIMIT ?`
  values.push(limit + 1)
  const result = await env.DB.prepare(sql).bind(...values)
    .all<{ id: string; label: string; count: number; category: string; cover_storage_key: string | null }>()
  const truncated = result.results.length > limit
  const items = truncated ? result.results.slice(0, limit) : result.results
  const cacheControl = query ? 'public, max-age=60, s-maxage=300' : 'public, max-age=300, s-maxage=1800'
  return json(request, env, { items, truncated }, {}, cacheControl)
}

function editorialArray(value: unknown, field: string, max: number): unknown[] {
  let parsed = value
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value) } catch { throw new Error(field) }
  }
  if (!Array.isArray(parsed) || parsed.length > max) throw new Error(field)
  return parsed
}

function editorialText(value: unknown, field: string, max = 4000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max ||
      value !== value.trim() || Array.from(value).some(char => {
        const code = char.charCodeAt(0)
        return code <= 31 && code !== 9 && code !== 10 || code === 127
      })) throw new Error(field)
  return value
}

function editorialOptionalText(value: unknown, field: string, max = 4000): string | null {
  if (value === null || value === undefined || value === '') return null
  return editorialText(value, field, max)
}

function editorialEvidence(value: unknown): EditorialEvidence[] {
  const rows = editorialArray(value, 'editorial_evidence_invalid', 80)
  const seen = new Set<string>()
  return rows.map((item): EditorialEvidence => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('editorial_evidence_item_invalid')
    }
    const row = item as Record<string, unknown>
    const id = editorialText(row.id, 'editorial_evidence_id_invalid', 120)
    if (seen.has(id)) throw new Error('editorial_evidence_duplicate')
    seen.add(id)
    const kind = row.kind
    if (!['official', 'primary', 'publisher', 'catalog'].includes(kind as string)) {
      throw new Error('editorial_evidence_kind_invalid')
    }
    const rawUrl = editorialText(row.url, 'editorial_evidence_url_invalid', 2048)
    let url: URL
    try { url = new URL(rawUrl) } catch { throw new Error('editorial_evidence_url_invalid') }
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error('editorial_evidence_url_invalid')
    }
    return {
      id,
      title: editorialText(row.title, 'editorial_evidence_title_invalid', 200),
      url: url.toString(),
      kind: kind as EditorialEvidence['kind'],
    }
  })
}

function editorialEvidenceIds(
  value: unknown,
  evidence: EditorialEvidence[],
  field: string,
  requireIndependent = true,
): string[] {
  const ids = editorialArray(value, field, 40).map((item) =>
    editorialText(item, field + '_id', 120),
  )
  const evidenceById = new Map(evidence.map(item => [item.id, item]))
  if (!ids.length || new Set(ids).size !== ids.length ||
      ids.some(id => !evidenceById.has(id)) ||
      (requireIndependent && !ids.some(id => evidenceById.get(id)?.kind !== 'catalog'))) {
    throw new Error(field)
  }
  return ids
}

function mergeEditorialEvidence(...groups: EditorialEvidence[][]): EditorialEvidence[] {
  const evidence = new Map<string, EditorialEvidence>()
  for (const group of groups) {
    for (const item of group) {
      const previous = evidence.get(item.id)
      if (previous && JSON.stringify(previous) !== JSON.stringify(item)) {
        throw new Error('editorial_evidence_conflict')
      }
      evidence.set(item.id, item)
    }
  }
  if (evidence.size > 200) throw new Error('editorial_evidence_limit')
  return [...evidence.values()]
}

function editorialPublication(row: { revision: string; reviewed_at: string; approval_ref: string }) {
  const reviewedAt = editorialText(row.reviewed_at, 'editorial_reviewed_at_invalid', 40)
  if (!Number.isFinite(Date.parse(reviewedAt))) throw new Error('editorial_reviewed_at_invalid')
  editorialText(row.approval_ref, 'editorial_approval_ref_invalid', 240)
  return {
    contractVersion: 1,
    editorialStatus: 'approved' as const,
    visibility: 'public' as const,
    revision: editorialText(row.revision, 'editorial_revision_invalid', 120),
    reviewedAt,
  }
}

function editorialAliases(value: unknown, evidence: EditorialEvidence[]) {
  const aliases = editorialArray(value, 'editorial_aliases_invalid', 40)
  const seen = new Set<string>()
  return aliases.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('editorial_alias_invalid')
    }
    const row = item as Record<string, unknown>
    const alias = editorialText(row.value, 'editorial_alias_value_invalid', 160)
    const key = alias.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) throw new Error('editorial_alias_duplicate')
    seen.add(key)
    return {
      value: alias,
      evidenceIds: editorialEvidenceIds(row.evidenceIds, evidence, 'editorial_alias_evidence'),
    }
  })
}

function editorialClaims(value: unknown, evidence: EditorialEvidence[], field: string) {
  const claims = editorialArray(value, field + '_invalid', 30)
  const seen = new Set<string>()
  return claims.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(field + '_item_invalid')
    }
    const row = item as Record<string, unknown>
    const claim = editorialText(row.value, field + '_value_invalid', 240)
    const key = claim.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) throw new Error(field + '_duplicate')
    seen.add(key)
    return {
      value: claim,
      evidenceIds: editorialEvidenceIds(row.evidenceIds, evidence, field + '_evidence'),
    }
  })
}

function editorialStringList(value: unknown, field: string, max = 40): string[] {
  const result = editorialArray(value, field, max).map((item) =>
    editorialText(item, field + '_item', 160),
  )
  if (new Set(result).size !== result.length) throw new Error(field + '_duplicate')
  return result
}

function editorialUniverseData(row: EditorialUniverseRow, evidence = editorialEvidence(row.evidence_json)) {
  return {
    id: String(row.franchise_id),
    slug: editorialSlug(row.universe_slug),
    name: editorialText(row.universe_name, 'editorial_universe_name_invalid', 240),
    categorySlug: editorialSlug(row.category_slug),
    mediaTypes: editorialStringList(row.media_types_json, 'editorial_universe_media_types'),
    summary: editorialOptionalText(row.summary, 'editorial_universe_summary'),
    summaryEvidenceIds: row.summary
      ? editorialEvidenceIds(row.summary_evidence_ids_json, evidence, 'editorial_universe_summary_evidence')
      : [],
    overview: editorialOptionalText(row.overview, 'editorial_universe_overview'),
    overviewEvidenceIds: row.overview
      ? editorialEvidenceIds(row.overview_evidence_ids_json, evidence, 'editorial_universe_overview_evidence')
      : [],
    identityEvidenceIds: editorialEvidenceIds(
      row.identity_evidence_ids_json,
      evidence,
      'editorial_universe_identity_evidence',
    ),
  }
}

function editorialCharacterData(row: EditorialIdentityRow, evidence = editorialEvidence(row.evidence_json)) {
  const ageValue = editorialOptionalText(row.age_value, 'editorial_character_age', 200)
  const ageContext = editorialOptionalText(row.age_context, 'editorial_character_age_context', 500)
  if (Boolean(ageValue) !== Boolean(ageContext)) throw new Error('editorial_character_age_context_invalid')
  const summary = editorialOptionalText(row.summary, 'editorial_character_summary')
  const biography = editorialOptionalText(row.biography, 'editorial_character_biography', 6000)
  const originWork = editorialOptionalText(row.origin_work, 'editorial_character_origin_work', 240)
  const mediaTypes = editorialStringList(row.media_types_json, 'editorial_character_media_types')
  return {
    id: editorialText(row.id, 'editorial_character_id_invalid', 120),
    slug: editorialSlug(row.slug),
    name: editorialText(row.name, 'editorial_character_name_invalid', 240),
    aliases: editorialAliases(row.aliases_json, evidence),
    summary,
    summaryEvidenceIds: summary
      ? editorialEvidenceIds(row.summary_evidence_ids_json, evidence, 'editorial_character_summary_evidence')
      : [],
    biography,
    biographyEvidenceIds: biography
      ? editorialEvidenceIds(row.biography_evidence_ids_json, evidence, 'editorial_character_biography_evidence')
      : [],
    ageContext: ageValue && ageContext
      ? {
          value: ageValue,
          context: ageContext,
          evidenceIds: editorialEvidenceIds(row.age_evidence_ids_json, evidence, 'editorial_character_age_evidence'),
        }
      : null,
    originWork,
    originWorkEvidenceIds: originWork
      ? editorialEvidenceIds(row.origin_work_evidence_ids_json, evidence, 'editorial_character_origin_evidence')
      : [],
    mediaTypes,
    characteristics: editorialClaims(row.characteristics_json, evidence, 'editorial_characteristics'),
    mediaTypeEvidenceIds: mediaTypes.length
      ? editorialEvidenceIds(row.media_type_evidence_ids_json, evidence, 'editorial_character_media_type_evidence')
      : [],
    identityEvidenceIds: editorialEvidenceIds(
      row.identity_evidence_ids_json,
      evidence,
      'editorial_character_identity_evidence',
    ),
  }
}

function editorialModelReference(row: EditorialModelRow, evidenceIds: string[]) {
  return {
    modelId: editorialText(row.model_id, 'editorial_model_id_invalid', 120),
    slug: editorialText(row.slug, 'editorial_model_slug_invalid', 240),
    name: editorialText(row.name, 'editorial_model_name_invalid', 240),
    variantName: editorialOptionalText(row.variant_name, 'editorial_model_variant_invalid', 160) ?? '',
    coverStorageKey: editorialOptionalText(row.cover_storage_key, 'editorial_model_cover_invalid', 512),
    reviewStatus: 'approved' as const,
    evidenceIds,
  }
}

async function getEditorialCharacterRow(db: D1Database, slug: string) {
  return db.prepare(`SELECT c.*, f.id AS franchise_id, f.slug AS universe_slug,
      f.name AS universe_name, category.slug AS category_slug,
      u.revision AS universe_revision, u.reviewed_at AS universe_reviewed_at,
      u.approval_ref AS universe_approval_ref,
      u.media_types_json, u.summary AS universe_summary,
      u.summary_evidence_ids_json AS universe_summary_evidence_ids_json,
      u.overview AS universe_overview,
      u.overview_evidence_ids_json AS universe_overview_evidence_ids_json,
      u.identity_evidence_ids_json AS universe_identity_evidence_ids_json,
      u.evidence_json AS universe_evidence_json
    FROM editorial_public_characters c
    JOIN editorial_public_universes u ON u.franchise_id=c.franchise_id
    JOIN franchises f ON f.id=c.franchise_id
    JOIN categories category ON category.id=f.category_id
      WHERE c.slug=? LIMIT 1`).bind(slug).first<Record<string, unknown>>()
}

function splitEditorialCharacterRow(row: Record<string, unknown>) {
  const character = {
    ...row,
    evidence_json: row.evidence_json,
    identity_evidence_ids_json: row.identity_evidence_ids_json,
  } as unknown as EditorialIdentityRow
  const universe = {
    franchise_id: Number(row.franchise_id),
    universe_slug: row.universe_slug,
    universe_name: row.universe_name,
    category_slug: row.category_slug,
    revision: row.universe_revision,
    reviewed_at: row.universe_reviewed_at,
    approval_ref: row.universe_approval_ref,
    media_types_json: row.media_types_json,
    summary: row.universe_summary,
    summary_evidence_ids_json: row.universe_summary_evidence_ids_json,
    overview: row.universe_overview,
    overview_evidence_ids_json: row.universe_overview_evidence_ids_json,
    identity_evidence_ids_json: row.universe_identity_evidence_ids_json,
    evidence_json: row.universe_evidence_json,
  } as unknown as EditorialUniverseRow
  return { character, universe }
}

function combinedEditorialEvidence(characterRow: EditorialIdentityRow, universeRow: EditorialUniverseRow) {
  return mergeEditorialEvidence(editorialEvidence(characterRow.evidence_json), editorialEvidence(universeRow.evidence_json))
}

function editorialSlug(value: unknown): string {
  const slug = editorialText(value, 'editorial_slug_invalid', 240)
  if (!/^[a-z0-9][a-z0-9-]{0,239}$/.test(slug)) throw new Error('editorial_slug_invalid')
  return slug
}

async function editorialRead<T>(request: Request, env: Env, read: () => Promise<T>) {
  try {
    return json(request, env, await read(), {}, 'public, max-age=60, s-maxage=300')
  } catch (error) {
    if (error instanceof Error && error.message === 'editorial_public_not_found') {
      return json(request, env, { error: 'not_found' }, { status: 404 })
    }
    return json(request, env, { error: 'editorial_projection_unavailable' }, { status: 503 })
  }
}

async function searchPublicCharacters(request: Request, env: Env) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.trim()
  if (!query) return json(request, env, { error: 'character_search_required' }, { status: 400 })
  const length = Array.from(query).length
  if (length < 3) return json(request, env, { error: 'search_too_short', minLength: 3 }, { status: 400 })
  if (length > 80) return json(request, env, { error: 'search_too_long', maxLength: 80 }, { status: 400 })
  const limit = Number.parseInt(url.searchParams.get('limit') ?? '8', 10)
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) {
    return json(request, env, { error: 'invalid_character_search_limit' }, { status: 400 })
  }

  return editorialRead(request, env, async () => {
    const rows = await env.DB.prepare(`WITH matches AS (
        SELECT c.id,
          CASE WHEN c.name=? COLLATE NOCASE THEN 0 ELSE 1 END AS priority
        FROM editorial_public_characters c
        JOIN editorial_public_characters_fts ON editorial_public_characters_fts.character_id=c.id
        WHERE editorial_public_characters_fts.name MATCH ?
        UNION ALL
        SELECT c.id, 2 AS priority
        FROM editorial_public_characters c
        JOIN editorial_public_characters_fts ON editorial_public_characters_fts.character_id=c.id
        WHERE editorial_public_characters_fts.aliases MATCH ?
        UNION ALL
        SELECT c.id, 3 AS priority
        FROM editorial_public_characters c
        JOIN franchises f ON f.id=c.franchise_id
        JOIN franchises_fts ON franchises_fts.franchise_id=f.id
        WHERE franchises_fts MATCH ?
      ), best_matches AS (
        SELECT id, MIN(priority) AS priority FROM matches GROUP BY id
      )
      SELECT c.*, f.slug AS universe_slug, f.name AS universe_name,
        category.slug AS category_slug, u.revision AS universe_revision,
        u.reviewed_at AS universe_reviewed_at, u.approval_ref AS universe_approval_ref,
        u.media_types_json, u.summary AS universe_summary,
        u.summary_evidence_ids_json AS universe_summary_evidence_ids_json,
        u.overview AS universe_overview,
        u.overview_evidence_ids_json AS universe_overview_evidence_ids_json,
        u.identity_evidence_ids_json AS universe_identity_evidence_ids_json,
        u.evidence_json AS universe_evidence_json, best_matches.priority
      FROM best_matches
      JOIN editorial_public_characters c ON c.id=best_matches.id
      JOIN editorial_public_universes u ON u.franchise_id=c.franchise_id
      JOIN franchises f ON f.id=c.franchise_id
      JOIN categories category ON category.id=f.category_id
      ORDER BY best_matches.priority,c.name COLLATE NOCASE,c.id
      LIMIT ?`).bind(query, toFtsPhrase(query), toFtsPhrase(query), toFtsPhrase(query), limit + 1)
      .all<Record<string, unknown>>()
    const truncated = rows.results.length > limit
    const items = rows.results.slice(0, limit).map((raw) => {
      const { character: characterRow, universe: universeRow } = splitEditorialCharacterRow(raw)
      const evidence = combinedEditorialEvidence(characterRow, universeRow)
      const character = editorialCharacterData(characterRow, editorialEvidence(characterRow.evidence_json))
      const universeEvidence = editorialEvidence(universeRow.evidence_json)
      return {
        publication: editorialPublication(characterRow),
        character: {
          id: character.id,
          slug: character.slug,
          name: character.name,
          aliases: character.aliases,
          summary: character.summary,
          summaryEvidenceIds: character.summaryEvidenceIds,
          identityEvidenceIds: character.identityEvidenceIds,
        },
        universe: {
          id: String(universeRow.franchise_id),
          slug: editorialSlug(universeRow.universe_slug),
          name: editorialText(universeRow.universe_name, 'editorial_universe_name_invalid', 240),
          categorySlug: editorialSlug(universeRow.category_slug),
          evidenceIds: editorialEvidenceIds(
            universeRow.identity_evidence_ids_json,
            universeEvidence,
            'editorial_universe_identity_evidence',
          ),
        },
        evidence,
        matchedBy: Number(raw.priority) === 0 ? 'name_exact' :
          Number(raw.priority) === 1 ? 'name' : Number(raw.priority) === 2 ? 'alias' : 'franchise',
      }
    })
    return { items, truncated }
  })
}

async function getPublicCharacter(request: Request, env: Env, slug: string) {
  return editorialRead(request, env, async () => {
    const raw = await getEditorialCharacterRow(env.DB, slug)
    if (!raw) throw new Error('editorial_public_not_found')
    const { character: characterRow, universe: universeRow } = splitEditorialCharacterRow(raw)
    const evidence = combinedEditorialEvidence(characterRow, universeRow)
    const characterEvidence = editorialEvidence(characterRow.evidence_json)
    const universeEvidence = editorialEvidence(universeRow.evidence_json)
    const character = editorialCharacterData(characterRow, characterEvidence)
    const universe = editorialUniverseData(universeRow, universeEvidence)
    const relationRows = await env.DB.prepare(`SELECT m.id AS model_id,m.slug,m.name,m.variant_name,
        m.cover_storage_key,l.evidence_ids_json
      FROM editorial_public_character_models l
      JOIN models m ON m.id=l.model_id
      WHERE l.character_id=? AND m.published=1
      ORDER BY m.name COLLATE NOCASE,m.id LIMIT 60`).bind(character.id)
      .all<EditorialModelRow>()
    const sameCharacterModels = relationRows.results.map(row => editorialModelReference(
      row,
      editorialEvidenceIds(row.evidence_ids_json, characterEvidence, 'editorial_model_relation_evidence'),
    ))
    const otherRows = await env.DB.prepare(`SELECT m.id AS model_id,m.slug,m.name,m.variant_name,m.cover_storage_key
      FROM models m
      WHERE m.franchise_id=? AND m.published=1
        AND NOT EXISTS (
          SELECT 1 FROM editorial_public_character_models l
          WHERE l.character_id=? AND l.model_id=m.id
        )
      ORDER BY m.name COLLATE NOCASE,m.id LIMIT 60`).bind(characterRow.franchise_id, character.id)
      .all<EditorialModelRow>()
    const otherUniverseModels = otherRows.results.map(row =>
      editorialModelReference(row, universe.identityEvidenceIds),
    )
    return {
      publication: editorialPublication(characterRow),
      character,
      universe: {
        id: universe.id,
        slug: universe.slug,
        name: universe.name,
        categorySlug: universe.categorySlug,
        evidenceIds: universe.identityEvidenceIds,
      },
      evidence,
      sameCharacterModels,
      otherUniverseModels,
    }
  })
}

async function getPublicModelCharacters(request: Request, env: Env, modelId: string) {
  return editorialRead(request, env, async () => {
    const model = await env.DB.prepare(`SELECT id FROM models
      WHERE id=? AND published=1 LIMIT 1`).bind(modelId).first<{ id: string }>()
    if (!model) throw new Error('editorial_public_not_found')

    const rows = await env.DB.prepare(`SELECT c.*,
        f.slug AS universe_slug, f.name AS universe_name,
        category.slug AS category_slug,
        u.revision AS universe_revision, u.reviewed_at AS universe_reviewed_at,
        u.approval_ref AS universe_approval_ref,
        u.media_types_json, u.summary AS universe_summary,
        u.summary_evidence_ids_json AS universe_summary_evidence_ids_json,
        u.overview AS universe_overview,
        u.overview_evidence_ids_json AS universe_overview_evidence_ids_json,
        u.identity_evidence_ids_json AS universe_identity_evidence_ids_json,
        u.evidence_json AS universe_evidence_json,
        link.evidence_ids_json AS relation_evidence_ids_json,
        link.approval_ref AS relation_approval_ref
      FROM editorial_public_character_models link
      JOIN editorial_public_characters c ON c.id=link.character_id
      JOIN editorial_public_universes u ON u.franchise_id=c.franchise_id
      JOIN franchises f ON f.id=c.franchise_id
      JOIN categories category ON category.id=f.category_id
      WHERE link.model_id=?
      ORDER BY c.name COLLATE NOCASE,c.id LIMIT 31`).bind(model.id)
      .all<Record<string, unknown>>()

    const truncated = rows.results.length > 30
    const items = rows.results.slice(0, 30).map((raw) => {
      const { character: characterRow, universe: universeRow } = splitEditorialCharacterRow(raw)
      const evidence = editorialEvidence(characterRow.evidence_json)
      const identityEvidenceIds = editorialEvidenceIds(
        characterRow.identity_evidence_ids_json,
        evidence,
        'editorial_character_identity_evidence',
      )
      const relationEvidenceIds = editorialEvidenceIds(
        raw.relation_evidence_ids_json,
        evidence,
        'editorial_model_character_relation_evidence',
      )
      editorialText(raw.relation_approval_ref, 'editorial_model_character_approval_ref_invalid', 240)
      const independentIdentityEvidenceId = identityEvidenceIds.find((id) =>
        evidence.some((item) => item.id === id && item.kind !== 'catalog'),
      )
      const independentRelationEvidenceId = relationEvidenceIds.find((id) =>
        evidence.some((item) => item.id === id && item.kind !== 'catalog'),
      )
      if (!independentIdentityEvidenceId || !independentRelationEvidenceId) {
        throw new Error('editorial_model_character_evidence')
      }
      const responseEvidenceIds = new Set([
        independentIdentityEvidenceId,
        independentRelationEvidenceId,
      ])
      return {
        publication: editorialPublication(characterRow),
        character: {
          id: editorialText(characterRow.id, 'editorial_character_id_invalid', 120),
          slug: editorialSlug(characterRow.slug),
          name: editorialText(characterRow.name, 'editorial_character_name_invalid', 240),
          evidenceIds: [independentIdentityEvidenceId],
        },
        universe: {
          slug: editorialSlug(universeRow.universe_slug),
          categorySlug: editorialSlug(universeRow.category_slug),
        },
        relationEvidenceIds: [independentRelationEvidenceId],
        evidence: evidence.filter((item) => responseEvidenceIds.has(item.id)),
      }
    })
    return { items, truncated }
  })
}

async function getPublicUniverse(request: Request, env: Env, categorySlug: string, franchiseSlug: string) {
  return editorialRead(request, env, async () => {
    const raw = await env.DB.prepare(`SELECT u.*, f.slug AS universe_slug, f.name AS universe_name,
        c.slug AS category_slug
      FROM editorial_public_universes u
      JOIN franchises f ON f.id=u.franchise_id
      JOIN categories c ON c.id=f.category_id
      WHERE c.slug=? AND f.slug=? LIMIT 1`).bind(categorySlug, franchiseSlug)
      .first<EditorialUniverseRow>()
    if (!raw) throw new Error('editorial_public_not_found')
    const evidence = editorialEvidence(raw.evidence_json)
    const universe = editorialUniverseData(raw, evidence)
    const characterRows = await env.DB.prepare(`SELECT c.* FROM editorial_public_characters c
      WHERE c.franchise_id=? ORDER BY c.name COLLATE NOCASE,c.id LIMIT 121`)
      .bind(raw.franchise_id).all<EditorialIdentityRow>()
    const characters = characterRows.results.slice(0, 120).map(row => {
      const characterEvidence = editorialEvidence(row.evidence_json)
      const allIdentityEvidenceIds = editorialEvidenceIds(
        row.identity_evidence_ids_json,
        characterEvidence,
        'editorial_character_identity_evidence',
      )
      const independentIdentityEvidenceId = allIdentityEvidenceIds.find(id =>
        characterEvidence.some(item => item.id === id && item.kind !== 'catalog'),
      )
      if (!independentIdentityEvidenceId) throw new Error('editorial_character_identity_evidence')
      evidence.push(...characterEvidence.filter(item => item.id === independentIdentityEvidenceId))
      return {
        id: editorialText(row.id, 'editorial_character_id_invalid', 120),
        slug: editorialSlug(row.slug),
        name: editorialText(row.name, 'editorial_character_name_invalid', 240),
        summary: editorialOptionalText(row.summary, 'editorial_character_summary'),
        reviewStatus: 'approved' as const,
        evidenceIds: [independentIdentityEvidenceId],
      }
    })
    const modelRows = await env.DB.prepare(`SELECT m.id AS model_id,m.slug,m.name,m.variant_name,m.cover_storage_key
      FROM models m WHERE m.franchise_id=? AND m.published=1
      ORDER BY m.name COLLATE NOCASE,m.id LIMIT 60`).bind(raw.franchise_id)
      .all<EditorialModelRow>()
    const evidenceForResponse = mergeEditorialEvidence(evidence)
    const editorialEvidenceIdsForModels = universe.identityEvidenceIds
    return {
      publication: editorialPublication(raw),
      universe,
      evidence: evidenceForResponse,
      characters,
      models: modelRows.results.map(row =>
        editorialModelReference(row, editorialEvidenceIdsForModels),
      ),
    }
  })
}

async function listFolders(request: Request, env: Env) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')?.trim() || ''
  const franchise = url.searchParams.get('franchise')?.trim() || ''
  const parent = url.searchParams.get('parent')?.trim() || ''
  if (!category || !franchise) return json(request, env, { error: 'folder_scope_required' }, { status: 400 })
  if (parent.length > 240) return json(request, env, { error: 'folder_path_too_long' }, { status: 400 })

  const result = await env.DB.prepare(`SELECT
      cf.path AS id,
      cf.name AS label,
      cf.subtree_model_count AS count,
      EXISTS(SELECT 1 FROM catalog_folders child WHERE child.parent_id=cf.id) AS has_children,
      (SELECT m.cover_storage_key FROM models m
       WHERE m.folder_id=cf.id AND m.published=1
         AND m.cover_storage_key IS NOT NULL AND m.cover_storage_key<>''
       ORDER BY m.name COLLATE NOCASE,m.id LIMIT 1) AS cover_storage_key
    FROM catalog_folders cf
    JOIN franchises f ON f.id=cf.franchise_id
    JOIN categories c ON c.id=f.category_id
    WHERE c.slug=? AND f.slug=? AND (
      (?='' AND cf.parent_id IS NULL) OR
      (?<>'' AND cf.parent_id=(SELECT p.id FROM catalog_folders p WHERE p.franchise_id=f.id AND p.path=? LIMIT 1))
    )
    ORDER BY cf.name COLLATE NOCASE,cf.id`).bind(category, franchise, parent, parent, parent)
    .all<{ id: string; label: string; count: number; has_children: number; cover_storage_key: string | null }>()

  const current = parent ? await env.DB.prepare(`SELECT
      cf.path AS id,
      cf.name AS label,
      cf.subtree_model_count AS count
    FROM catalog_folders cf
    JOIN franchises f ON f.id=cf.franchise_id
    JOIN categories c ON c.id=f.category_id
    WHERE c.slug=? AND f.slug=? AND cf.path=?
    LIMIT 1`).bind(category, franchise, parent)
    .first<{ id: string; label: string; count: number }>() : null

  if (parent && !current) {
    return json(request, env, { error: 'folder_not_found' }, { status: 404 }, 'no-store')
  }

  const trail = parent ? await env.DB.prepare(`WITH RECURSIVE ancestors AS (
      SELECT cf.id,cf.parent_id,cf.path,cf.name,cf.depth
      FROM catalog_folders cf
      JOIN franchises f ON f.id=cf.franchise_id
      JOIN categories c ON c.id=f.category_id
      WHERE c.slug=? AND f.slug=? AND cf.path=?
      UNION ALL
      SELECT parent_folder.id,parent_folder.parent_id,parent_folder.path,parent_folder.name,parent_folder.depth
      FROM catalog_folders parent_folder
      JOIN ancestors child ON child.parent_id=parent_folder.id
    )
    SELECT path AS id,name AS label,depth
    FROM ancestors
    ORDER BY depth,path`).bind(category, franchise, parent)
    .all<{ id: string; label: string; depth: number }>() : { results: [] }

  return json(request, env, {
    current: current ? { id: current.id, label: current.label, count: Number(current.count || 0) } : null,
    trail: trail.results.map((item) => ({ id: item.id, label: item.label })),
    items: result.results.map((item) => ({
      id: item.id,
      label: item.label,
      count: Number(item.count || 0),
      hasChildren: Boolean(item.has_children),
      cover_storage_key: item.cover_storage_key,
    })),
  }, {}, 'public, max-age=300, s-maxage=1800')
}

async function listCatalog(request: Request, env: Env) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')?.trim() || null
  const franchise = url.searchParams.get('franchise')?.trim() || null
  const folder = url.searchParams.get('folder')?.trim() || null
  const query = url.searchParams.get('q')?.trim().toLocaleLowerCase('pt-BR') || null
  const material = url.searchParams.get('material')?.trim().slice(0, 120) || null
  const collection = url.searchParams.get('collection')?.trim().slice(0, 120) || null
  const minHeightRaw = url.searchParams.get('minHeight')
  const maxHeightRaw = url.searchParams.get('maxHeight')
  const parseHeight = (value: string | null) => {
    if (value === null) return null
    if (!/^\d{1,3}$/.test(value) || Number(value) < 1 || Number(value) > 300) return Number.NaN
    return Number(value)
  }
  const minHeight = parseHeight(minHeightRaw)
  const maxHeight = parseHeight(maxHeightRaw)
  if (Number.isNaN(minHeight) || Number.isNaN(maxHeight) || (minHeight !== null && maxHeight !== null && minHeight > maxHeight)) {
    return json(request, env, { error: 'invalid_height_range' }, { status: 400 })
  }
  const limit = clamp(Number.parseInt(url.searchParams.get('limit') ?? '24', 10) || 24, 1, 60)
  const rawCursor = url.searchParams.get('cursor')
  const cursor = decodeCatalogCursor(rawCursor)
  if (rawCursor && !cursor) return json(request, env, { error: 'invalid_cursor' }, { status: 400 })

  if (query) {
    const length = Array.from(query).length
    if (length < 3) return json(request, env, { error: 'search_too_short', minLength: 3 }, { status: 400 })
    if (length > 120) return json(request, env, { error: 'search_too_long', maxLength: 120 }, { status: 400 })
  }

  const where = ['m.published = 1']
  const values: unknown[] = []
  let folderCte = ''
  if (folder) {
    if (!category || !franchise) return json(request, env, { error: 'folder_scope_required' }, { status: 400 })
    if (folder.length > 240) return json(request, env, { error: 'folder_path_too_long' }, { status: 400 })
    const folderExists = await env.DB.prepare(`SELECT 1
      FROM catalog_folders cf
      JOIN franchises f ON f.id=cf.franchise_id
      JOIN categories c ON c.id=f.category_id
      WHERE c.slug=? AND f.slug=? AND cf.path=?
      LIMIT 1`).bind(category, franchise, folder).first()
    if (!folderExists) return json(request, env, { error: 'folder_not_found' }, { status: 404 }, 'no-store')
    folderCte = `WITH RECURSIVE folder_scope(id) AS (
      SELECT cf.id FROM catalog_folders cf
      JOIN franchises ff ON ff.id=cf.franchise_id
      JOIN categories cc ON cc.id=ff.category_id
      WHERE cc.slug=? AND ff.slug=? AND cf.path=?
      UNION ALL
      SELECT child.id FROM catalog_folders child JOIN folder_scope scope ON child.parent_id=scope.id
    )`
    values.push(category, franchise, folder)
    where.push('m.folder_id IN (SELECT id FROM folder_scope)')
  }
  if (category) { where.push('c.slug = ?'); values.push(category) }
  if (franchise) { where.push('f.slug = ?'); values.push(franchise) }
  if (query) { where.push('models_fts MATCH ?'); values.push(toFtsPhrase(query)) }
  if (material) { where.push('LOWER(COALESCE(m.material, \'\')) LIKE LOWER(?) ESCAPE \'\\\''); values.push(`%${material.replace(/[\\%_]/g, '\\$&')}%`) }
  if (collection) { where.push('LOWER(COALESCE(m.collection, \'\')) LIKE LOWER(?) ESCAPE \'\\\''); values.push(`%${collection.replace(/[\\%_]/g, '\\$&')}%`) }
  if (minHeight !== null && minHeight >= 1 && minHeight <= 300) { where.push('m.height_cm >= ?'); values.push(minHeight) }
  if (maxHeight !== null && maxHeight >= 1 && maxHeight <= 300) { where.push('m.height_cm <= ?'); values.push(maxHeight) }
  if (cursor) {
    where.push('(m.name COLLATE NOCASE > ? COLLATE NOCASE OR (m.name COLLATE NOCASE = ? COLLATE NOCASE AND m.id > ?))')
    values.push(cursor.name, cursor.name, cursor.id)
  }

  const searchJoin = query ? 'JOIN models_fts ON models_fts.model_id = m.id' : ''
  const sql = `${folderCte} SELECT m.id,m.slug,m.code,m.name,m.variant_name,m.collection,m.material,m.height_cm,cf.path AS folder_path,
    ${LOGICAL_IMAGE_COUNT_SQL} AS image_count,
    ${PUBLIC_GALLERY_VERSION_SQL} AS gallery_version,
    m.cover_storage_key,
    f.name AS franchise,f.slug AS franchise_slug,c.name AS category,c.slug AS category_slug
    FROM models m
    JOIN franchises f ON f.id=m.franchise_id
    JOIN categories c ON c.id=f.category_id
    LEFT JOIN catalog_folders cf ON cf.id=m.folder_id
    ${searchJoin}
    WHERE ${where.join(' AND ')}
    ORDER BY m.name COLLATE NOCASE, m.id
    LIMIT ?`
  values.push(limit + 1)

  const result = await env.DB.prepare(sql).bind(...values).all<CatalogRow>()
  const hasMore = result.results.length > limit
  const items = hasMore ? result.results.slice(0, limit) : result.results
  const lastItem = items.at(-1)
  return json(request, env, {
    items,
    nextCursor: hasMore && lastItem ? encodeCatalogCursor(lastItem) : null,
  }, {}, 'public, max-age=30, s-maxage=120')
}

async function listRecentCatalog(request: Request, env: Env) {
  const url = new URL(request.url)
  const limit = clamp(Number.parseInt(url.searchParams.get('limit') ?? '12', 10) || 12, 1, 24)
  const result = await env.DB.prepare(`SELECT m.id,m.slug,m.code,m.name,m.variant_name,m.collection,m.material,m.height_cm,cf.path AS folder_path,
    ${LOGICAL_IMAGE_COUNT_SQL} AS image_count,
    ${PUBLIC_GALLERY_VERSION_SQL} AS gallery_version,
    m.cover_storage_key,
    f.name AS franchise,f.slug AS franchise_slug,c.name AS category,c.slug AS category_slug
    FROM models m
    JOIN franchises f ON f.id=m.franchise_id
    JOIN categories c ON c.id=f.category_id
    LEFT JOIN catalog_folders cf ON cf.id=m.folder_id
    WHERE m.published=1
    ORDER BY m.created_at DESC,m.id DESC
    LIMIT ?`).bind(limit).all<CatalogRow>()
  return json(request, env, { items: result.results }, {}, 'public, max-age=30, s-maxage=120')
}

async function getModel(request: Request, slug: string, env: Env) {
  const model = await env.DB.prepare(`${RESOLVED_MODEL_BY_SLUG_CTE}
    SELECT
    m.id,m.slug,m.code,m.name,m.variant_name,m.collection,m.material,m.height_cm,m.description,m.search_text,
    ${LOGICAL_IMAGE_COUNT_SQL} AS image_count,
    ${PUBLIC_GALLERY_VERSION_SQL} AS gallery_version,
    m.cover_storage_key,cf.path AS folder_path,
    f.name AS franchise,f.slug AS franchise_slug,c.name AS category,c.slug AS category_slug
    FROM resolved_model resolved
    JOIN models m ON m.id=resolved.id
    JOIN franchises f ON f.id=m.franchise_id
    JOIN categories c ON c.id=f.category_id
    LEFT JOIN catalog_folders cf ON cf.id=m.folder_id
    WHERE m.published=1 LIMIT 1`).bind(slug).first()
  return model
    ? json(request, env, model, {}, 'public, max-age=30, s-maxage=120')
    : json(request, env, { error: 'model_not_found' }, { status: 404 })
}

async function listImages(request: Request, slug: string, env: Env) {
  const url = new URL(request.url)
  const limit = clamp(Number.parseInt(url.searchParams.get('limit') ?? '24', 10) || 24, 1, 60)
  const rawCursor = url.searchParams.get('cursor')
  const offset = decodeOffsetCursor(rawCursor)
  if (offset === null) return json(request, env, { error: 'invalid_cursor' }, { status: 400 })

  const model = await env.DB.prepare(`${RESOLVED_MODEL_BY_SLUG_CTE}
    SELECT
      m.id,m.image_count,m.gallery_manifest_key,m.gallery_version,m.cover_storage_key,
      m.public_gallery_version
    FROM resolved_model resolved
    JOIN models m ON m.id=resolved.id
    WHERE m.published=1
    LIMIT 1`).bind(slug).first<GalleryModelState & { public_gallery_version: number }>()
  if (!model) return json(request, env, { error: 'model_not_found' }, { status: 404 })
  if (!model.gallery_manifest_key) return json(request, env, { items: [], total: 0, nextCursor: null, version: model.gallery_version })

  const additional = await env.DB.prepare(`SELECT
      source.id,source.image_count,source.gallery_manifest_key,source.gallery_version,source.cover_storage_key,
      member.position
    FROM model_gallery_members member
    JOIN models source ON source.id=member.source_model_id
    WHERE member.canonical_model_id=?
    ORDER BY member.position,source.id`).bind(model.id).all<GallerySourceState>()

  const sources: GallerySourceState[] = [
    { ...model, position: 0 },
    ...additional.results,
  ]
  const payloads = []
  for (const source of sources) {
    if (!source.gallery_manifest_key) {
      return json(request, env, { error: 'gallery_manifest_missing' }, { status: 503 })
    }
    const object = await env.MEDIA.get(source.gallery_manifest_key)
    if (!object) return json(request, env, { error: 'gallery_manifest_missing' }, { status: 503 })
    try {
      payloads.push({ source, manifest: await object.json<unknown>() })
    } catch {
      return json(request, env, { error: 'gallery_manifest_invalid' }, { status: 503 })
    }
  }

  let gallery
  try {
    gallery = aggregateGallerySources(payloads)
  } catch {
    return json(request, env, { error: 'gallery_manifest_invalid' }, { status: 503 })
  }

  const items = gallery.images.slice(offset, offset + limit)
  const nextOffset = offset + items.length
  return json(request, env, {
    items,
    total: gallery.total,
    nextCursor: nextOffset < gallery.total ? encodeOffsetCursor(nextOffset) : null,
    version: model.public_gallery_version,
  }, {}, 'public, max-age=300, s-maxage=1800')
}

async function createQuote(request: Request, env: Env) {
  const requestOrigin = request.headers.get('origin')
  if (requestOrigin && !allowedOrigin(request, env)) {
    return json(request, env, { error: 'origin_not_allowed' }, { status: 403 })
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    return json(request, env, { error: 'quote_protection_not_configured' }, { status: 503 })
  }

  let body: { name?: unknown; email?: unknown; notes?: unknown; modelIds?: unknown; turnstileToken?: unknown }
  try {
    body = await request.json() as typeof body
  } catch {
    return json(request, env, { error: 'invalid_json' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken : ''
  const rawIds = Array.isArray(body.modelIds) ? body.modelIds : []
  const requestedModelIds = Array.from(new Set(rawIds.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)))

  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || notes.length > 4000 || !requestedModelIds.length) {
    return json(request, env, { error: 'invalid_request' }, { status: 400 })
  }
  if (requestedModelIds.length > MAX_QUOTE_ITEMS) {
    return json(request, env, { error: 'too_many_models', maxItems: MAX_QUOTE_ITEMS }, { status: 400 })
  }
  if (!await validateTurnstile(request, env, turnstileToken)) {
    return json(request, env, { error: 'turnstile_failed' }, { status: 400 })
  }

  const modelIds = await resolvePublicModelIds(env.DB, requestedModelIds)
  if (!modelIds || !modelIds.length) {
    return json(request, env, { error: 'invalid_models' }, { status: 400 })
  }

  const duplicate = await findRecentDuplicateQuote(env, name, email, notes, modelIds)
  if (duplicate) return quoteResponse(request, env, duplicate, true)

  const id = await deterministicQuoteId(name, email, notes, modelIds)
  const reference = quoteReference(id)
  const itemValues: unknown[] = []
  const itemRows = modelIds.map((modelId) => {
    itemValues.push(id, modelId)
    return '(?,?,1)'
  }).join(',')

  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO quote_requests(id,reference,name,email,notes) VALUES(?,?,?,?,?)').bind(id, reference, name, email, notes || null),
      env.DB.prepare(`INSERT INTO quote_request_items(quote_request_id,model_id,quantity) VALUES ${itemRows}`).bind(...itemValues),
    ])
  } catch (error) {
    const concurrent = await env.DB.prepare('SELECT id,reference FROM quote_requests WHERE id=? LIMIT 1').bind(id).first<QuoteRecord>()
    if (concurrent) return quoteResponse(request, env, concurrent, true)
    throw error
  }

  return quoteResponse(request, env, { id, reference }, false, 201)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return options(request, env)
    const url = new URL(request.url)
    // Reject cache-busting arguments BEFORE even the D1 schema-readiness check.
    // Quote and shared-collection contracts are intentionally untouched.
    if (request.method === 'GET') {
      const budget = validatePublicCatalogQuery(url)
      if (budget !== null && budget !== true) {
        // Preserve published error contracts for height/search validation.
        const detail = budget === false ? { error: 'invalid_catalog_query' } : budget
        return json(request, env, detail, { status: 400 })
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      const schema = await catalogSchemaStatus(env.DB)
      return json(
        request,
        env,
        { ok: schema.ready, service: 'tonecos-catalogo', schema },
        { status: schema.ready ? 200 : 503 },
      )
    }

    const schema = await catalogSchemaStatus(env.DB)
    if (!schema.ready) {
      return json(request, env, { error: 'schema_not_ready', schema }, { status: 503 })
    }

    if (request.method === 'GET' && url.pathname === '/api/editorial/v1/characters/search') {
      return searchPublicCharacters(request, env)
    }
    const publicCharacterMatch = url.pathname.match(/^\/api\/editorial\/v1\/characters\/([a-z0-9][a-z0-9-]{0,239})$/)
    if (request.method === 'GET' && publicCharacterMatch) {
      return getPublicCharacter(request, env, publicCharacterMatch[1])
    }
    const publicModelCharactersMatch = url.pathname.match(/^\/api\/editorial\/v1\/models\/([A-Za-z0-9_-]{1,120})\/characters$/)
    if (request.method === 'GET' && publicModelCharactersMatch) {
      return getPublicModelCharacters(request, env, publicModelCharactersMatch[1])
    }
    const publicUniverseMatch = url.pathname.match(/^\/api\/editorial\/v1\/universes\/([a-z0-9][a-z0-9-]{0,239})\/([a-z0-9][a-z0-9-]{0,239})$/)
    if (request.method === 'GET' && publicUniverseMatch) {
      return getPublicUniverse(request, env, publicUniverseMatch[1], publicUniverseMatch[2])
    }

    if (request.method === 'GET' && url.pathname === '/api/categories') return listCategories(request, env)
    if (request.method === 'GET' && url.pathname === '/api/franchises') return listFranchises(request, env)
    if (request.method === 'GET' && url.pathname === '/api/folders') return listFolders(request, env)
    if (request.method === 'GET' && url.pathname === '/api/catalog') return listCatalog(request, env)
    if (request.method === 'GET' && url.pathname === '/api/recent') return listRecentCatalog(request, env)
    const imageMatch = url.pathname.match(/^\/api\/models\/([^/]+)\/images$/)
    if (request.method === 'GET' && imageMatch) return listImages(request, decodeURIComponent(imageMatch[1]), env)
    const modelMatch = url.pathname.match(/^\/api\/models\/([^/]+)$/)
    if (request.method === 'GET' && modelMatch) return getModel(request, decodeURIComponent(modelMatch[1]), env)
    if (request.method === 'POST' && url.pathname === '/api/shared-collections') {
      return createSharedCollection(request, env, { allowedOrigin, json, validateTurnstile })
    }
    const sharedMatch = url.pathname.match(/^\/api\/shared-collections\/([^/]+)$/)
    if (request.method === 'GET' && sharedMatch) {
      return getSharedCollection(request, decodeURIComponent(sharedMatch[1]), env, { allowedOrigin, json, validateTurnstile })
    }
    if (request.method === 'POST' && url.pathname === '/api/quotes') return createQuote(request, env)
    return json(request, env, { error: 'not_found' }, { status: 404 })
  },
}
