import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

let tableUpdateGranted = false;
let lastEvidence = null;
let editableColumnGrantFound = false;
let roleTriggerFound = false;

for (const file of migrations) {
  const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

  if (
    /authenticated_dml_tables\s+text\[\]/i.test(source) &&
    /["']profiles["']/i.test(source) &&
    /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+TABLE\s+public\.%I\s+TO\s+authenticated/i.test(
      source,
    )
  ) {
    tableUpdateGranted = true;
    lastEvidence = file;
  }

  if (
    /GRANT\s+(?:ALL(?:\s+PRIVILEGES)?|[^;]*\bUPDATE\b[^;]*)\s+ON(?:\s+TABLE)?\s+public\.profiles\s+TO\s+authenticated/i.test(
      source,
    )
  ) {
    tableUpdateGranted = true;
    lastEvidence = file;
  }

  if (
    /REVOKE\s+(?:ALL(?:\s+PRIVILEGES)?|[^;]*\bUPDATE\b[^;]*)\s+ON(?:\s+TABLE)?\s+public\.profiles\s+FROM\s+authenticated/i.test(
      source,
    )
  ) {
    tableUpdateGranted = false;
    lastEvidence = file;
  }

  if (/GRANT\s+UPDATE\s*\([^)]*\)\s+ON\s+public\.profiles\s+TO\s+authenticated/is.test(source)) {
    editableColumnGrantFound = true;
  }

  if (
    /CREATE\s+TRIGGER\s+prevent_unsafe_profile_role_change[\s\S]*?BEFORE\s+UPDATE\s+OF\s+role\s+ON\s+public\.profiles/i.test(
      source,
    )
  ) {
    roleTriggerFound = true;
  }
}

const failures = [];

if (tableUpdateGranted) {
  failures.push(
    `authenticated still has table-level UPDATE on public.profiles (last evidence: ${lastEvidence})`,
  );
}

if (!editableColumnGrantFound) {
  failures.push("no authenticated column-level UPDATE grant for editable profile fields was found");
}

if (!roleTriggerFound) {
  failures.push("profile role-protection trigger is not present in migration history");
}

if (failures.length > 0) {
  console.error("Profile authority audit: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "\nExpected remediation: explicitly revoke table-level UPDATE on public.profiles from authenticated, then grant UPDATE only on approved self-service columns. Keep role/stat/financial fields outside browser column grants and preserve the role-change trigger.",
  );
  process.exit(1);
}

console.log("Profile authority audit: PASS");
