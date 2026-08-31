import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

const criticalTables = [
  {
    table: "quotes",
    forbiddenPolicies: ["quotes_insert_own"],
  },
  {
    table: "standalone_purchases",
    forbiddenPolicies: ["standalone_purchases_insert_own"],
  },
  {
    table: "subscriptions",
    forbiddenPolicies: [
      "subscriptions_insert_own",
      "subscriptions_insert_own_pending_checkout",
    ],
  },
];

const clientAmountRpcs = [
  "create_manual_payment_for_current_user",
  "notify_quote_payment_for_current_user",
];

const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function policyState(policyName) {
  const name = escaped(policyName);
  let state = "absent";
  let sourceFile = null;

  for (const file of migrationFiles) {
    const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const events = [];

    for (const match of source.matchAll(
      new RegExp(`DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+["']?${name}["']?`, "gi"),
    )) {
      events.push({ index: match.index ?? 0, state: "absent" });
    }

    for (const match of source.matchAll(
      new RegExp(`CREATE\\s+POLICY\\s+["']?${name}["']?`, "gi"),
    )) {
      events.push({ index: match.index ?? 0, state: "present" });
    }

    events.sort((a, b) => a.index - b.index);
    for (const event of events) {
      state = event.state;
      sourceFile = file;
    }
  }

  return { state, sourceFile };
}

function authenticatedInsertGrantState(table) {
  const tablePattern = escaped(table);
  let granted = false;
  let sourceFile = null;

  for (const file of migrationFiles) {
    const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

    // Historical grant migration dynamically grants full DML to every table
    // listed in authenticated_dml_tables. Treat membership in that list as a
    // real INSERT grant because PostgREST privileges are separate from RLS.
    if (
      /authenticated_dml_tables\s+text\[\]/i.test(source) &&
      new RegExp(`["']${tablePattern}["']`, "i").test(source) &&
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+TABLE\s+public\.%I\s+TO\s+authenticated/i.test(
        source,
      )
    ) {
      granted = true;
      sourceFile = file;
    }

    const explicitGrant = new RegExp(
      `GRANT\\s+(?:ALL(?:\\s+PRIVILEGES)?|[^;]*\\bINSERT\\b[^;]*)\\s+ON(?:\\s+TABLE)?\\s+public\\.${tablePattern}\\s+TO\\s+authenticated`,
      "i",
    );
    if (explicitGrant.test(source)) {
      granted = true;
      sourceFile = file;
    }

    const explicitRevoke = new RegExp(
      `REVOKE\\s+(?:ALL(?:\\s+PRIVILEGES)?|[^;]*\\bINSERT\\b[^;]*)\\s+ON(?:\\s+TABLE)?\\s+public\\.${tablePattern}\\s+FROM\\s+authenticated`,
      "i",
    );
    if (explicitRevoke.test(source)) {
      granted = false;
      sourceFile = file;
    }
  }

  return { granted, sourceFile };
}

function authenticatedRpcExecuteState(functionName) {
  const fn = escaped(functionName);
  let granted = false;
  let sourceFile = null;

  for (const file of migrationFiles) {
    const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const events = [];

    for (const match of source.matchAll(
      new RegExp(
        `GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+(?:public\\.)?${fn}\\s*\\([^;]*?\\)\\s+TO\\s+[^;]*\\bauthenticated\\b`,
        "gi",
      ),
    )) {
      events.push({ index: match.index ?? 0, granted: true });
    }

    for (const match of source.matchAll(
      new RegExp(
        `REVOKE\\s+(?:ALL|EXECUTE)\\s+ON\\s+FUNCTION\\s+(?:public\\.)?${fn}\\s*\\([^;]*?\\)\\s+FROM\\s+[^;]*\\bauthenticated\\b`,
        "gi",
      ),
    )) {
      events.push({ index: match.index ?? 0, granted: false });
    }

    for (const match of source.matchAll(
      new RegExp(`DROP\\s+FUNCTION(?:\\s+IF\\s+EXISTS)?\\s+(?:public\\.)?${fn}\\s*\\(`, "gi"),
    )) {
      events.push({ index: match.index ?? 0, granted: false });
    }

    events.sort((a, b) => a.index - b.index);
    for (const event of events) {
      granted = event.granted;
      sourceFile = file;
    }
  }

  return { granted, sourceFile };
}

const failures = [];

for (const { table, forbiddenPolicies } of criticalTables) {
  const grant = authenticatedInsertGrantState(table);
  if (grant.granted) {
    failures.push(
      `${table}: authenticated still has direct INSERT privilege (last evidence: ${grant.sourceFile})`,
    );
  }

  for (const policy of forbiddenPolicies) {
    const policyResult = policyState(policy);
    if (policyResult.state === "present") {
      failures.push(
        `${table}: forbidden direct-client INSERT policy ${policy} is still effective (last evidence: ${policyResult.sourceFile})`,
      );
    }
  }
}

for (const functionName of clientAmountRpcs) {
  const result = authenticatedRpcExecuteState(functionName);
  if (result.granted) {
    failures.push(
      `${functionName}: authenticated can still execute a legacy RPC that accepts client-supplied amount (last evidence: ${result.sourceFile})`,
    );
  }
}

if (failures.length > 0) {
  console.error("Commercial authority audit: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error(
    "\nExpected remediation: revoke direct authenticated INSERT on critical commercial tables, drop direct-client INSERT policies, and route writes through server-authoritative RPCs that derive price/state from canonical records.",
  );
  process.exit(1);
}

console.log("Commercial authority audit: PASS");
