const POSTGREST_SEARCH_MAX_LENGTH = 120;
const POSTGREST_FILTER_GRAMMAR_CHARS = /[,%()]/g;
const POSTGREST_WILDCARD_CHARS = /[%_]/g;
const SCRIPT_AND_FILTER_CHARS = /[<>{}[\]\\;"'`]/g;

function removeControlChars(input: string): string {
  return Array.from(input)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
}

export function sanitizePostgrestSearchTerm(input: unknown): string {
  if (typeof input !== "string") return "";

  return removeControlChars(input.slice(0, POSTGREST_SEARCH_MAX_LENGTH))
    .replace(SCRIPT_AND_FILTER_CHARS, " ")
    .replace(POSTGREST_FILTER_GRAMMAR_CHARS, " ")
    .replace(POSTGREST_WILDCARD_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
}
