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

const unsafeAuthenticatedMutationRpcs = [
  "activate_subscription_credit_for_current_user",
];

const misleadingFinancialMutationRpcs = [
  "cancel_subscription_credit_with_refund",
];

const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSql(statement) {
  return statement.replace(/\s+/g, " ").trim();
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

function roleListContainsAuthenticated(statement, keyword) {
  const match = statement.match(new RegExp(`\\b${keyword}\\s+(.+)$`, "i"));
  if (!match) return false;
  return match[1]
    .split(",")
    .map((role) => role.trim().replace(/["']/g, ""))
    .some((role) => role.toLowerCase() === "authenticated");
}

function statementTargetsTable(statement, table) {
  return new RegExp(`\\bON(?: TABLE)? public\\.${escaped(table)}\\b`, "i").test(statement);
}

function privilegeClause(statement, keyword, table) {
  const prefix = new RegExp(`^${keyword}\\s+`, "i");
  return statement
    .replace(prefix, "")
    .split(new RegExp(`\\s+ON(?:\\s+TABLE)?\\s+public\\.${escaped(table)}\\b`, "i"))[0]
    ?.trim();
}

function clauseIncludesInsert(clause) {
  if (!clause) return false;
  if (/^ALL(?: PRIVILEGES)?$/i.test(clause)) return true;
  if (/\bINSERT\s*\(/i.test(clause)) return false;
  return /(?:^|,)\s*INSERT\s*(?:,|$)/i.test(clause);
}

function authenticatedInsertGrantState(table) {
  const tablePattern = escaped(table);
  let granted = false;
  let sourceFile = null;

  for (const file of migrationFiles) {
    const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

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

    for (const rawStatement of source.split(";")) {
      const statement = normalizeSql(rawStatement);
      if (!statement || !statementTargetsTable(statement, table)) continue;

      if (
        /^GRANT\b/i.test(statement) &&
        roleListContainsAuthenticated(statement, "TO") &&
        clauseIncludesInsert(privilegeClause(statement, "GRANT", table))
      ) {
        granted = true;
        sourceFile = file;
      }

      if (
        /^REVOKE\b/i.test(statement) &&
        roleListContainsAuthenticated(statement, "FROM") &&
        clauseIncludesInsert(privilegeClause(statement, "REVOKE", table))
      ) {
        granted = false;
        sourceFile = file;
      }
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

function subscriptionCreditBalanceBindingState() {
  let safe = false;
  let sourceFile = null;

  for (const file of migrationFiles) {
    const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

    const definesImplementation =
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.|private_api\.)create_subscription_credit_individual_order\s*\(/i.test(
        source,
      );

    if (!definesImplementation) continue;

    const hasCreditBalanceLookup =
      /FROM\s+public\.subscription_credit_user_credits/i.test(source) &&
      /WHERE\s+user_id\s*=\s*v_user_id/i.test(source);

    if (!hasCreditBalanceLookup) continue;

    safe = /subscription_id\s*=\s*v_subscription\.id/i.test(source);
    sourceFile = file;
  }

  return { safe, sourceFile };
}

function subscriptionCreditCycleCloseBindingState() {
  let safe = false;
  let sourceFile = null;

  for (const file of migrationFiles) {
    const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

    const definesImplementation =
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.|private_api\.)admin_close_subscription_credit_production_cycle\s*\(/i.test(
        source,
      );

    if (!definesImplementation) continue;

    const hasCreditBalanceLookup =
      /FROM\s+public\.subscription_credit_user_credits/i.test(source) &&
      /WHERE\s+user_id\s*=\s*v_order\.user_id/i.test(source);

    if (!hasCreditBalanceLookup) continue;

    safe = /subscription_id\s*=\s*v_order\.subscription_id/i.test(source);
    sourceFile = file;
  }

  return { safe, sourceFile };
}

const failures = [];

for (const { table, forbiddenPolicies } of criticalTables) {
  const grant = authenticatedInsertGrantState(table);
  if (!grant.granted) continue;

  failures.push(
    `${table}: authenticated still has direct INSERT privilege (last evidence: ${grant.sourceFile})`,
  );

  for (const policy of forbiddenPolicies) {
    const policyResult = policyState(policy);
    if (policyResult.state === "present") {
      failures.push(
        `${table}: direct INSERT privilege is reachable through ${policy} (last policy evidence: ${policyResult.sourceFile})`,
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

for (const functionName of unsafeAuthenticatedMutationRpcs) {
  const result = authenticatedRpcExecuteState(functionName);
  if (result.granted) {
    failures.push(
      `${functionName}: authenticated can still execute a mutation that activates commercial credit state without payment proof (last evidence: ${result.sourceFile})`,
    );
  }
}

for (const functionName of misleadingFinancialMutationRpcs) {
  const result = authenticatedRpcExecuteState(functionName);
  if (result.granted) {
    failures.push(
      `${functionName}: authenticated can still execute a financial mutation advertised as a refund even though the versioned implementation does not perform a refund (last evidence: ${result.sourceFile})`,
    );
  }
}

const creditBalanceBinding = subscriptionCreditBalanceBindingState();
if (!creditBalanceBinding.safe) {
  failures.push(
    `create_subscription_credit_individual_order: credit balance lookup is not bound to the active subscription_id (last implementation evidence: ${creditBalanceBinding.sourceFile ?? "not found"})`,
  );
}

const cycleCloseBinding = subscriptionCreditCycleCloseBindingState();
if (!cycleCloseBinding.safe) {
  failures.push(
    `admin_close_subscription_credit_production_cycle: credit balance lookup is not bound to each order subscription_id (last implementation evidence: ${cycleCloseBinding.sourceFile ?? "not found"})`,
  );
}

if (failures.length > 0) {
  console.error("Commercial authority audit: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error(
    "\nExpected remediation: revoke effective authenticated INSERT on critical commercial tables and route writes through server-authoritative RPCs that derive price/state from canonical records. Remove obsolete amount-authority, unpaid-activation, and fake-refund RPCs even when their frontend callers are gone. Credit debits must bind the selected balance row to the exact active/order subscription, not merely to user_id.",
  );
  process.exit(1);
}

console.log("Commercial authority audit: PASS");
