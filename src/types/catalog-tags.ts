/** Public taxonomy projection shared by the legacy and Telegram catalog routes. */
export type CatalogTagKind =
  | 'category'
  | 'franchise'
  | 'character'
  | 'publisher'
  | 'universe'
  | 'sign'
  | 'constellation'

export type CatalogTag = {
  kind: CatalogTagKind
  id: string
  label: string
  slug: string
  provisional?: boolean
}

type CanonicalTagFields = {
  category?: string
  categorySlug?: string
  franchise?: string
  franchiseSlug?: string
}

/** Keep category/franchise from the same D1 model row during Worker rollout. */
export function canonicalTagsForModel(
  tags: CatalogTag[] | undefined,
  fields: CanonicalTagFields,
): CatalogTag[] {
  const result = [...(tags ?? [])]
  if (fields.category && fields.categorySlug && !result.some((tag) => tag.kind === "category")) {
    result.push({
      kind: "category",
      id: fields.categorySlug,
      label: fields.category,
      slug: fields.categorySlug,
      ...(fields.categorySlug === "curadoria-pendente" ? { provisional: true } : {}),
    })
  }
  if (fields.franchise && fields.franchiseSlug && !result.some((tag) => tag.kind === "franchise")) {
    result.push({
      kind: "franchise",
      id: fields.franchiseSlug,
      label: fields.franchise,
      slug: fields.franchiseSlug,
      ...(fields.franchiseSlug === "franquia-a-identificar" ? { provisional: true } : {}),
    })
  }
  return result
}
