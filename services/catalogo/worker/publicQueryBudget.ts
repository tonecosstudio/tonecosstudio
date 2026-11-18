/**
 * Canonical anonymous read query budget for the ONE deployed catalog Worker.
 *
 * Reject cache-key fragmentation before D1 schema checks or R2 object reads.
 * No alternate cache, rate-limit state, D1 queries, or new endpoints.
 * Only affects public read routes. Quotes, shared collections and preflight
 * retain their original handlers.
 */
const MODEL_SLUG = "[a-z0-9][a-z0-9-]{0,239}"
const MODEL_DETAIL = new RegExp("^/api/models/" + MODEL_SLUG + "$")
const MODEL_GALLERY = new RegExp("^/api/models/" + MODEL_SLUG + "/images$")
const EDITORIAL_CHARACTER = new RegExp("^/api/editorial/v1/characters/" + MODEL_SLUG + "$")
const EDITORIAL_UNIVERSE = new RegExp("^/api/editorial/v1/universes/" + MODEL_SLUG + "/" + MODEL_SLUG + "$")
const EDITORIAL_CHARACTER_SEARCH = "/api/editorial/v1/characters/search"
const EDITORIAL_MODEL_CHARACTERS = /^\/api\/editorial\/v1\/models\/[A-Za-z0-9_-]{1,120}\/characters$/

/**
 * Returns null when outside the public read budget, true for an accepted
 * canonical query and false for a query that must fail before storage access.
 */
export type CatalogQueryBudgetResult = boolean | null | {
  error: 'invalid_height_range' | 'search_too_short' | 'search_too_long'
  minLength?: number
  maxLength?: number
}

export function validatePublicCatalogQuery(url: URL): CatalogQueryBudgetResult {
  const path = url.pathname
  const media = path.startsWith("/media/")
  if (media) return !url.search
  const editorialCharacter = EDITORIAL_CHARACTER.test(path)
  const editorialUniverse = EDITORIAL_UNIVERSE.test(path)
  const editorialCharacterSearch = path === EDITORIAL_CHARACTER_SEARCH
  const editorialModelCharacters = EDITORIAL_MODEL_CHARACTERS.test(path)
  if (editorialCharacterSearch && !url.searchParams.has("q")) return false

  const readRoute = path === "/api/catalog" || path === "/api/recent" ||
    path === "/api/categories" || path === "/api/franchises" ||
    path === "/api/folders" || path === "/api/health" ||
    path.startsWith("/api/models/") || editorialCharacter || editorialUniverse ||
    editorialCharacterSearch || editorialModelCharacters
  if (!readRoute) return path.startsWith("/api/editorial/") ? false : null

  if (url.search.length > 2048) return false

  let allowed: readonly string[]
  if (path === "/api/catalog") {
    allowed = ["category", "franchise", "folder", "q", "material",
      "collection", "minHeight", "maxHeight", "limit", "cursor"]
  } else if (path === "/api/franchises") {
    allowed = ["category", "q", "limit"]
  } else if (editorialCharacterSearch) {
    allowed = ["q", "limit"]
  } else if (path === "/api/folders") {
    allowed = ["category", "franchise", "parent"]
  } else if (path === "/api/recent") {
    allowed = ["limit"]
  } else if (MODEL_GALLERY.test(path)) {
    allowed = ["limit", "cursor", "v"]
  } else if (path === "/api/categories" || path === "/api/health" ||
             MODEL_DETAIL.test(path) || editorialCharacter || editorialUniverse) {
    allowed = []
  } else if (editorialModelCharacters) {
    allowed = []
  } else {
    // Unknown model subroutes must not invoke the schema check.
    return false
  }

  const names = new Set(allowed)
  const seen = new Set<string>()
  let minHeight: number | null = null
  let maxHeight: number | null = null
  for (const [key, value] of url.searchParams) {
    if (!names.has(key) || seen.has(key) || value.length < 1 ||
        value.length > 2048 || Array.from(value).some(char => char.charCodeAt(0) <= 31 || char.charCodeAt(0) === 127)) return false
    seen.add(key)
    if (key === "limit") {
      const max = path === "/api/recent" ? 24 : path === "/api/franchises" ? 48 :
        editorialCharacterSearch ? 12 : 60
      if (!/^[1-9][0-9]?$/.test(value) || Number(value) > max) return false
    } else if (key === "minHeight" || key === "maxHeight") {
      if (!/^[1-9][0-9]{0,2}$/.test(value) || Number(value) > 300) {
        return { error: 'invalid_height_range' }
      }
      if (key === 'minHeight') minHeight = Number(value)
      if (key === 'maxHeight') maxHeight = Number(value)
    } else if (key === "v") {
      if (!/^[1-9][0-9]{0,14}$/.test(value) ||
          !Number.isSafeInteger(Number(value))) return false
    } else if (key === "cursor") {
      // D1 list cursors use base64url, galleries can use padded base64.
      if (!/^[A-Za-z0-9+/_-]{1,2048}={0,2}$/.test(value)) return false
    } else if (key === "category" || key === "franchise") {
      if (!/^[a-z0-9][a-z0-9-]{0,239}$/.test(value)) return false
    } else if (key === "folder" || key === "parent") {
      if (value.length > 240 || value.includes("\\") ||
          value.split("/").some(part => !part || part === "." || part === "..")) return false
    } else if (key === "q") {
      const length = Array.from(value.trim()).length
      if (length < 3) return { error: 'search_too_short', minLength: 3 }
      const max = editorialCharacterSearch ? 80 : 120
      if (length > max) return { error: 'search_too_long', maxLength: max }
    } else if (key === "material" || key === "collection") {
      if (Array.from(value).length > 120) return false
    }
  }
  if (minHeight !== null && maxHeight !== null && minHeight > maxHeight) {
    return { error: 'invalid_height_range' }
  }
  return true
}
