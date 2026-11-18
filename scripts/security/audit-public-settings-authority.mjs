import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

let publicSelectPolicyPresent = false;
let latestPublicAllowlistExpression = null;
let latestPublicAllowlistEvidence = null;
let policyEvidence = null;
let latestGenericUpsertBody = null;
let latestGenericUpsertEvidence = null;
let latestSensitiveValidatorBody = null;
let latestSensitiveValidatorEvidence = null;

for (const file of migrations) {
  const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

  // Track the latest effective public key-scoped policy across versioned
  // migrations. A frontend-only allowlist cannot protect the Data API.
  for (const match of source.matchAll(
    /(?:CREATE|ALTER)\s+POLICY\s+["']?tonart_system_settings_public_allowlist["']?\s+ON\s+(?:public\.)?system_settings[\s\S]*?\bUSING\s*\(([\s\S]*?)\)\s*;/gi,
  )) {
    latestPublicAllowlistExpression = match[1];
    latestPublicAllowlistEvidence = file;
  }

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

  const validatorDefinition = source.match(
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+private_api\.validate_critical_system_setting\s*\([^)]*\)[\s\S]*?AS\s+\$\$([\s\S]*?)\$\$\s*;/i,
  );
  if (validatorDefinition) {
    latestSensitiveValidatorBody = validatorDefinition[1];
    latestSensitiveValidatorEvidence = file;
  }

  const upsertDefinition = source.match(
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.admin_upsert_system_settings\s*\([^)]*\)[\s\S]*?AS\s+\$\$([\s\S]*?)\$\$\s*;/i,
  );
  if (upsertDefinition) {
    latestGenericUpsertBody = upsertDefinition[1];
    latestGenericUpsertEvidence = file;
  }
}

function bodyRejectsSensitiveSettingNames(body) {
  if (!body) return false;
  const referencesSensitiveNames =
    /secret|token|password|private[_ ]?key|service[_ ]?role|credential|api[_ ]?key/i.test(body);
  return (
    referencesSensitiveNames &&
    /RAISE\s+EXCEPTION/i.test(body) &&
    /v_key|p_key|key/i.test(body)
  );
}

const failures = [];

if (!latestPublicAllowlistExpression) {
  failures.push("No versioned key-scoped public.system_settings SELECT policy was found");
} else {
  const expression = latestPublicAllowlistExpression.trim();
  const keyScoped = /^key\s*=\s*ANY\s*\(\s*ARRAY\s*\[[\s\S]*\]\s*::text\[\]\s*\)$/i.test(expression);
  const allowedKeys = [...expression.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const requiredPublicKeys = ["company_name", "contact_email", "privacy_email"];
  const disallowedPaymentKeys = allowedKeys.filter((key) =>
    key.startsWith("pix_key_") || key.startsWith("payment_link_"),
  );
  if (!keyScoped || requiredPublicKeys.some((key) => !allowedKeys.includes(key))) {
    failures.push(
      `Public settings policy must remain an explicit presentation-only allowlist (latest: ${latestPublicAllowlistEvidence})`,
    );
  }
  if (disallowedPaymentKeys.length) {
    failures.push(
      `Public settings policy exposes payment destinations (${disallowedPaymentKeys.join(", ")}; latest: ${latestPublicAllowlistEvidence})`,
    );
  }
}

if (publicSelectPolicyPresent) {
  if (!latestGenericUpsertBody) {
    failures.push(
      "public.system_settings is publicly readable but no canonical admin_upsert_system_settings implementation was found",
    );
  } else {
    const rejectsDirectly = bodyRejectsSensitiveSettingNames(latestGenericUpsertBody);
    const delegatesToCanonicalValidator =
      /private_api\.validate_critical_system_setting\s*\(\s*v_key\s*,\s*v_value\s*\)/i.test(
        latestGenericUpsertBody,
      );
    const delegatedValidatorRejects =
      delegatesToCanonicalValidator &&
      bodyRejectsSensitiveSettingNames(latestSensitiveValidatorBody);

    if (!rejectsDirectly && !delegatedValidatorRejects) {
      const validatorEvidence = delegatesToCanonicalValidator
        ? latestSensitiveValidatorEvidence ?? "not found"
        : "not delegated";
      failures.push(
        `public.system_settings remains publicly readable (last policy evidence: ${policyEvidence}) while the latest generic admin upsert (${latestGenericUpsertEvidence}) does not reject secret-like setting names directly or through the canonical validator (${validatorEvidence})`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Public system settings authority audit: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "\nExpected remediation: either split public/private settings or make public reads key-scoped. While public.system_settings remains readable, the generic admin upsert must reject secret/token/password/private-key/service-role/credential/API-key style names server-side, either directly or through its canonical private validator.",
  );
  process.exit(1);
}

console.log("Public system settings authority audit: PASS");
