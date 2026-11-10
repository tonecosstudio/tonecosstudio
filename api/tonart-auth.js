/** Private TONART owner session: Supabase Auth via same-origin, HttpOnly cookie. */
const SUPABASE = "https://icmtmaakjucmuzxnofkd.supabase.co";
const OWNER_EMAIL = "tonecosstudio@gmail.com";
const COOKIE = "tonart_quote_owner";
const originOK = (origin) => /^https:\/\/(?:www\.)?tonartstudio\.com\.br$/.test(origin) ||
  /^https:\/\/tonart-studio-public-[a-z0-9-]+\.vercel\.app$/.test(origin);
const key = () => process.env.TONART_SUPABASE_PUBLISHABLE_KEY || "";
const headers = (bearer) => ({
  apikey: key(), "Content-Type": "application/json",
  ...(bearer ? { Authorization: "Bearer " + bearer } : {}),
});
function answer(res, status, data) {
  res.setHeader("Cache-Control", "no-store"); res.setHeader("Content-Type", "application/json");
  res.status(status).json(data);
}
function cookie(req) {
  const row = (req.headers.cookie || "").split(";").find(s => s.trim().startsWith(COOKIE + "="));
  return row ? decodeURIComponent(row.split("=").slice(1).join("=")).trim() : "";
}
async function identify(token) {
  if (!key() || !token || !/^[A-Za-z0-9._~-]+$/.test(token)) return false;
  try {
    const response = await fetch(SUPABASE + "/auth/v1/user", {
      headers: headers(token), signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const user = await response.json();
    return typeof user.email === "string" &&
      user.email.toLowerCase() === OWNER_EMAIL && Boolean(user.email_confirmed_at);
  } catch { return false; }
}
function setSession(res, token) {
  res.setHeader("Set-Cookie", COOKIE + "=" + encodeURIComponent(token) +
    "; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=3300");
}
function clearSession(res) {
  res.setHeader("Set-Cookie", COOKIE + "=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0");
}
export default async function handler(req, res) {
  if (!key()) return answer(res, 503, { error: "A autenticação do painel ainda não foi configurada." });
  if (req.method === "GET") return answer(res, 200, { authenticated: await identify(cookie(req)) });
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return answer(res, 405, { error: "Método não permitido." }); }
  const origin = req.headers.origin || "";
  if (!originOK(origin)) return answer(res, 403, { error: "Origem não autorizada." });
  const body = req.body || {};
  if (body.action === "logout") { clearSession(res); return answer(res, 200, { authenticated: false }); }
  if (body.action === "session") {
    const token = typeof body.accessToken === "string" && body.accessToken.length < 3000 ? body.accessToken : "";
    if (!await identify(token)) return answer(res, 401, { error: "Conta não autorizada." });
    setSession(res, token);
    return answer(res, 200, { authenticated: true });
  }
  if (body.action === "request") {
    // Only the approved business mailbox receives a login link.
    const response = await fetch(SUPABASE + "/auth/v1/otp", {
      method: "POST", headers: headers(), signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        email: OWNER_EMAIL, create_user: true,
        gotrue_meta_security: {},
      }),
    }).catch(() => null);
    return response?.ok
      ? answer(res, 200, { sent: true })
      : answer(res, 503, { error: "Não foi possível enviar o acesso. Verifique a configuração do e-mail no Supabase." });
  }
  if (body.action === "verify") {
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const tokenHash = typeof body.tokenHash === "string" ? body.tokenHash.trim() : "";
    if (!/^\d{6,8}$/.test(token) && !/^[A-Za-z0-9_-]{12,256}$/.test(tokenHash))
      return answer(res, 400, { error: "Código de acesso inválido." });
    const response = await fetch(SUPABASE + "/auth/v1/verify", {
      method: "POST", headers: headers(), signal: AbortSignal.timeout(8000),
      body: JSON.stringify(tokenHash
        ? { token_hash: tokenHash, type: "magiclink" }
        : { email: OWNER_EMAIL, token, type: "email" }),
    }).catch(() => null);
    if (!response?.ok) return answer(res, 401, { error: "Código expirado ou inválido." });
    const session = await response.json();
    if (!await identify(session.access_token)) return answer(res, 401, { error: "Conta não autorizada." });
    setSession(res, session.access_token);
    return answer(res, 200, { authenticated: true });
  }
  return answer(res, 400, { error: "Operação inválida." });
}
