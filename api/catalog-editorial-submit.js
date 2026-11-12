/**
 * Authenticated editorial submission for the original canonical catalog.
 *
 * Only the original GitHub identity contract is written. The existing
 * Cloudflare publisher later derives D1 from that contract. This endpoint
 * never modifies D1/R2, uploads media, or maintains a second ledger.
 */
import { patchCanonicalEditorialContract, EditorialReviewError } from "../scripts/catalog/catalog-editorial-contract.mjs";

const OWNER = "washingtonmsdj";
const REPO = "catalogo";
const PATH = "config/catalog-production-model-contract.json";
const API = "https://api.github.com";
const SITE_ORIGIN = "https://tonartstudio.com.br";
const MAX_BYTES = 16 * 1024;

function errorResponse(res, status, message) {
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: message }));
}

function validBearer(req) {
  const authorization = req.headers?.authorization;
  const match = typeof authorization === "string"
    ? /^Bearer ([A-Za-z0-9._~+\/-]+={0,2})$/.exec(authorization)
    : null;
  return match?.[1] ?? null;
}

async function checkedResponse(url, options) {
  const response = await fetch(url, { ...options, redirect: "error" });
  return response;
}

async function verifyAdmin(accessToken) {
  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)) {
    throw new EditorialReviewError("editorial_auth_unconfigured", 503);
  }
  const headers = {
    apikey: key,
    authorization: `Bearer ${accessToken}`,
    accept: "application/json",
  };
  const userRes = await checkedResponse(base + "/auth/v1/user", { headers });
  if (!userRes.ok) throw new EditorialReviewError("editorial_not_authenticated", 401);
  const user = await userRes.json();
  if (!/^[a-f0-9-]{36}$/i.test(user?.id ?? "")) {
    throw new EditorialReviewError("editorial_not_authenticated", 401);
  }
  // Supabase's existing has_role RPC is also used by RequireAdmin.
  // Query as the logged-in user; never trust browser-supplied role flags.
  const roleRes = await checkedResponse(base + "/rest/v1/rpc/has_role", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ _user_id: user.id, _role: "admin" }),
  });
  if (!roleRes.ok) throw new EditorialReviewError("editorial_admin_verification_failed", 503);
  if (await roleRes.json() !== true) {
    throw new EditorialReviewError("editorial_forbidden", 403);
  }
  return user.id;
}

async function github(path, options = {}) {
  const token = process.env.TONART_EDITORIAL_GITHUB_TOKEN;
  if (!token) throw new EditorialReviewError("editorial_git_authority_unconfigured", 503);
  const res = await checkedResponse(API + path, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const status = res.status === 409 || res.status === 422 ? 409
      : res.status === 401 || res.status === 403 ? 503 : 502;
    throw new EditorialReviewError(
      status === 409 ? "editorial_git_concurrent_change"
        : status === 503 ? "editorial_git_authority_unavailable"
          : "editorial_git_unavailable", status,
    );
  }
  return res.json();
}

async function storeCanonicalEdits(edits, authorId) {
  const url = `/repos/${OWNER}/${REPO}/contents/${PATH}`;
  // Contents metadata returns a blob SHA even when its 1.3MB file is too
  // large for GitHub's inline contents API response.
  const metadata = await github(url + "?ref=main");
  if (!/^[a-f0-9]{40}$/.test(metadata?.sha ?? "")) {
    throw new EditorialReviewError("editorial_git_invalid_contract_ref", 502);
  }
  const blob = await github(`/repos/${OWNER}/${REPO}/git/blobs/${metadata.sha}`);
  if (blob.encoding !== "base64" || !blob.content || blob.size > 5_000_000) {
    throw new EditorialReviewError("editorial_git_invalid_contract_blob", 502);
  }
  const original = Buffer.from(blob.content.replace(/\s/g, ""), "base64").toString("utf8");
  const patch = patchCanonicalEditorialContract(original, edits);
  const result = await github(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: `docs(catalog): revisão editorial autenticada de ${patch.ids.length} modelos`,
      content: Buffer.from(patch.content, "utf8").toString("base64"),
      sha: metadata.sha, // GitHub rejects concurrent source revisions.
      branch: "main",
      committer: undefined,
    }),
  });
  if (!/^[a-f0-9]{40}$/.test(result?.commit?.sha ?? "")) {
    throw new EditorialReviewError("editorial_git_commit_unverified", 502);
  }
  // Never return the access token, credential, full catalog or sensitive IDs.
  return { commit: result.commit.sha, changed: patch.ids.length };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Allow", "POST");
  if (req.method !== "POST") return errorResponse(res, 405, "method_not_allowed");
  if (req.headers?.origin !== SITE_ORIGIN) {
    return errorResponse(res, 403, "editorial_origin_invalid");
  }
  const contentType = req.headers?.["content-type"] ?? "";
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(contentType)) {
    return errorResponse(res, 415, "editorial_content_type_invalid");
  }
  const token = validBearer(req);
  if (!token) return errorResponse(res, 401, "editorial_not_authenticated");
  const length = Number(req.headers?.["content-length"] ?? 0);
  if (!Number.isSafeInteger(length) || length > MAX_BYTES || length < 0) {
    return errorResponse(res, 413, "editorial_request_too_large");
  }
  const serialized = typeof req.body === "string"
    ? req.body : JSON.stringify(req.body ?? null);
  if (Buffer.byteLength(serialized, "utf8") > MAX_BYTES) {
    return errorResponse(res, 413, "editorial_request_too_large");
  }
  let body;
  try { body = JSON.parse(serialized); } catch {
    return errorResponse(res, 400, "editorial_request_invalid");
  }
  if (!body || Array.isArray(body) || typeof body !== "object" ||
      Object.keys(body).length !== 1 || !Array.isArray(body.edits) ||
      body.edits.length < 1 || body.edits.length > 12) {
    return errorResponse(res, 422, "editorial_request_invalid");
  }
  try {
    const userId = await verifyAdmin(token);
    const saved = await storeCanonicalEdits(body.edits, userId);
    res.statusCode = 202;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      status: "saved_to_canonical_source_pending_publication",
      ...saved,
    }));
  } catch (error) {
    if (error instanceof EditorialReviewError) {
      return errorResponse(res, error.status, error.message);
    }
    // Avoid exposing upstream exceptions, credentials or personal information.
    return errorResponse(res, 502, "editorial_submission_unavailable");
  }
}
