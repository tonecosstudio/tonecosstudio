/** No direct database credentials in the browser; Supabase Edge Function owns writes. */
import { isIP } from "node:net";
const REMOTE = "https://icmtmaakjucmuzxnofkd.supabase.co/functions/v1/tonart-quotes";
const COOKIE = "tonart_quote_owner";
function ownerToken(req) {
  const row = (req.headers.cookie || "").split(";").find(s => s.trim().startsWith(COOKIE + "="));
  return row ? decodeURIComponent(row.split("=").slice(1).join("=")).trim() : "";
}
function accepted(origin) {
  return /^https:\/\/(?:www\.)?tonartstudio\.com\.br$/.test(origin) ||
    /^https:\/\/tonart-studio-public-[a-z0-9-]+\.vercel\.app$/.test(origin);
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  if (!["POST","GET","PATCH"].includes(req.method)) {
    res.setHeader("Allow", "POST, GET, PATCH");
    res.status(405).json({ error: "Método não permitido." }); return;
  }
  const proxySecret = process.env.TONART_QUOTE_PROXY_SECRET || "";
  if (!/^[0-9a-f]{64}$/.test(proxySecret)) {
    res.status(503).json({ error: "O serviço de orçamento não está configurado." }); return;
  }
  const origin = req.headers.origin || "";
  if ((req.method === "POST" || req.method === "PATCH") && !accepted(origin)) {
    res.status(403).json({ error: "Origem não autorizada." }); return;
  }
  const clientIP = req.method === "POST" ? String(req.headers["x-vercel-forwarded-for"] || req.headers["x-forwarded-for"] || "").split(",")[0].trim() : "";
  if (req.method === "POST" && isIP(clientIP) === 0) { res.status(503).json({ error: "Não foi possível verificar a origem da solicitação." }); return; }
  const token = req.method === "POST" ? "" : ownerToken(req);
  if (req.method !== "POST" && !token) {
    res.status(401).json({ error: "Acesso restrito." }); return;
  }
  let body;
  if (req.method !== "GET") {
    body = JSON.stringify(req.body ?? {});
    if (body.length > 16000) { res.status(413).json({ error: "Solicitação muito grande." }); return; }
  }
  const url = new URL(REMOTE);
  if (req.method === "GET") {
    const raw = new URL(req.url || "/", "https://tonart.local");
    for (const key of ["page", "status"]) {
      const val = raw.searchParams.get(key);
      if (val) url.searchParams.set(key, val);
    }
  }
  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "x-tonart-proxy-secret": proxySecret,
        "origin": origin || "https://tonartstudio.com.br",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(req.method === "POST" ? { "x-tonart-client-ip": clientIP } : {}),
      },
      body, signal: AbortSignal.timeout(9000),
    });
    res.status(response.status);
    const payload = await response.text();
    res.end(payload.slice(0, 200000));
  } catch {
    res.status(502).json({ error: "Serviço de orçamento temporariamente indisponível." });
  }
}
