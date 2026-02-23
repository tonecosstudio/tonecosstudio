export function compactTags(tags: string[] | null, limit = 2) {
  return (tags ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function buildModelTitle(name: string, franchise: string | null) {
  const n = (name ?? "").trim();
  const f = (franchise ?? "").trim();

  const capitalize = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const capitalizedName = capitalize(n);

  if (!f) return capitalizedName;
  // Evita duplicar quando o nome já contém a franquia (ex.: "blanka street fighter" + "Street Fighter")
  const nNorm = n.toLocaleLowerCase();
  const fNorm = f.toLocaleLowerCase();
  if (nNorm.includes(fNorm)) return capitalizedName;
  return `${capitalizedName} ${f}`.trim();
}
