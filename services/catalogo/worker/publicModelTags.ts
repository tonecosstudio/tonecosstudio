export type CanonicalPublicTagKind =
  | 'category'
  | 'franchise'
  | 'character'
  | 'publisher'
  | 'universe'
  | 'sign'
  | 'constellation'

export type CanonicalPublicTag = {
  kind: CanonicalPublicTagKind
  id: string
  label: string
  slug: string
  provisional?: boolean
}

type TagDatabase = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T = unknown>(): Promise<{ results: T[] }>
    }
  }
}

type TagOwner = { id: string; provisional?: boolean }
type TagRow = {
  model_id: string
  kind: CanonicalPublicTagKind
  id: string
  label: string
  slug: string
  provisional: number
}

const TAG_ORDER: Record<CanonicalPublicTagKind, number> = {
  category: 0,
  franchise: 1,
  character: 2,
  publisher: 3,
  universe: 4,
  sign: 5,
  constellation: 6,
}

/** Read-only projection of all public model tags from the canonical D1 taxonomy. */
export async function loadCanonicalPublicModelTags(
  db: TagDatabase,
  owners: TagOwner[],
): Promise<Map<string, CanonicalPublicTag[]>> {
  const result = new Map<string, CanonicalPublicTag[]>(owners.map(({ id }) => [id, []]))
  if (owners.length === 0) return result

  // Bound each statement to one catalog page and bind every ID exactly once.
  const placeholders = owners.map(() => '(?)').join(',')
  const rows = (await db.prepare(`
    WITH requested_models(id) AS (VALUES ${placeholders})
    SELECT m.id AS model_id,'category' AS kind,CAST(c.id AS TEXT) AS id,
      c.name AS label,c.slug,
      CASE WHEN c.slug='curadoria-pendente' THEN 1 ELSE 0 END AS provisional
    FROM requested_models requested
    JOIN models m ON m.id=requested.id
    JOIN franchises f ON f.id=m.franchise_id
    JOIN categories c ON c.id=f.category_id
    UNION ALL
    SELECT m.id AS model_id,'franchise' AS kind,CAST(f.id AS TEXT) AS id,
      f.name AS label,f.slug,
      CASE WHEN f.slug='franquia-a-identificar' THEN 1 ELSE 0 END AS provisional
    FROM requested_models requested
    JOIN models m ON m.id=requested.id
    JOIN franchises f ON f.id=m.franchise_id
    UNION ALL
    SELECT mc.model_id,'character' AS kind,c.id AS id,c.display_name AS label,
      c.canonical_slug AS slug,0 AS provisional
    FROM requested_models requested
    JOIN catalog_model_characters mc ON mc.model_id=requested.id AND mc.review_state='confirmed'
    JOIN catalog_characters c ON c.id=mc.character_id AND c.status='confirmed'
    JOIN models m ON m.id=mc.model_id
    WHERE COALESCE(m.telegram_name_provisional,0)=0
    UNION ALL
    SELECT mc.model_id,a.kind,a.id,a.display_name AS label,a.canonical_slug AS slug,
      0 AS provisional
    FROM requested_models requested
    JOIN catalog_model_characters mc ON mc.model_id=requested.id AND mc.review_state='confirmed'
    JOIN catalog_characters c ON c.id=mc.character_id AND c.status='confirmed'
    JOIN catalog_character_attributes ca ON ca.character_id=c.id AND ca.review_state='confirmed'
    JOIN catalog_attributes a ON a.id=ca.attribute_id AND a.status='confirmed'
    JOIN models m ON m.id=mc.model_id
    WHERE COALESCE(m.telegram_name_provisional,0)=0
    ORDER BY model_id,kind,label COLLATE NOCASE
  `).bind(...owners.map(({ id }) => id)).all<TagRow>()).results

  for (const row of rows) {
    const tags = result.get(row.model_id)
    if (!tags) continue
    const duplicate = tags.some((tag) => tag.kind === row.kind && tag.id === row.id)
    if (duplicate) continue
    tags.push({
      kind: row.kind,
      id: row.id,
      label: row.label,
      slug: row.slug,
      ...(row.provisional ? { provisional: true } : {}),
    })
  }

  for (const tags of result.values()) {
    tags.sort((a, b) => TAG_ORDER[a.kind] - TAG_ORDER[b.kind] || a.label.localeCompare(b.label, 'pt-BR'))
  }
  return result
}
