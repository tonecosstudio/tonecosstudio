import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

let publicSelectPolicyPresent = false;
let policyEvidence = null;
let latestGenericUpsertSource = null;
let latestGenericUpsertEvidence = null;

for (const file of migrations) {
  const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

  const policyEvents = [];
  for (const match of source.matchAll(
    /DROP\s+POLICY\s+IF\s+EXISTS\s+["']?system_settings_select_all["']?/gi,
  )) {
    policyEvents.push({ index: match.index ?? 0, present: false });
  }
  for (const match of source.matchAll(
    /CREATE\s+POLICY\s+["']?system_settings_select_all["']?[\s\S]*?ON\s+(?:public\.)?system_settings\s+FOR\s+SELECT[\s\S]*?USING\s*\(\s*true\s*\)/gi,
  )) {
    policyEvents.push({ index: match.index ?? 0, present: true });
  }
  policyEvents.sort((a, b) => a.index - b.index);
  for (const event of policyEvents) {
    publicSelectPolicyPresent = event.present;
    policyEvidence = file;
  }

  if (/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.admin_upsert_system_settings\s*\(/i.test(source)) {
    latestGenericUpsertSource = source;
    latestGenericUpsertEvidence = file;
  }
}

const failures = [];

if (publicSelectPolicyPresent) {
  if (!latestGenericUpsertSource) {
    failures.push(
      "public.system_settings is publicly readable but no canonical admin_upsert_system_settings implementation was found",
    );
  } else {
    const hasSensitiveNameGuard =
      /secret|token|password|private[_ ]?key|service[_ ]?role|credential|api[_ ]?key/i.test(
        latestGenericUpsertSource,
      ) &&
      /RAISE\s+EXCEPTION/i.test(latestGenericUpsertSource);

    if (!hasSensitiveNameGuard) {
      failures.push(
        `public.system_settings remains publicly readable (last policy evidence: ${policyEvidence}) while the latest generic admin upsert (${latestGenericUpsertEvidence}) does not reject secret-like setting names`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Public system settings authority audit: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "\nExpected remediation: either split public/private settings or make public reads key-scoped. While public.system_settings remains readable, the generic admin upsert must reject secret/token/password/private-key/service-role/credential/API-key style names server-side.",
  );
  process.exit(1);
}

console.log("Public system settings authority audit: PASS");
