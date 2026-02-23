type NameHints = {
  folder: string | null;
  rawBaseName: string;
};

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/u, "");
}

function titleCase(input: string): string {
  const cleaned = input
    .trim()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ");
  if (!cleaned) return cleaned;
  return cleaned
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

export function extractNameHints(originalFilenameOrPath: string | null | undefined): NameHints {
  const raw = String(originalFilenameOrPath ?? "").trim();
  if (!raw) return { folder: null, rawBaseName: "" };

  // Se vier com caminho (pasta/arquivo), pegamos a última pasta.
  const normalized = raw.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);

  const filePart = parts.length ? parts[parts.length - 1] : normalized;
  const folderPart = parts.length >= 2 ? parts[parts.length - 2] : null;

  return {
    folder: folderPart ? folderPart.trim() || null : null,
    rawBaseName: stripExtension(filePart),
  };
}

export function buildPrettyModelNameFromFilename(originalFilenameOrPath: string | null | undefined): string {
  const { rawBaseName } = extractNameHints(originalFilenameOrPath);
  if (!rawBaseName) return "";

  // 1) normaliza separadores
  let s = rawBaseName
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 2) remove tokens puramente numéricos (ex.: "goku 123")
  s = s
    .split(" ")
    .filter((tok) => !/^\d+$/u.test(tok))
    .join(" ")
    .trim();

  // 3) variações comuns (regras simples, sem IA)
  // Mantém a intenção do usuário: "goku super sayajin", "goku criança" etc.
  const lower = s.toLowerCase();
  const variants: Array<{ test: RegExp; label: string }> = [
    { test: /\b(ssj|ssj1|super\s*saiyajin|super\s*sayajin)\b/u, label: "Super Saiyajin" },
    { test: /\b(ssj2|super\s*saiyajin\s*2|super\s*sayajin\s*2)\b/u, label: "Super Saiyajin 2" },
    { test: /\b(ssj3|super\s*saiyajin\s*3|super\s*sayajin\s*3)\b/u, label: "Super Saiyajin 3" },
    { test: /\b(ultra\s*instinct|instinto\s*superior)\b/u, label: "Instinto Superior" },
    { test: /\b(kid|crianca|criança|child)\b/u, label: "Criança" },
  ];

  const matched = variants.find((v) => v.test.test(lower));

  // Remove os tokens que representam a variação para não duplicar
  if (matched) {
    s = s
      .replace(matched.test, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const base = titleCase(s);
  if (!base) return "";
  return matched ? `${base} ${matched.label}`.trim() : base;
}

export function prettyFolderName(folder: string | null | undefined): string {
  if (!folder) return "";
  return titleCase(folder);
}
