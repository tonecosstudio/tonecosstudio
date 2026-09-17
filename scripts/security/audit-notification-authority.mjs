import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));
const PAYMENT_PROOF_EDGE_PATH = path.join(
  ROOT,
  "supabase",
  "functions",
  "upload-payment-proof",
  "index.ts",
);
const PAYMENT_FILE_CLIENT_PATH = path.join(
  ROOT,
  "src",
  "services",
  "payments",
  "payment-file-upload-service.ts",
);
const paymentProofEdgeSource = readFileSync(PAYMENT_PROOF_EDGE_PATH, "utf8");
const paymentFileClientSource = readFileSync(PAYMENT_FILE_CLIENT_PATH, "utf8");

const allowedReadMutationColumns = new Set(["is_read", "read_at", "updated_at"]);

function normalizeSql(statement) {
  return statement.replace(/\s+/g, " ").trim();
}

function roleListContainsAuthenticated(statement, keyword) {
  const match = statement.match(new RegExp(`\\b${keyword}\\s+(.+)$`, "i"));
  if (!match) return false;
  return match[1]
    .split(",")
    .map((role) => role.trim().replace(/["']/g, ""))
    .some((role) => role.toLowerCase() === "authenticated");
}

function clauseIncludesPrivilege(clause, privilege) {
  if (!clause) return false;
  if (/^ALL(?: PRIVILEGES)?$/i.test(clause)) return true;
  if (new RegExp(`\\b${privilege}\\s*\\(`, "i").test(clause)) return false;
  return new RegExp(`(?:^|,)\\s*${privilege}\\s*(?:,|$)`, "i").test(clause);
}

function parseMutationState(table) {
  let tableUpdateGranted = false;
  let updateEvidence = null;
  let tableDeleteGranted = false;
  let deleteEvidence = null;
  let columnGrant = null;
  let columnEvidence = null;

  for (const file of migrations) {
    const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

    if (
      /authenticated_dml_tables\s+text\[\]/i.test(source) &&
      new RegExp(`["']${table}["']`, "i").test(source) &&
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+TABLE\s+public\.%I\s+TO\s+authenticated/i.test(source)
    ) {
      tableUpdateGranted = true;
      updateEvidence = file;
      tableDeleteGranted = true;
      deleteEvidence = file;
    }

    for (const rawStatement of source.split(";")) {
      const statement = normalizeSql(rawStatement);
      if (!statement) continue;

      const target = new RegExp(`\\bON(?: TABLE)? public\\.${table}\\b`, "i");
      if (!target.test(statement)) continue;

      if (/^GRANT\b/i.test(statement) && roleListContainsAuthenticated(statement, "TO")) {
        const columnMatch = statement.match(/^GRANT\s+UPDATE\s*\(([^)]*)\)/i);
        if (columnMatch) {
          columnGrant = columnMatch[1]
            .split(",")
            .map((column) => column.trim().replace(/["']/g, "").toLowerCase())
            .filter(Boolean);
          columnEvidence = file;
          continue;
        }

        const clause = statement
          .replace(/^GRANT\s+/i, "")
          .split(new RegExp(`\\s+ON(?:\\s+TABLE)?\\s+public\\.${table}\\b`, "i"))[0]
          ?.trim();

        if (clauseIncludesPrivilege(clause, "UPDATE")) {
          tableUpdateGranted = true;
          updateEvidence = file;
        }
        if (clauseIncludesPrivilege(clause, "DELETE")) {
          tableDeleteGranted = true;
          deleteEvidence = file;
        }
      }

      if (/^REVOKE\b/i.test(statement) && roleListContainsAuthenticated(statement, "FROM")) {
        const clause = statement
          .replace(/^REVOKE\s+/i, "")
          .split(new RegExp(`\\s+ON(?:\\s+TABLE)?\\s+public\\.${table}\\b`, "i"))[0]
          ?.trim();

        if (clauseIncludesPrivilege(clause, "UPDATE")) {
          tableUpdateGranted = false;
          updateEvidence = file;
        }
        if (clauseIncludesPrivilege(clause, "DELETE")) {
          tableDeleteGranted = false;
          deleteEvidence = file;
        }
      }
    }
  }

  return {
    tableUpdateGranted,
    updateEvidence,
    tableDeleteGranted,
    deleteEvidence,
    columnGrant,
    columnEvidence,
  };
}

function latestFunctionSecurityMode(functionName) {
  let mode = null;
  let evidence = null;
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  for (const file of migrations) {
    const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const regex = new RegExp(
      `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+(?:public\\.)?${escapedName}\\s*\\([^)]*\\)[\\s\\S]*?(SECURITY\\s+(?:INVOKER|DEFINER))`,
      "gi",
    );

    for (const match of source.matchAll(regex)) {
      mode = match[1].replace(/\s+/g, " ").toUpperCase();
      evidence = file;
    }
  }

  return { mode, evidence };
}

function latestCreateAdminNotificationPolicy() {
  let allowsCustomerPaymentNotification = false;
  let evidence = null;

  for (const file of migrations) {
    const source = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

    if (/DROP\s+FUNCTION(?:\s+IF\s+EXISTS)?\s+(?:public\.)?create_admin_notification\s*\(/i.test(source)) {
      allowsCustomerPaymentNotification = false;
      evidence = file;
    }

    if (/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?create_admin_notification\s*\(/i.test(source)) {
      allowsCustomerPaymentNotification =
        /payment_created/i.test(source) &&
        /payment_under_review/i.test(source) &&
        /manual_payments/i.test(source) &&
        /mp\.user_id\s*=\s*auth\.uid\(\)/i.test(source);
      evidence = file;
    }
  }

  return { allowsCustomerPaymentNotification, evidence };
}

function validateColumnGrant(table, state, failures) {
  if (!state.columnGrant) {
    failures.push(
      `${table}: no authenticated column-level UPDATE grant was found for read-state mutation`,
    );
    return;
  }

  const forbidden = state.columnGrant.filter((column) => !allowedReadMutationColumns.has(column));
  if (forbidden.length > 0) {
    failures.push(
      `${table}: column UPDATE grant includes non-read fields (${forbidden.join(", ")}) in ${state.columnEvidence}`,
    );
  }

  if (!state.columnGrant.includes("is_read")) {
    failures.push(`${table}: read-state column grant does not include is_read`);
  }
}

const failures = [];

const userNotifications = parseMutationState("user_notifications");
if (userNotifications.tableUpdateGranted) {
  failures.push(
    `user_notifications: authenticated still has table-level UPDATE (last evidence: ${userNotifications.updateEvidence})`,
  );
}
validateColumnGrant("user_notifications", userNotifications, failures);

const adminNotifications = parseMutationState("admin_notifications");
if (adminNotifications.tableUpdateGranted) {
  failures.push(
    `admin_notifications: authenticated has table-level UPDATE; notification read mutation must be column-scoped (last evidence: ${adminNotifications.updateEvidence})`,
  );
}

const markOneMode = latestFunctionSecurityMode("mark_notification_read");
const markAllMode = latestFunctionSecurityMode("mark_all_notifications_read");
const deleteMode = latestFunctionSecurityMode("admin_delete_notification");
const adminCreationPolicy = latestCreateAdminNotificationPolicy();

if (markOneMode.mode === "SECURITY INVOKER" || markAllMode.mode === "SECURITY INVOKER") {
  validateColumnGrant("admin_notifications", adminNotifications, failures);
}

if (!markOneMode.mode || !markAllMode.mode) {
  failures.push("admin notification read RPC security mode could not be determined from migrations");
}

if (deleteMode.mode === "SECURITY INVOKER" && !adminNotifications.tableDeleteGranted) {
  failures.push(
    `admin_delete_notification: latest function is SECURITY INVOKER (${deleteMode.evidence}) but authenticated has no DELETE privilege on admin_notifications (${adminNotifications.deleteEvidence ?? "no grant evidence"})`,
  );
}

if (!deleteMode.mode) {
  failures.push("admin_delete_notification security mode could not be determined from migrations");
}

if (adminCreationPolicy.allowsCustomerPaymentNotification) {
  failures.push(
    `create_admin_notification: generic admin-notification RPC still contains a customer-owned manual-payment exception (${adminCreationPolicy.evidence}); validated payment events must create admin alerts server-side instead`,
  );
}

const edgeOwnsFirstProofNotification =
  /if\s*\(\s*uploadResult\.firstFile(?:\s*===\s*true)?\s*\)/.test(paymentProofEdgeSource) &&
  /notifyAdminsPaymentUnderReview\s*\(/.test(paymentProofEdgeSource) &&
  /service\.rpc\(\s*["']create_admin_notification["']/.test(paymentProofEdgeSource) &&
  /p_type:\s*["']payment_under_review["']/.test(paymentProofEdgeSource);

if (!edgeOwnsFirstProofNotification) {
  failures.push(
    "upload-payment-proof: first-proof admin notification is not owned by the validated Edge Function",
  );
}

if (
  /getNotificationService|sendPaymentUnderReview|create_admin_notification/.test(
    paymentFileClientSource,
  )
) {
  failures.push(
    "payment-file-upload-service: browser still contains admin-notification authority after proof upload",
  );
}

if (failures.length > 0) {
  console.error("Notification authority audit: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "\nExpected remediation: revoke table-level UPDATE from authenticated. For read state, grant only is_read/read_at/updated_at or use a narrowly authorized RPC. Admin deletion must stay behind an admin-asserting boundary. Generic admin-notification creation must not be customer-executable; trusted Edge/RPC payment events should create those alerts after ownership and state validation. Payment-proof review alerts must remain server-owned and must not be recreated in the browser.",
  );
  process.exit(1);
}

console.log("Notification authority audit: PASS");
