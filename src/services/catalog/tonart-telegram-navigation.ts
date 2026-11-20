import type { TelegramStudioIndexPage } from "./tonart-telegram-drafts";

export type TelegramIndexDirection = -1 | 1;
export type TelegramIndexNeighbor = {
  id: string;
  newOffset: number;
  newPage: TelegramStudioIndexPage | null;
};

/**
 * The public index is the read-only navigation authority. Editing continues
 * through the authenticated Worker route; this module never writes anything.
 */
export function canNavigateTelegramIndex(
  page: TelegramStudioIndexPage | null,
  selectedId: string | null,
  direction: TelegramIndexDirection,
): boolean {
  if (!page || !selectedId || page.limit <= 0) return false;
  const index = page.items.findIndex((item) => item.id === selectedId);
  if (index < 0) return false;
  if (direction === 1) {
    return index < page.items.length - 1 ||
      page.offset + page.limit < page.total;
  }
  return index > 0 || page.offset > 0;
}

/**
 * Keep the current selection on failed page loads, and reject mismatched
 * offsets/limits instead of silently skipping a model in the curation queue.
 */
export async function resolveTelegramIndexNeighbor(
  page: TelegramStudioIndexPage,
  selectedId: string,
  direction: TelegramIndexDirection,
  loadPage: (offset: number) => Promise<TelegramStudioIndexPage>,
): Promise<TelegramIndexNeighbor | null> {
  if (!canNavigateTelegramIndex(page, selectedId, direction)) return null;
  const index = page.items.findIndex((item) => item.id === selectedId);
  const samePage = page.items[index + direction];
  if (samePage) {
    return { id: samePage.id, newPage: null, newOffset: page.offset };
  }
  const newOffset = page.offset + direction * page.limit;
  const newPage = await loadPage(newOffset);
  if (
    newPage.offset !== newOffset ||
    newPage.limit !== page.limit ||
    newPage.items.length === 0
  ) {
    throw new Error("adjacent_page_unavailable");
  }
  const selected = direction === 1
    ? newPage.items[0]
    : newPage.items[newPage.items.length - 1];
  if (!selected) throw new Error("adjacent_page_unavailable");
  return { id: selected.id, newPage, newOffset };
}
