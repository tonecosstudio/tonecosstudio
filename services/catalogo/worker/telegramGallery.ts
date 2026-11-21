/**
 * Canonical Telegram gallery ordering used by the private editor and public showcase.
 * Never changes image ownership, rights or publication state.
 */
export function orderedTelegramGallery<T extends { image_id: string }>(
  images: readonly T[],
  encodedOrder: string | null | undefined,
): T[] {
  const fallback = [...images]
  if (!encodedOrder) return fallback

  let requested: unknown
  try {
    requested = JSON.parse(encodedOrder)
  } catch {
    return fallback
  }
  if (!Array.isArray(requested) || requested.length !== images.length) {
    return fallback
  }

  const byMessage = new Map<number, T>()
  for (const image of images) {
    const match = /^tg:([1-9]\d*)$/.exec(image.image_id)
    if (!match) return fallback
    const messageId = Number(match[1])
    if (!Number.isSafeInteger(messageId) || byMessage.has(messageId)) {
      return fallback
    }
    byMessage.set(messageId, image)
  }
  if (
    requested.some((id) => !Number.isSafeInteger(id) || !byMessage.has(id)) ||
    new Set(requested).size !== images.length
  ) {
    return fallback
  }
  return requested.map((id) => byMessage.get(id)!)
}
