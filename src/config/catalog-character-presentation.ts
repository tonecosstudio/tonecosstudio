export type CatalogCharacterPresentationOverride = {
  coverModelId?: string;
};

export const CATALOG_CHARACTER_PRESENTATION_OVERRIDES: Record<
  string,
  CatalogCharacterPresentationOverride
> = {
  "dragon ball::goku": {
    coverModelId: "77ecfa4c-1eb1-4d24-95b2-6f35ec06e4bf",
  },
  "dragon ball::vegeta": {
    coverModelId: "34998b22-6f67-4976-ad25-73d01fe8b001",
  },
  "dragon ball::freeza": {
    coverModelId: "20e33d3d-5da1-48fc-891b-b72e7c4fde02",
  },
  "dragon ball::gohan": {
    coverModelId: "108fc9c1-599d-480f-9cef-ca5d8152ccfe",
  },
  "dragon ball::piccolo": {
    coverModelId: "7aaeabc2-1d9a-4779-9e5f-0c0435657bd0",
  },
  "dragon ball::androide 18": {
    coverModelId: "2b362d05-a6eb-4556-a1cb-82f467ecac29",
  },
  "dragon ball::trunks": {
    coverModelId: "b40c4c99-f003-4e82-9e2f-9436c160c823",
  },
  "dragon ball::mestre kame": {
    coverModelId: "d002118c-5013-4978-93fb-41c2599c5137",
  },
  "dragon ball::nappa": {
    coverModelId: "ce18a292-ad5b-4b9a-a58b-da1b39c7c29a",
  },
  "dragon ball::zarbon": {
    coverModelId: "dac08925-e4fe-4750-b0c3-0dda727ec648",
  },
};

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
