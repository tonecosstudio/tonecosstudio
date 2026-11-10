import { createPrivateRateFingerprint, getServiceClient } from "../_shared/supabase.ts";

const db = getServiceClient();
const allowed = (origin: string) => /^https:\/\/(?:www\.)?tonartstudio\.com\.br$/.test(origin) ||
  /^https:\/\/tonart-studio-public-[a-z0-9-]+\.vercel\.app$/.test(origin);
const json = (body: unknown, status = 200, origin = "") => new Response(JSON.stringify(body), {
  status, headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    ...(allowed(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
  },
});
const string = (v: unknown, max: number) => typeof v === "string" && v.length <= max ? v.trim() : "";
function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}
async function rateAllowed(value: string) {
  const { data, error } = await db.rpc("tonart_quote_check_limit", { p_fingerprint: await createPrivateRateFingerprint(value) });
  return !error && data === true;
}
async function authenticate(request: Request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+([A-Za-z0-9._~-]+)$/i)?.[1];
  if (!bearer) return null;
  const { data, error } = await db.auth.getUser(bearer);
  if (error || !data.user?.email_confirmed_at || !data.user.email) return null;
  const email = data.user.email.toLowerCase().trim();
  const permitted = await db.from("tonart_quote_admin_emails").select("email").eq("email", email).maybeSingle();
  return permitted.error || !permitted.data ? null : data.user.id;
}
async function submit(request: Request, origin: string) {
  if (!allowed(origin)) return json({ error: "Origem inválida." }, 403, origin);
  if (Number(request.headers.get("content-length") || "0") > 16000) return json({ error: "Solicitação muito grande." }, 413, origin);
  let input: Record<string, unknown>;
  try { input = await request.json(); }
  catch { return json({ error: "Dados inválidos." }, 400, origin); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return json({ error: "Dados inválidos." }, 400, origin);
  if (input.website || input.consent !== true) return json({ error: "Confirme o consentimento para enviar." }, 400, origin);
  const name = string(input.name, 120);
  const email = string(input.email, 254).toLowerCase();
  const whatsapp = string(input.whatsapp ?? "", 30).replace(/[\s()+-]/g, "");
  const postal = string(input.postalCode ?? "", 15).replace(/\D/g, "");
  const notes = string(input.notes ?? "", 1200);
  const scale = string(input.scale, 20);
  const finishing = string(input.finishing, 20);
  const items = input.items;
  if (name.length < 2 || !validEmail(email) ||
    (whatsapp && !/^[0-9]{10,13}$/.test(whatsapp)) ||
    (postal && !/^[0-9]{8}$/.test(postal)) ||
    !["1/10", "1/6", "outro", "a definir"].includes(scale) ||
    !["pintado", "sem pintura", "a definir"].includes(finishing) ||
    !Array.isArray(items) || items.length < 1 || items.length > 50 ||
    items.some((item) => !item || typeof item !== "object" ||
      !/^[a-z0-9][a-z0-9-]{0,239}$/.test(item.slug) ||
      typeof item.name !== "string" || !item.name.trim() || item.name.length > 160 ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) ||
    new Set(items.map((item) => item.slug)).size !== items.length
  ) return json({ error: "Revise os dados do orçamento." }, 400, origin);
  const forwarded = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
  // Independent hourly quotas for address and e-mail. Never retain raw IPs.
  if (!await rateAllowed("address:" + forwarded) || !await rateAllowed("email:" + email)) {
    return json({ error: "Limite de solicitações atingido. Tente novamente mais tarde." }, 429, origin);
  }
  const safeItems = items.map((item) => ({ slug: item.slug, name: item.name.trim(), quantity: item.quantity }));
  const { data, error } = await db.from("tonart_quote_requests")
    .insert({
      customer_name: name, customer_email: email,
      customer_whatsapp: whatsapp || null, postal_code: postal || null,
      items: safeItems, desired_scale: scale, finishing, notes: notes || null,
    }).select("id").single();
  if (error || !data?.id) return json({ error: "Não foi possível registrar a solicitação. Tente novamente." }, 503, origin);
  return json({ received: true, reference: data.id }, 201, origin);
}
Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": allowed(origin) ? origin : "null",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "authorization,content-type,apikey",
      "Vary": "Origin", "Access-Control-Max-Age": "300"
    } });
  }
  if (request.method === "POST") return submit(request, origin);
  if (request.method !== "GET" && request.method !== "PATCH")
    return json({ error: "Método não permitido." }, 405, origin);
  if (!await authenticate(request)) return json({ error: "Acesso restrito." }, 401, origin);
  if (request.method === "GET") {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "0");
    if (!Number.isInteger(page) || page < 0 || page > 200) return json({ error: "Página inválida." }, 400, origin);
    const status = url.searchParams.get("status") || "";
    if (status && !["novo","em_analise","respondido","arquivado"].includes(status))
      return json({ error: "Filtro inválido." }, 400, origin);
    let query = db.from("tonart_quote_requests")
      .select("id,created_at,updated_at,customer_name,customer_email,customer_whatsapp,postal_code,items,desired_scale,finishing,notes,status,admin_note", { count: "exact" })
      .order("created_at", { ascending: false }).range(page * 30, (page + 1) * 30 - 1);
    if (status) query = query.eq("status", status);
    const { data, error, count } = await query;
    return error ? json({ error: "Não foi possível consultar as solicitações." }, 503, origin)
      : json({ items: data, total: count ?? 0 }, 200, origin);
  }
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json({ error: "Dados inválidos." }, 400, origin); }
  const id = typeof data?.id === "string" ? data.id : "";
  const status = typeof data?.status === "string" ? data.status : "";
  const adminNote = string(data?.adminNote ?? "", 1500);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      !["novo","em_analise","respondido","arquivado"].includes(status) ||
      (typeof data?.adminNote === "string" && data.adminNote.length > 1500))
    return json({ error: "Atualização inválida." }, 400, origin);
  const { data: updated, error } = await db.from("tonart_quote_requests")
    .update({ status, admin_note: adminNote, updated_at: new Date().toISOString() })
    .eq("id", id).select("id,status,admin_note").maybeSingle();
  return error ? json({ error: "Falha ao salvar." }, 503, origin)
    : !updated ? json({ error: "Solicitação não encontrada." }, 404, origin)
    : json({ saved: true, item: updated }, 200, origin);
});
