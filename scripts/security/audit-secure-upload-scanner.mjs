import { readFileSync } from "node:fs";
import path from "node:path";

const sourcePath = path.join(
  process.cwd(),
  "supabase",
  "functions",
  "_shared",
  "secure-upload.ts",
);
const source = readFileSync(sourcePath, "utf8");

const checks = [
  {
    label: "scanner URL comes from server-side MALWARE_SCANNER_URL",
    pattern: /Deno\.env\.get\(["']MALWARE_SCANNER_URL["']\)/,
  },
  {
    label: "missing scanner configuration fails closed",
    pattern: /if\s*\(\s*!configuredUrl\s*\)[\s\S]*?SCANNER_NOT_CONFIGURED/,
  },
  {
    label: "malformed scanner URL fails closed",
    pattern: /new\s+URL\(configuredUrl\)[\s\S]*?catch[\s\S]*?SCANNER_NOT_CONFIGURED/,
  },
  {
    label: "HTTPS is required unless an explicit server-side override is enabled",
    pattern: /scannerUrl\.protocol\s*!==\s*["']https:["'][\s\S]*?ALLOW_INSECURE_MALWARE_SCANNER[\s\S]*?SCANNER_INSECURE_TRANSPORT/,
  },
  {
    label: "scanner request has a bounded timeout",
    pattern: /AbortSignal\.timeout\(SCAN_TIMEOUT_MS\)/,
  },
  {
    label: "network failures block the upload",
    pattern: /catch\s*\{[\s\S]*?SCAN_FAILED/,
  },
  {
    label: "non-success HTTP responses block the upload",
    pattern: /if\s*\(\s*!response\.ok\s*\)[\s\S]*?SCAN_FAILED/,
  },
  {
    label: "invalid JSON responses block the upload",
    pattern: /response\.json\(\)[\s\S]*?catch[\s\S]*?Invalid security scanner response[\s\S]*?SCAN_FAILED/,
  },
  {
    label: "ambiguous scanner responses block the upload",
    pattern: /if\s*\(\s*!clean\s*&&\s*!explicitlyUnsafe\s*\)[\s\S]*?Ambiguous security scanner response[\s\S]*?SCAN_FAILED/,
  },
  {
    label: "unsafe scans return a non-empty threat marker",
    pattern: /threats\.length\s*>\s*0\s*\?\s*threats\s*:\s*\[["']malware_detected["']\]/,
  },
];

const failures = checks
  .filter(({ pattern }) => !pattern.test(source))
  .map(({ label }) => label);

const timeoutMatch = source.match(/const\s+SCAN_TIMEOUT_MS\s*=\s*([\d_]+)/);
if (!timeoutMatch) {
  failures.push("scanner timeout constant is missing");
} else {
  const timeoutMs = Number(timeoutMatch[1].replaceAll("_", ""));
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30_000) {
    failures.push(`scanner timeout must be between 1 and 30000 ms (found ${timeoutMs})`);
  }
}

if (/if\s*\(\s*!configuredUrl\s*\)\s*\{?\s*return\b/i.test(source)) {
  failures.push("missing scanner configuration must never return a clean/success result");
}

if (failures.length > 0) {
  console.error("Secure upload scanner audit: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "\nExpected contract: sensitive uploads are accepted only after an explicit, successful and unambiguous server-side malware scan. Scanner absence/failure must remain fail-closed.",
  );
  process.exit(1);
}

console.log("Secure upload scanner audit: PASS");
