import { useCallback, useEffect, useMemo, useState } from "react";

export type QuoteCartItem = {
  model_id: string;
  quantity: number;
  scale: string;
};

export type QuoteCart = {
  items: QuoteCartItem[];
  updatedAt: number;
};

const STORAGE_KEY = "tonecos_quote_cart_v1";
const EMIT_EVENT = "tonecos_quote_cart_updated";

function safeParse(raw: string | null): QuoteCart | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.items)) return null;
    return {
      items: parsed.items
        .filter((it: any) => it && typeof it.model_id === "string")
        .map((it: any) => ({
          model_id: String(it.model_id),
          quantity: Number.isFinite(Number(it.quantity))
            ? Math.max(1, Math.trunc(Number(it.quantity)))
            : 1,
          scale: typeof it.scale === "string" ? it.scale : "",
        })),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function getQuoteCart(): QuoteCart {
  const parsed = safeParse(localStorage.getItem(STORAGE_KEY));
  return parsed ?? { items: [], updatedAt: Date.now() };
}

export function setQuoteCart(next: QuoteCart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, updatedAt: Date.now() }));
  window.dispatchEvent(new Event(EMIT_EVENT));
}

export function clearQuoteCart() {
  setQuoteCart({ items: [], updatedAt: Date.now() });
}

export function addToQuoteCart(item: QuoteCartItem) {
  const cart = getQuoteCart();
  const existing = cart.items.find((i) => i.model_id === item.model_id);
  const nextItems = existing
    ? cart.items.map((i) => (i.model_id === item.model_id ? { ...i, ...item } : i))
    : [...cart.items, item];
  setQuoteCart({ items: nextItems, updatedAt: Date.now() });
}

export function updateQuoteCartItem(modelId: string, patch: Partial<QuoteCartItem>) {
  const cart = getQuoteCart();
  const nextItems = cart.items.map((i) => {
    if (i.model_id !== modelId) return i;
    const quantity = patch.quantity === undefined ? i.quantity : patch.quantity;
    return {
      ...i,
      ...patch,
      quantity: Math.max(1, Math.trunc(Number(quantity) || 1)),
      scale: typeof patch.scale === "string" ? patch.scale : i.scale,
    };
  });
  setQuoteCart({ items: nextItems, updatedAt: Date.now() });
}

export function removeFromQuoteCart(modelId: string) {
  const cart = getQuoteCart();
  setQuoteCart({ items: cart.items.filter((i) => i.model_id !== modelId), updatedAt: Date.now() });
}

export function useQuoteCart() {
  const [cart, setCart] = useState<QuoteCart>(() => getQuoteCart());

  useEffect(() => {
    const sync = () => setCart(getQuoteCart());
    window.addEventListener("storage", sync);
    window.addEventListener(EMIT_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EMIT_EVENT, sync);
    };
  }, []);

  const count = useMemo(() => cart.items.length, [cart.items.length]);

  const add = useCallback((item: QuoteCartItem) => addToQuoteCart(item), []);
  const update = useCallback(
    (modelId: string, patch: Partial<QuoteCartItem>) => updateQuoteCartItem(modelId, patch),
    []
  );
  const remove = useCallback((modelId: string) => removeFromQuoteCart(modelId), []);
  const clear = useCallback(() => clearQuoteCart(), []);

  return { cart, count, add, update, remove, clear };
}
