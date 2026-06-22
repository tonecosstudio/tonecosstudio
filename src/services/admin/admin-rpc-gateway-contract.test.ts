import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const SRC_ROOT = path.join(REPO_ROOT, "src");
const ADMIN_RPC_FUNCTION_PATH = path.join(
  REPO_ROOT,
  "supabase",
  "functions",
  "admin-rpc",
  "index.ts",
);

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(absolutePath);
    }

    return [absolutePath];
  });
}

function getAdminRpcAllowlist(): Set<string> {
  const source = fs.readFileSync(ADMIN_RPC_FUNCTION_PATH, "utf8");
  const allowlistMatch = source.match(
    /const ADMIN_RPC_ALLOWLIST = new Set\(\[(?<body>[\s\S]*?)\]\);/,
  );

  if (!allowlistMatch?.groups?.body) {
    throw new Error("Could not locate ADMIN_RPC_ALLOWLIST");
  }

  return new Set(
    [...allowlistMatch.groups.body.matchAll(/"([a-z0-9_]+)"/g)].map(
      (match) => match[1],
    ),
  );
}

function getAdminRpcCalls(): Map<string, string[]> {
  const files = walkFiles(SRC_ROOT).filter((filePath) => {
    const normalizedPath = filePath.replace(/\\/g, "/");

    return (
      /\.(ts|tsx)$/.test(normalizedPath) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(normalizedPath)
    );
  });

  const usages = new Map<string, string[]>();

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, "utf8");

    for (const match of source.matchAll(/callAdminRpc\(\s*["']([a-z0-9_]+)["']/g)) {
      const functionName = match[1];
      const existing = usages.get(functionName) ?? [];

      existing.push(path.relative(REPO_ROOT, filePath).replace(/\\/g, "/"));
      usages.set(functionName, existing);
    }
  }

  return usages;
}

describe("admin-rpc allowlist contract", () => {
  it("covers every frontend admin RPC call", () => {
    const allowlist = getAdminRpcAllowlist();
    const usages = getAdminRpcCalls();

    const missing = [...usages.entries()]
      .filter(([functionName]) => !allowlist.has(functionName))
      .map(([functionName, files]) => ({
        functionName,
        files,
      }));

    expect(missing).toEqual([]);
  });
});
