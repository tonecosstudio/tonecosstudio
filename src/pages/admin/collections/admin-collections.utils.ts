export function slugifyCollectionName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}
