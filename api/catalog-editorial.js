import { createSign } from "node:crypto";
import {
  patchCanonicalEditorialContract,
  EditorialReviewError,
} from "../scripts/catalog/catalog-editorial-contract.mjs";

const REPOSITORY = "tonecosstudio/tonecosstudio";
const BRANCH = "editorial/tonart-admin-review";
const CONTRACT = "services/catalogo/config/catalog-production-model-contract.json";
const GH = "https://api.github.com";
const SUPABASE = "https://icmtmaakjucmuzxnofkd.supabase.co";
const MAX_BODY_BYTES = 16384;

function reject(code, status) {
  throw new EditorialReviewError(code, status);
}

async function requestJson(url, options) {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(12000),
    ...options,
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, data };
}

async function assertSupabaseAdmin(authHeader) {
  const publishable = process.env.TONART_SUPABASE_PUBLISHABLE_KEY;
  if (!publishable || !/^Bearer [A-Za-z0-9._~-]+$/.test(authHeader ?? "")) {
    reject("editorial_unauthorized", 401);
  }
  const headers = { apikey: publishable, Authorization: authHeader };
  const user = await requestJson(SUPABASE + "/auth/v1/user", { headers });
  if (!user.ok || typeof user.data?.id !== "string" ||
      !/^[0-9a-f-]{36}$/.test(user.data.id)) {
    reject("editorial_unauthorized", 401);
  }
  // Use the same has_role RPC as the existing RequireAdmin UI. The client's
  // authentication is rechecked server-side; UI state never authorizes a write.
  const role = await requestJson(SUPABASE + "/rest/v1/rpc/has_role", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ _user_id: user.data.id, _role: "admin" }),
  });
  if (!role.ok || role.data !== true) reject("editorial_admin_required", 403);
  return user.data.id;
}

function appJwt() {
  const id = process.env.TONART_CATALOG_GITHUB_APP_ID;
  const key = process.env.TONART_CATALOG_GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!id || !/^\d+$/.test(id) || !key ||
      !/^\d+$/.test(process.env.TONART_CATALOG_GITHUB_INSTALLATION_ID ?? "")) {
    reject("editorial_backend_not_configured", 503);
  }
  const now = Math.floor(Date.now() / 1000);
  const b64 = (object) => Buffer.from(JSON.stringify(object)).toString("base64url");
  const signed = b64({ alg: "RS256", typ: "JWT" }) + "." +
    b64({ iat: now - 30, exp: now + 480, iss: id });
  const signature = createSign("RSA-SHA256")
    .update(signed).end().sign(key).toString("base64url");
  return signed + "." + signature;
}

async function githubSession() {
  const jwt = appJwt();
  const install = process.env.TONART_CATALOG_GITHUB_INSTALLATION_ID;
  const token = await requestJson(GH + "/app/installations/" + install + "/access_tokens", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + jwt,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repositories: ["tonecosstudio"],
      permissions: { contents: "write", pull_requests: "write" },
    }),
  });
  if (!token.ok || typeof token.data?.token !== "string") {
    reject("editorial_github_authority_unavailable", 503);
  }
  return token.data.token;
}

function githubClient(token) {
  return async function gh(path, { optional404 = false, method = "GET", body } = {}) {
    const response = await requestJson(GH + path, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 404 && optional404) return null;
    if (!response.ok) {
      reject(response.status === 409 || response.status === 422
        ? "editorial_github_conflict" : "editorial_github_unavailable",
      response.status === 409 || response.status === 422 ? 409 : 503);
    }
    return response.data;
  };
}

async function saveForReview(edits) {
  const gh = githubClient(await githubSession());
  const repoPath = "/repos/" + REPOSITORY;
  const main = await gh(repoPath + "/git/ref/heads/main");
  const mainSha = main?.object?.sha;
  if (!/^[0-9a-f]{40}$/.test(mainSha ?? "")) {
    reject("editorial_main_unavailable", 503);
  }
  const existingPrs = await gh(repoPath + "/pulls?state=open&head=" +
    encodeURIComponent("tonecosstudio:" + BRANCH) + "&base=main&per_page=2");
  if (!Array.isArray(existingPrs) || existingPrs.length > 1) {
    reject("editorial_review_state_conflict", 409);
  }
  const priorRef = await gh(repoPath + "/git/ref/heads/" + BRANCH, {
    optional404: true,
  });
  if (existingPrs.length === 1 && !priorRef) {
    reject("editorial_review_state_conflict", 409);
  }
  if (priorRef && existingPrs.length === 0) {
    // Never silently reuse an orphaned or already merged branch.
    reject("editorial_review_branch_needs_reconciliation", 409);
  }
  const readRef = priorRef ? BRANCH : "main";
  const file = await gh(repoPath + "/contents/" + CONTRACT + "?ref=" + encodeURIComponent(readRef));
  if (!/^[0-9a-f]{40}$/.test(file?.sha ?? "") ||
      !Number.isInteger(file?.size) || file.size > 4000000) {
    reject("editorial_contract_unavailable", 503);
  }
  const blob = await gh(repoPath + "/git/blobs/" + file.sha);
  if (blob?.encoding !== "base64" || typeof blob.content !== "string") {
    reject("editorial_contract_unavailable", 503);
  }
  const original = Buffer.from(blob.content.replace(/\s+/g, ""), "base64").toString("utf8");
  const change = patchCanonicalEditorialContract(original, edits);
  if (!priorRef) {
    await gh(repoPath + "/git/refs", {
      method: "POST",
      body: { ref: "refs/heads/" + BRANCH, sha: mainSha },
    });
  }
  await gh(repoPath + "/contents/" + CONTRACT, {
    method: "PUT",
    body: {
      message: "editorial: aplicar revisao autenticada de " + change.ids.length + " modelo(s)",
      branch: BRANCH,
      sha: file.sha,
      content: Buffer.from(change.content, "utf8").toString("base64"),
    },
  });
  let pr = existingPrs[0];
  if (!pr) {
    pr = await gh(repoPath + "/pulls", {
      method: "POST",
      body: {
        title: "editorial(catalog): revisoes autenticadas da TONART",
        head: BRANCH,
        base: "main",
        body: "Alteracoes submetidas pelo painel administrativo autenticado. " +
          "A fonte original foi editada com verificacao de identidade, conflitos e SHA. " +
          "Exige revisao e gates antes da publicacao canônica; nenhum D1/R2 foi alterado.",
      },
    });
  }
  if (!/^https:\/\/github\.com\/tonecosstudio\/tonecosstudio\/pull\/\d+$/.test(pr?.html_url ?? "")) {
    reject("editorial_review_receipt_unavailable", 503);
  }
  return { receipt: pr.html_url, changed: change.ids.length, modelIds: change.ids };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      reject("method_not_allowed", 405);
    }
    const official = process.env.TONECOS_PUBLIC_ORIGIN ?? "https://tonartstudio.com.br";
    // No public/preview writes and no cross-site submissions.
    if (process.env.VERCEL_ENV !== "production" ||
        req.headers.origin !== official ||
        req.headers.host !== new URL(official).host) {
      reject("editorial_origin_forbidden", 403);
    }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? "")) {
      reject("editorial_content_type_invalid", 415);
    }
    const text = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!text || Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
      reject("editorial_request_too_large", 413);
    }
    const body = typeof req.body === "string" ? JSON.parse(text) : req.body;
    if (!body || Array.isArray(body) || Object.keys(body).join() !== "edits" ||
        !Array.isArray(body.edits)) {
      reject("editorial_request_invalid", 422);
    }
    await assertSupabaseAdmin(req.headers.authorization);
    const receipt = await saveForReview(body.edits);
    return res.status(202).json({ state: "awaiting_review", ...receipt });
  } catch (error) {
    const status = error instanceof EditorialReviewError ? error.status : 503;
    const code = error instanceof EditorialReviewError
      ? error.message : "editorial_service_unavailable";
    return res.status(status).json({ error: code });
  }
}
