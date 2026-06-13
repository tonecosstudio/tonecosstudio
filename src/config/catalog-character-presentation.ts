export type CatalogCharacterPresentationOverride = {
  coverModelId?: string;
};

export const CATALOG_CHARACTER_PRESENTATION_OVERRIDES: Record<
  string,
  CatalogCharacterPresentationOverride
> = {};

function normalizePresentationKeyPart(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export function getCatalogCharacterPresentationKey(params: {
  sourceTitle?: string | null;
  characterName?: string | null;
}) {
  const sourceTitle = normalizePresentationKeyPart(params.sourceTitle);
  const characterName = normalizePresentationKeyPart(params.characterName);
  if (!sourceTitle || !characterName) return "";
  return `${sourceTitle}::${characterName}`;
}

export function getCatalogCharacterPresentationOverride(params: {
  sourceTitle?: string | null;
  characterName?: string | null;
}) {
  const key = getCatalogCharacterPresentationKey(params);
  return key ? CATALOG_CHARACTER_PRESENTATION_OVERRIDES[key] ?? null : null;
}
