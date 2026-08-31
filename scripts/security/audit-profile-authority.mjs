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

function normalizeSql(statement) {
  return statement.replace(/\s+/g, " ").trim();
}

function isProfilesAuthenticatedGrant(statement) {
  return /\bON(?: TABLE)? public\.profiles TO authenticated\b/i.test(statement);
}

function isProfilesAuthenticatedRevoke(statement) {
  return /\bON(?: TABLE)? public\.profiles FROM authenticated\b/i.test(statement);
}

function grantsTableUpdate(statement) {
  if (!/^GRANT\b/i.test(statement) || !isProfilesAuthenticatedGrant(statement)) {
    return false;
  }

  const privilegeClause = statement
    .replace(/^GRANT\s+/i, "")
    .split(/\s+ON(?:\s+TABLE)?\s+public\.profiles\s+TO\s+authenticated/i)[0]
    ?.trim();

  if (!privilegeClause) return false;

  if (/^ALL(?: PRIVILEGES)?$/i.test(privilegeClause)) return true;

  // Column-level UPDATE, e.g. `GRANT UPDATE (full_name, phone) ...`, does not
  // restore the table-level UPDATE privilege revoked by the canonical RPC migration.
  if (/\bUPDATE\s*\(/i.test(privilegeClause)) return false;

  return /(?:^|,)\s*UPDATE\s*(?:,|$)/i.test(privilegeClause);
}

function revokesTableUpdate(statement) {
  if (!/^REVOKE\b/i.test(statement) || !isProfilesAuthenticatedRevoke(statement)) {
    return false;
  }

  const privilegeClause = statement
    .replace(/^REVOKE\s+/i, "")
    .split(/\s+ON(?:\s+TABLE)?\s+public\.profiles\s+FROM\s+authenticated/i)[0]
    ?.trim();

  if (!privilegeClause) return false;
  if (/^ALL(?: PRIVILEGES)?$/i.test(privilegeClause)) return true;
  if (/\bUPDATE\s*\(/i.test(privilegeClause)) return false;
  return /(?:^|,)\s*UPDATE\s*(?:,|$)/i.test(privilegeClause);
}

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

  for (const rawStatement of source.split(";")) {
    const statement = normalizeSql(rawStatement);
    if (!statement) continue;

    if (grantsTableUpdate(statement)) {
      tableUpdateGranted = true;
      lastEvidence = file;
    }

    if (revokesTableUpdate(statement)) {
      tableUpdateGranted = false;
      lastEvidence = file;
    }

    if (
      /^GRANT\s+UPDATE\s*\([^)]*\)\s+ON(?:\s+TABLE)?\s+public\.profiles\s+TO\s+authenticated$/i.test(
        statement,
      )
    ) {
      editableColumnGrantFound = true;
    }
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
