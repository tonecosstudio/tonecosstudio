type D1Statement = {
  bind(...values: unknown[]): D1Statement
  all<T = unknown>(): Promise<{ results: T[] }>
  first<T = unknown>(): Promise<T | null>
}

type D1Database = {
  prepare(sql: string): D1Statement
  batch(statements: D1Statement[]): Promise<unknown>
}

type EditorialProjectionEnv = {
  DB: D1Database
  EDITORIAL_SYNC_TOKEN?: string
}

type EvidenceKind =
  | 'catalog'
  | 'official'
  | 'publisher'
  | 'licensor'
  | 'institution'
  | 'reputable_reference'
  | 'other'

type Evidence = {
  id: string
  title: string
  url: string
  kind: EvidenceKind
}

type UniverseProjection = {
  franchiseName: string
  revision: string
  reviewedAt: string
  approvalRef: string
  mediaTypesJson: string
  summary: null
  summaryEvidenceIdsJson: string
  overview: null
  overviewEvidenceIdsJson: string
  identityEvidenceIdsJson: string
  evidenceJson: string
}

type CharacterProjection = {
  id: string
  slug: string
  franchiseName: string
  name: string
  aliasesJson: string
  summary: null
  summaryEvidenceIdsJson: string
  biography: string
  biographyEvidenceIdsJson: string
  ageValue: string | null
  ageContext: string | null
  ageEvidenceIdsJson: string
  originWork: string
  originWorkEvidenceIdsJson: string
  mediaTypesJson: string
  characteristicsJson: string
  mediaTypeEvidenceIdsJson: string
  identityEvidenceIdsJson: string
  evidenceJson: string
  revision: string
  reviewedAt: string
  approvalRef: string
}

type RelationProjection = {
  characterId: string
  modelId: string
  evidenceIdsJson: string
  approvalRef: string
  modelSlug: string
  franchiseName: string
}

export type NormalizedEditorialProjection = {
  universes: UniverseProjection[]
  characters: CharacterProjection[]
  relations: RelationProjection[]
  snapshotSha256: string
  sourceRevision: string
  allowEmpty: boolean
}

const SOURCE_RPC = 'public.admin_export_approved_catalog_character_projection'
const MAX_BODY_BYTES = 20 * 1024 * 1024
const MAX_CHARACTERS = 5000
const MAX_RELATIONS = 50000
const MAX_EVIDENCE_PER_CHARACTER = 80
const MAX_EVIDENCE_PER_DOCUMENT = 10
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CHARACTER_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MODEL_ID = /^[A-Za-z0-9_-]{1,120}$/
const EVIDENCE_KINDS = new Set<EvidenceKind>([
  'catalog', 'official', 'publisher', 'licensor', 'institution', 'reputable_reference', 'other',
])

class ProjectionInputError extends Error {}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProjectionInputError(field)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], field: string) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new ProjectionInputError(field)
}

function text(value: unknown, field: string, max = 4000): string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > max ||
      Array.from(value).some(char => {
        const code = char.charCodeAt(0)
        return code <= 31 && code !== 9 && code !== 10 || code === 127
      })) throw new ProjectionInputError(field)
  return value
}

function optionalText(value: unknown, field: string, max = 4000): string | null {
  if (value === null || value === undefined || value === '') return null
  return text(value, field, max)
}

function array(value: unknown, field: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new ProjectionInputError(field)
  return value
}

function date(value: unknown, field: string): string {
  const result = text(value, field, 40)
  if (!Number.isFinite(Date.parse(result))) throw new ProjectionInputError(field)
  return result
}

function httpsUrl(value: unknown, field: string, max = 2048): string {
  const raw = text(value, field, max)
  let parsed: URL
  try { parsed = new URL(raw) } catch { throw new ProjectionInputError(field) }
  const hostname = parsed.hostname.toLowerCase()
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
      hostname === 'localhost' || hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '[::1]') {
    throw new ProjectionInputError(field)
  }
  return parsed.toString()
}

function stableFranchiseKey(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('pt-BR')
}

function json(value: unknown): string {
  return JSON.stringify(value)
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

async function evidenceId(kind: EvidenceKind, title: string, url: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${kind}\u0000${title}\u0000${url}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  return `supabase-${hex}`
}

async function addEvidenceSources(
  value: unknown,
  field: string,
  evidence: Map<string, Evidence>,
  required: boolean,
): Promise<string[]> {
  const sources = array(value, field, MAX_EVIDENCE_PER_DOCUMENT)
  if (required && !sources.length) throw new ProjectionInputError(`${field}_required`)
  const ids: string[] = []
  for (const item of sources) {
    const source = record(item, `${field}_item_invalid`)
    exactKeys(source, ['title', 'url', 'kind'], `${field}_keys_invalid`)
    const title = text(source.title, `${field}_title_invalid`, 200)
    const url = httpsUrl(source.url, `${field}_url_invalid`)
    if (typeof source.kind !== 'string' || !EVIDENCE_KINDS.has(source.kind as EvidenceKind)) {
      throw new ProjectionInputError(`${field}_kind_invalid`)
    }
    const kind = source.kind as EvidenceKind
    const id = await evidenceId(kind, title, url)
    const normalized = { id, title, url, kind }
    const previous = evidence.get(id)
    if (previous && json(previous) !== json(normalized)) throw new ProjectionInputError('evidence_conflict')
    evidence.set(id, normalized)
    ids.push(id)
  }
  const distinct = unique(ids)
  if (required && !distinct.some(id => evidence.get(id)?.kind !== 'catalog')) {
    throw new ProjectionInputError(`${field}_independent_source_required`)
  }
  return distinct
}

async function profileClaim(
  value: unknown,
  field: string,
  evidence: Map<string, Evidence>,
): Promise<{ value: string; evidenceIds: string[] }> {
  const claim = record(value, `${field}_invalid`)
  exactKeys(claim, ['name', 'sources'], `${field}_keys_invalid`)
  const name = text(claim.name, `${field}_name_invalid`, 240)
  const evidenceIds = await addEvidenceSources(claim.sources, `${field}_sources`, evidence, true)
  return { value: name, evidenceIds }
}

async function normalizeCharacter(value: unknown) {
  const row = record(value, 'editorial_character_invalid')
  exactKeys(row, [
    'identityId', 'name', 'franchiseName', 'slug', 'profile', 'profileRevision',
    'reviewedAt', 'reviewedBy', 'approvalRef', 'approvedAt', 'approvedBy', 'modelLinks',
  ], 'editorial_character_keys_invalid')
  const id = text(row.identityId, 'editorial_character_id_invalid', 120)
  if (!UUID.test(id)) throw new ProjectionInputError('editorial_character_id_invalid')
  const name = text(row.name, 'editorial_character_name_invalid', 160)
  const franchiseName = text(row.franchiseName, 'editorial_franchise_name_invalid', 160)
  const slug = text(row.slug, 'editorial_character_slug_invalid', 120)
  if (!CHARACTER_SLUG.test(slug)) throw new ProjectionInputError('editorial_character_slug_invalid')
  if (!Number.isSafeInteger(row.profileRevision) || (row.profileRevision as number) < 1) {
    throw new ProjectionInputError('editorial_profile_revision_invalid')
  }
  const reviewedAt = date(row.reviewedAt, 'editorial_reviewed_at_invalid')
  if (!UUID.test(text(row.reviewedBy, 'editorial_reviewed_by_invalid', 120))) {
    throw new ProjectionInputError('editorial_reviewed_by_invalid')
  }
  const approvalRef = text(row.approvalRef, 'editorial_approval_ref_invalid', 120)
  if (!UUID.test(approvalRef) || !UUID.test(text(row.approvedBy, 'editorial_approved_by_invalid', 120))) {
    throw new ProjectionInputError('editorial_approval_ref_invalid')
  }
  const approvedAt = date(row.approvedAt, 'editorial_approved_at_invalid')
  if (Date.parse(approvedAt) < Date.parse(reviewedAt)) {
    throw new ProjectionInputError('editorial_approval_precedes_review')
  }
  const profile = record(row.profile, 'editorial_profile_invalid')
  exactKeys(profile, [
    'slug', 'aliases', 'biography', 'biographySources', 'ageContext',
    'ageSources', 'originWork', 'originWorkSources', 'characteristics', 'nameSources',
    'franchiseSources',
  ], 'editorial_profile_keys_invalid')
  if (profile.slug !== slug) throw new ProjectionInputError('editorial_character_slug_mismatch')
  const biography = text(profile.biography, 'editorial_biography_invalid', 6000)
  const originWork = text(profile.originWork, 'editorial_origin_work_invalid', 240)
  const evidence = new Map<string, Evidence>()
  const nameEvidenceIds = await addEvidenceSources(profile.nameSources, 'editorial_name', evidence, true)
  const franchiseEvidenceIds = await addEvidenceSources(profile.franchiseSources, 'editorial_franchise', evidence, true)
  const biographyEvidenceIds = await addEvidenceSources(profile.biographySources, 'editorial_biography', evidence, true)
  const originWorkEvidenceIds = await addEvidenceSources(profile.originWorkSources, 'editorial_origin_work', evidence, true)
  const ageContext = optionalText(profile.ageContext, 'editorial_age_context_invalid', 500)
  // The private curation contract stores contextual age information but no
  // independently asserted age value. Preserve the context without deriving
  // or inventing a value.
  const ageValue = null
  const ageEvidenceIds = ageContext
    ? await addEvidenceSources(profile.ageSources, 'editorial_age', evidence, true)
    : []
  if (!ageContext && array(profile.ageSources ?? [], 'editorial_age_sources_invalid', MAX_EVIDENCE_PER_DOCUMENT).length) {
    throw new ProjectionInputError('editorial_age_sources_without_value')
  }

  const aliases = await Promise.all(array(profile.aliases, 'editorial_aliases_invalid', 30)
    .map(item => profileClaim(item, 'editorial_alias', evidence)))
  const characteristics = await Promise.all(array(profile.characteristics, 'editorial_characteristics_invalid', 30)
    .map(item => profileClaim(item, 'editorial_characteristic', evidence)))
  const aliasKeys = new Set<string>()
  for (const alias of aliases) {
    const key = alias.value.toLocaleLowerCase('pt-BR')
    if (aliasKeys.has(key)) throw new ProjectionInputError('editorial_alias_duplicate')
    aliasKeys.add(key)
  }
  const characteristicKeys = new Set<string>()
  for (const claim of characteristics) {
    const key = claim.value.toLocaleLowerCase('pt-BR')
    if (characteristicKeys.has(key)) throw new ProjectionInputError('editorial_characteristic_duplicate')
    characteristicKeys.add(key)
  }

  const relationRows = array(row.modelLinks, 'editorial_model_links_invalid', 5000)
  if (relationRows.length > MAX_RELATIONS) throw new ProjectionInputError('editorial_model_link_limit')
  if (!relationRows.length) throw new ProjectionInputError('editorial_model_link_required')
  const seenModels = new Set<string>()
  const modelLinks = []
  for (const value of relationRows) {
    const link = record(value, 'editorial_model_link_invalid')
    exactKeys(link, ['modelId', 'modelSlug', 'evidenceUrl', 'evidenceTitle'], 'editorial_model_link_keys_invalid')
    const modelId = text(link.modelId, 'editorial_model_id_invalid', 120)
    if (!MODEL_ID.test(modelId) || seenModels.has(modelId)) throw new ProjectionInputError('editorial_model_id_invalid')
    seenModels.add(modelId)
    const modelSlug = text(link.modelSlug, 'editorial_model_slug_invalid', 240)
    if (!/^[a-z0-9][a-z0-9-]{0,239}$/.test(modelSlug)) throw new ProjectionInputError('editorial_model_slug_invalid')
    const evidenceUrl = httpsUrl(link.evidenceUrl, 'editorial_relation_url_invalid', 240)
    const evidenceTitle = text(link.evidenceTitle, 'editorial_relation_title_invalid', 1000)
    // The private relation stores a source URL and human-entered note, but no
    // source taxonomy. Preserve that uncertainty as `other`, never infer kind.
    const sourceId = await evidenceId('other', evidenceTitle, evidenceUrl)
    const source: Evidence = { id: sourceId, title: evidenceTitle, url: evidenceUrl, kind: 'other' }
    const priorSource = evidence.get(sourceId)
    if (priorSource && json(priorSource) !== json(source)) throw new ProjectionInputError('evidence_conflict')
    evidence.set(sourceId, source)
    modelLinks.push({ modelId, modelSlug, evidenceId: sourceId })
  }
  if (evidence.size < 1 || evidence.size > MAX_EVIDENCE_PER_CHARACTER) {
    throw new ProjectionInputError('editorial_evidence_limit')
  }

  const identityEvidenceIds = unique([...nameEvidenceIds, ...franchiseEvidenceIds])
  const identityEvidence = identityEvidenceIds.map(id => evidence.get(id)!)
  if (!identityEvidence.some(item => item.kind !== 'catalog')) {
    throw new ProjectionInputError('editorial_identity_evidence_required')
  }
  const revision = `supabase:${id}:${row.profileRevision}`
  const character: CharacterProjection = {
    id,
    slug,
    franchiseName,
    name,
    aliasesJson: json(aliases),
    summary: null,
    summaryEvidenceIdsJson: '[]',
    biography,
    biographyEvidenceIdsJson: json(biographyEvidenceIds),
    ageValue,
    ageContext,
    ageEvidenceIdsJson: json(ageEvidenceIds),
    originWork,
    originWorkEvidenceIdsJson: json(originWorkEvidenceIds),
    mediaTypesJson: '[]',
    characteristicsJson: json(characteristics),
    mediaTypeEvidenceIdsJson: '[]',
    identityEvidenceIdsJson: json(identityEvidenceIds),
    evidenceJson: json([...evidence.values()].sort((a, b) => a.id.localeCompare(b.id))),
    revision,
    reviewedAt,
    approvalRef,
  }
  const relations: RelationProjection[] = modelLinks.map(link => ({
    characterId: id,
    modelId: link.modelId,
    evidenceIdsJson: json([link.evidenceId]),
    approvalRef,
    modelSlug: link.modelSlug,
    franchiseName,
  }))
  return {
    character,
    relations,
    evidence,
    franchiseEvidenceIds,
    franchiseName,
  }
}

function makeUniverse(
  franchiseName: string,
  anchor: Awaited<ReturnType<typeof normalizeCharacter>>,
): UniverseProjection {
  const evidence = [...anchor.franchiseEvidenceIds]
    .map(id => anchor.evidence.get(id)!)
    .sort((a, b) => a.id.localeCompare(b.id))
  return {
    franchiseName,
    revision: `supabase:${anchor.character.id}:${anchor.character.revision.split(':').at(-1)}`,
    reviewedAt: anchor.character.reviewedAt,
    approvalRef: anchor.character.approvalRef,
    mediaTypesJson: '[]',
    summary: null,
    summaryEvidenceIdsJson: '[]',
    overview: null,
    overviewEvidenceIdsJson: '[]',
    identityEvidenceIdsJson: json(anchor.franchiseEvidenceIds),
    evidenceJson: json(evidence),
  }
}

function sha256(value: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then(digest =>
    [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join(''),
  )
}

export async function normalizeApprovedEditorialProjection(
  value: unknown,
  options: { allowEmpty?: boolean } = {},
): Promise<NormalizedEditorialProjection> {
  const root = record(value, 'editorial_projection_invalid')
  exactKeys(root, ['schemaVersion', 'source', 'generatedAt', 'characters'], 'editorial_projection_keys_invalid')
  if (root.schemaVersion !== 1 || root.source !== SOURCE_RPC) {
    throw new ProjectionInputError('editorial_projection_version_invalid')
  }
  const generatedAt = date(root.generatedAt, 'editorial_projection_generated_at_invalid')
  const sourceRevision = new Date(generatedAt).toISOString()
  const allowEmpty = options.allowEmpty === true
  const rawCharacters = array(root.characters, 'editorial_projection_characters_invalid', MAX_CHARACTERS)
  if (!rawCharacters.length && !allowEmpty) throw new ProjectionInputError('editorial_projection_empty')
  const normalized = await Promise.all(rawCharacters.map(normalizeCharacter))
  const ids = new Set<string>()
  const slugs = new Set<string>()
  for (const item of normalized) {
    if (ids.has(item.character.id)) throw new ProjectionInputError('editorial_character_duplicate')
    if (slugs.has(item.character.slug)) throw new ProjectionInputError('editorial_character_slug_duplicate')
    ids.add(item.character.id)
    slugs.add(item.character.slug)
  }

  const groups = new Map<string, Awaited<ReturnType<typeof normalizeCharacter>>[]>()
  for (const item of normalized) {
    const key = stableFranchiseKey(item.franchiseName)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  const universes: UniverseProjection[] = []
  for (const group of groups.values()) {
    group.sort((a, b) => a.character.id.localeCompare(b.character.id))
    universes.push(makeUniverse(group[0].franchiseName, group[0]))
  }
  universes.sort((a, b) => stableFranchiseKey(a.franchiseName).localeCompare(stableFranchiseKey(b.franchiseName)))
  const characters = normalized.map(item => item.character).sort((a, b) => a.id.localeCompare(b.id))
  const relations = normalized.flatMap(item => item.relations)
    .sort((a, b) => a.characterId.localeCompare(b.characterId) || a.modelId.localeCompare(b.modelId))
  if (relations.length > MAX_RELATIONS) throw new ProjectionInputError('editorial_model_link_limit')

  const canonical = json({ universes, characters, relations })
  const snapshotSha256 = await sha256(canonical)
  return {
    universes,
    characters,
    relations,
    snapshotSha256,
    sourceRevision,
    allowEmpty,
  }
}

function jsonChunks(values: unknown[], maxBytes = 512 * 1024): string[] {
  const chunks: string[] = []
  let current: unknown[] = []
  let currentBytes = 2
  const encoder = new TextEncoder()
  for (const value of values) {
    const encoded = json(value)
    const bytes = encoder.encode(encoded).byteLength
    const addition = bytes + (current.length ? 1 : 0)
    if (bytes + 2 > maxBytes) throw new ProjectionInputError('editorial_projection_row_too_large')
    if (current.length && currentBytes + addition > maxBytes) {
      chunks.push(json(current))
      current = []
      currentBytes = 2
    }
    current.push(value)
    currentBytes += bytes + (current.length > 1 ? 1 : 0)
  }
  if (current.length) chunks.push(json(current))
  return chunks
}

export function buildEditorialProjectionStatements(
  snapshot: NormalizedEditorialProjection,
  previousSha256: string,
  appliedAt: string,
  franchises: Map<string, number>,
) {
  const universeRows = snapshot.universes.map(row => ({
    franchiseId: franchises.get(stableFranchiseKey(row.franchiseName)),
    franchiseName: row.franchiseName,
    revision: row.revision,
    reviewedAt: row.reviewedAt,
    approvalRef: row.approvalRef,
    mediaTypesJson: row.mediaTypesJson,
    summary: row.summary,
    summaryEvidenceIdsJson: row.summaryEvidenceIdsJson,
    overview: row.overview,
    overviewEvidenceIdsJson: row.overviewEvidenceIdsJson,
    identityEvidenceIdsJson: row.identityEvidenceIdsJson,
    evidenceJson: row.evidenceJson,
  }))
  const characterRows = snapshot.characters.map(row => ({
    ...row,
    franchiseId: franchises.get(stableFranchiseKey(row.franchiseName)),
  }))
  const relationRows = snapshot.relations.map(row => ({
    characterId: row.characterId,
    modelId: row.modelId,
    evidenceIdsJson: row.evidenceIdsJson,
    approvalRef: row.approvalRef,
  }))
  const statements = [
    {
      sql: `UPDATE editorial_publication_sync
        SET previous_sha256=?, snapshot_sha256=?, source_revision=?, applied_at=?
        WHERE id=1`,
      values: [previousSha256, snapshot.snapshotSha256, snapshot.sourceRevision, appliedAt],
    },
    {
      sql: 'DELETE FROM editorial_publication_staged_model_links',
      values: [],
    },
  ]
  for (const rows of jsonChunks(universeRows)) statements.push({
    sql: `INSERT INTO editorial_public_universes (
        franchise_id, revision, reviewed_at, approval_ref, media_types_json,
        summary, summary_evidence_ids_json, overview, overview_evidence_ids_json,
        identity_evidence_ids_json, evidence_json
      )
      SELECT json_extract(item.value, '$.franchiseId'), json_extract(item.value, '$.revision'), json_extract(item.value, '$.reviewedAt'),
        json_extract(item.value, '$.approvalRef'), json_extract(item.value, '$.mediaTypesJson'),
        json_extract(item.value, '$.summary'), json_extract(item.value, '$.summaryEvidenceIdsJson'),
        json_extract(item.value, '$.overview'), json_extract(item.value, '$.overviewEvidenceIdsJson'),
        json_extract(item.value, '$.identityEvidenceIdsJson'), json_extract(item.value, '$.evidenceJson')
      FROM json_each(?) AS item
      WHERE 1
      ON CONFLICT(franchise_id) DO UPDATE SET
        revision=excluded.revision,
        reviewed_at=excluded.reviewed_at,
        approval_ref=excluded.approval_ref,
        media_types_json=excluded.media_types_json,
        summary=excluded.summary,
        summary_evidence_ids_json=excluded.summary_evidence_ids_json,
        overview=excluded.overview,
        overview_evidence_ids_json=excluded.overview_evidence_ids_json,
        identity_evidence_ids_json=excluded.identity_evidence_ids_json,
        evidence_json=excluded.evidence_json`,
    values: [rows],
  })
  for (const rows of jsonChunks(characterRows)) statements.push({
    sql: `INSERT INTO editorial_public_characters (
        id, slug, franchise_id, name, aliases_json, summary, summary_evidence_ids_json,
        biography, biography_evidence_ids_json, age_value, age_context, age_evidence_ids_json,
        origin_work, origin_work_evidence_ids_json, media_types_json, characteristics_json,
        media_type_evidence_ids_json, identity_evidence_ids_json, evidence_json, revision,
        reviewed_at, approval_ref
      )
      SELECT json_extract(item.value, '$.id'), json_extract(item.value, '$.slug'), json_extract(item.value, '$.franchiseId'),
        json_extract(item.value, '$.name'), json_extract(item.value, '$.aliasesJson'),
        json_extract(item.value, '$.summary'), json_extract(item.value, '$.summaryEvidenceIdsJson'),
        json_extract(item.value, '$.biography'), json_extract(item.value, '$.biographyEvidenceIdsJson'),
        json_extract(item.value, '$.ageValue'), json_extract(item.value, '$.ageContext'),
        json_extract(item.value, '$.ageEvidenceIdsJson'), json_extract(item.value, '$.originWork'),
        json_extract(item.value, '$.originWorkEvidenceIdsJson'), json_extract(item.value, '$.mediaTypesJson'),
        json_extract(item.value, '$.characteristicsJson'), json_extract(item.value, '$.mediaTypeEvidenceIdsJson'),
        json_extract(item.value, '$.identityEvidenceIdsJson'), json_extract(item.value, '$.evidenceJson'),
        json_extract(item.value, '$.revision'), json_extract(item.value, '$.reviewedAt'),
        json_extract(item.value, '$.approvalRef')
      FROM json_each(?) AS item
      WHERE 1
      ON CONFLICT(id) DO UPDATE SET
        slug=excluded.slug,
        franchise_id=excluded.franchise_id,
        name=excluded.name,
        aliases_json=excluded.aliases_json,
        summary=excluded.summary,
        summary_evidence_ids_json=excluded.summary_evidence_ids_json,
        biography=excluded.biography,
        biography_evidence_ids_json=excluded.biography_evidence_ids_json,
        age_value=excluded.age_value,
        age_context=excluded.age_context,
        age_evidence_ids_json=excluded.age_evidence_ids_json,
        origin_work=excluded.origin_work,
        origin_work_evidence_ids_json=excluded.origin_work_evidence_ids_json,
        media_types_json=excluded.media_types_json,
        characteristics_json=excluded.characteristics_json,
        media_type_evidence_ids_json=excluded.media_type_evidence_ids_json,
        identity_evidence_ids_json=excluded.identity_evidence_ids_json,
        evidence_json=excluded.evidence_json,
        revision=excluded.revision,
        reviewed_at=excluded.reviewed_at,
        approval_ref=excluded.approval_ref`,
    values: [rows],
  })
  for (const rows of jsonChunks(relationRows)) statements.push({
    sql: `INSERT INTO editorial_publication_staged_model_links (
        character_id, model_id, evidence_ids_json, approval_ref
      )
      SELECT json_extract(item.value, '$.characterId'), json_extract(item.value, '$.modelId'),
        json_extract(item.value, '$.evidenceIdsJson'), json_extract(item.value, '$.approvalRef')
      FROM json_each(?) AS item`,
    values: [rows],
  })
  statements.push(
    {
      sql: `INSERT INTO editorial_public_character_models (
          character_id, model_id, evidence_ids_json, approval_ref
        )
        SELECT character_id, model_id, evidence_ids_json, approval_ref
        FROM editorial_publication_staged_model_links
        WHERE 1
        ON CONFLICT(character_id, model_id) DO UPDATE SET
          evidence_ids_json=excluded.evidence_ids_json,
          approval_ref=excluded.approval_ref`,
      values: [],
    },
    {
      sql: `DELETE FROM editorial_public_character_models
        WHERE NOT EXISTS (
          SELECT 1 FROM editorial_publication_staged_model_links staged
          WHERE staged.character_id=editorial_public_character_models.character_id
            AND staged.model_id=editorial_public_character_models.model_id
        )`,
      values: [],
    },
    {
      sql: `DELETE FROM editorial_public_characters
        WHERE NOT EXISTS (
          SELECT 1 FROM json_each(?) AS incoming
          WHERE incoming.value=editorial_public_characters.id
        )`,
      values: [json(snapshot.characters.map(row => row.id))],
    },
    {
      sql: `DELETE FROM editorial_public_universes
        WHERE NOT EXISTS (
          SELECT 1 FROM editorial_public_characters c
          WHERE c.franchise_id=editorial_public_universes.franchise_id
        )`,
      values: [],
    },
    {
      sql: 'DELETE FROM editorial_publication_staged_model_links',
      values: [],
    },
  )
  return statements
}

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}

function sameSecret(actual: string, expected: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(actual)
  const right = encoder.encode(expected)
  let mismatch = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return mismatch === 0
}

async function validateCanonicalModels(
  db: D1Database,
  snapshot: NormalizedEditorialProjection,
): Promise<Map<string, number>> {
  if (!snapshot.relations.length) return new Map()
  const requested = snapshot.relations.map(row => ({
    characterId: row.characterId,
    modelId: row.modelId,
    modelSlug: row.modelSlug,
  }))
  const sql = `SELECT json_extract(request.value, '$.characterId') AS character_id,
      json_extract(request.value, '$.modelId') AS requested_model_id,
      json_extract(request.value, '$.modelSlug') AS requested_model_slug,
      m.id AS model_id, m.slug AS model_slug, m.franchise_id, m.published,
      f.name AS canonical_franchise_name
    FROM json_each(?) AS request
    LEFT JOIN models m ON m.id=json_extract(request.value, '$.modelId')
    LEFT JOIN franchises f ON f.id=m.franchise_id`
  const characterById = new Map(snapshot.characters.map(item => [item.id, item]))
  const franchiseIdsByCharacter = new Map<string, Set<number>>()
  for (const chunk of jsonChunks(requested)) {
    const rowsInChunk = JSON.parse(chunk) as typeof requested
    const result = await db.prepare(sql).bind(chunk).all<{
      character_id: string
      requested_model_id: string
      requested_model_slug: string
      model_id: string | null
      model_slug: string | null
      franchise_id: number | null
      published: number | null
      canonical_franchise_name: string | null
    }>()
    if (result.results.length !== rowsInChunk.length) {
      throw new ProjectionInputError('editorial_model_reference_invalid')
    }
    for (const row of result.results) {
      if (!row.model_id || row.model_slug !== row.requested_model_slug ||
          row.published !== 1 || row.franchise_id === null || !row.canonical_franchise_name) {
        throw new ProjectionInputError('editorial_model_reference_invalid')
      }
      const character = characterById.get(row.character_id)
      if (!character ||
          stableFranchiseKey(character.franchiseName) !== stableFranchiseKey(row.canonical_franchise_name)) {
        throw new ProjectionInputError('editorial_model_franchise_mismatch')
      }
      const ids = franchiseIdsByCharacter.get(row.character_id) ?? new Set<number>()
      ids.add(row.franchise_id)
      franchiseIdsByCharacter.set(row.character_id, ids)
    }
  }
  const franchiseByLabel = new Map<string, number>()
  for (const character of snapshot.characters) {
    const franchiseIds = franchiseIdsByCharacter.get(character.id)
    if (!franchiseIds || franchiseIds.size !== 1) {
      throw new ProjectionInputError('editorial_character_franchise_ambiguous')
    }
    const franchiseId = [...franchiseIds][0]
    const key = stableFranchiseKey(character.franchiseName)
    const existing = franchiseByLabel.get(key)
    if (existing !== undefined && existing !== franchiseId) {
      throw new ProjectionInputError('editorial_franchise_ambiguous')
    }
    franchiseByLabel.set(key, franchiseId)
  }
  return franchiseByLabel
}

async function syncState(db: D1Database): Promise<{ snapshotSha256: string; sourceRevision: string }> {
  const row = await db.prepare(`SELECT snapshot_sha256 AS snapshotSha256,
      source_revision AS sourceRevision
    FROM editorial_publication_sync WHERE id=1`).first<{
      snapshotSha256: string
      sourceRevision: string
    }>()
  if (!row || typeof row.snapshotSha256 !== 'string' || typeof row.sourceRevision !== 'string') {
    throw new Error('editorial_projection_sync_state_missing')
  }
  return row
}

function projectionSuccess(snapshot: NormalizedEditorialProjection, applied: boolean, idempotent: boolean) {
  return {
    ok: true,
    applied,
    idempotent,
    snapshotSha256: snapshot.snapshotSha256,
    sourceRevision: snapshot.sourceRevision,
    counts: {
      universes: snapshot.universes.length,
      characters: snapshot.characters.length,
      modelLinks: snapshot.relations.length,
    },
  }
}

export async function applyEditorialProjection(request: Request, env: EditorialProjectionEnv): Promise<Response> {
  const token = env.EDITORIAL_SYNC_TOKEN
  if (!token || token.length < 32) return response({ error: 'not_found' }, 404)
  if (request.method !== 'POST') return response({ error: 'method_not_allowed' }, 405)
  if (request.headers.has('origin')) return response({ error: 'origin_forbidden' }, 403)
  const authorization = request.headers.get('authorization') ?? ''
  if (!authorization.startsWith('Bearer ') || !sameSecret(authorization.slice(7), token)) {
    return response({ error: 'unauthorized' }, 401)
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    return response({ error: 'content_type_invalid' }, 415)
  }
  const size = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(size) && size > MAX_BODY_BYTES) return response({ error: 'request_too_large' }, 413)

  let payload: unknown
  const dryRun = request.headers.get('x-tonart-dry-run') === 'true'
  try {
    const body = await request.arrayBuffer()
    if (body.byteLength > MAX_BODY_BYTES) return response({ error: 'request_too_large' }, 413)
    payload = JSON.parse(new TextDecoder().decode(body))
  } catch {
    return response({ error: 'request_json_invalid' }, 400)
  }

  let snapshot: NormalizedEditorialProjection
  try {
    const allowEmpty = request.headers.get('x-tonart-allow-empty') === 'confirm'
    snapshot = await normalizeApprovedEditorialProjection(payload, { allowEmpty })
  } catch (error) {
    if (error instanceof ProjectionInputError) {
      const status = error.message === 'editorial_projection_empty' ? 409 : 422
      return response({ error: error.message }, status)
    }
    return response({ error: 'editorial_projection_invalid' }, 422)
  }

  try {
    const previous = await syncState(env.DB)
    if (previous.snapshotSha256 === snapshot.snapshotSha256) {
      return response(projectionSuccess(snapshot, false, true))
    }
    if (previous.sourceRevision && Date.parse(snapshot.sourceRevision) <= Date.parse(previous.sourceRevision)) {
      return response({ error: 'editorial_projection_stale_source_revision' }, 409)
    }
    if (Date.parse(snapshot.sourceRevision) > Date.now() + 5 * 60 * 1000) {
      return response({ error: 'editorial_projection_source_revision_in_future' }, 422)
    }
    const franchises = await validateCanonicalModels(env.DB, snapshot)
    if (dryRun) {
      return response({ ...projectionSuccess(snapshot, false, false), dryRun: true })
    }
    const statements = buildEditorialProjectionStatements(
      snapshot,
      previous.snapshotSha256,
      new Date().toISOString(),
      franchises,
    )
    await env.DB.batch(statements.map(item => env.DB.prepare(item.sql).bind(...item.values)))
    const committed = await syncState(env.DB)
    if (committed.snapshotSha256 !== snapshot.snapshotSha256) {
      return response({ error: 'editorial_projection_commit_unconfirmed' }, 503)
    }
    return response(projectionSuccess(snapshot, true, false), 200)
  } catch (error) {
    if (error instanceof ProjectionInputError) {
      return response({ error: error.message }, 422)
    }
    try {
      const current = await syncState(env.DB)
      if (current.snapshotSha256 === snapshot.snapshotSha256) {
        return response(projectionSuccess(snapshot, false, true))
      }
      if (current.snapshotSha256 !== '') {
        return response({ error: 'editorial_projection_conflict' }, 409)
      }
    } catch {
      // A missing/failed D1 projection schema stays a closed 503.
    }
    return response({ error: 'editorial_projection_unavailable' }, 503)
  }
}
