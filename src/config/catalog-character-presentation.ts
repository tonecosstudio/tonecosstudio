export type CatalogCharacterPresentationOverride = {
  coverModelId?: string;
};

export type CatalogCharacterPresentationAliasOverride = {
  key: string;
  label?: string;
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
  "dragon ball::bulma": {
    coverModelId: "e85f9c27-1b9d-407a-97eb-4af0960daf04",
  },
  "dragon ball::lunch": {
    coverModelId: "fc2febf7-aa71-4bfd-8183-cf8542945fee",
  },
  "dragon ball::kuririn": {
    coverModelId: "b29b3fce-873e-478d-b07e-9572739ab295",
  },
  "dragon ball::shenlong": {
    coverModelId: "5f0aab0c-6ce2-4e93-954a-d76f0ef7af63",
  },
  "dragon ball::gogeta": {
    coverModelId: "cd385b05-44bc-4fc0-8038-6e763ebd16a8",
  },
  "dragon ball::gogeta ssj4": {
    coverModelId: "1cecb6a6-3009-4a9a-a11b-98ac8cd0a2ef",
  },
};

export const CATALOG_CHARACTER_PRESENTATION_ALIAS_OVERRIDES: Record<
  string,
  CatalogCharacterPresentationAliasOverride[]
> = {
  "dragon ball::busto freeza": [{ key: "freeza", label: "Freeza" }],
  "dragon ball::busto goku": [{ key: "goku", label: "Goku" }],
  "dragon ball::busto goku super saiyajin": [{ key: "goku", label: "Goku" }],
  "dragon ball::busto piccolo": [{ key: "piccolo", label: "Piccolo" }],
  "dragon ball::busto vegeta": [{ key: "vegeta", label: "Vegeta" }],
  "dragon ball::busto trunks": [{ key: "trunks", label: "Trunks" }],
  "dragon ball::busto gohan": [{ key: "gohan", label: "Gohan" }],
  "dragon ball::busto androide 18": [
    { key: "androide 18", label: "Androide 18" },
  ],
  "dragon ball::painel shenlong": [{ key: "shenlong", label: "Shenlong" }],
  "dragon ball::painel goku e vegeta": [
    { key: "goku", label: "Goku" },
    { key: "vegeta", label: "Vegeta" },
  ],
  "dragon ball::trunks vs cell": [
    { key: "trunks", label: "Trunks" },
    { key: "cell", label: "Cell" },
  ],
  "dragon ball::broly vs goku": [
    { key: "broly", label: "Broly" },
    { key: "goku", label: "Goku" },
  ],
  "dragon ball::goku vs freeza": [
    { key: "goku", label: "Goku" },
    { key: "freeza", label: "Freeza" },
  ],
  "dragon ball::conjunto bulma, goku e shenlong": [
    { key: "bulma", label: "Bulma" },
    { key: "goku", label: "Goku" },
    { key: "shenlong", label: "Shenlong" },
  ],
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

export function getCatalogCharacterPresentationAliasOverride(params: {
  sourceTitle?: string | null;
  characterName?: string | null;
}) {
  const key = getCatalogCharacterPresentationKey(params);
  return key
    ? CATALOG_CHARACTER_PRESENTATION_ALIAS_OVERRIDES[key] ?? null
    : null;
}
