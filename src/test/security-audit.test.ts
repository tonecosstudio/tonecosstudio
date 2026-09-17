import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fileUploadService } from "@/services/payments/payment-file-upload-service";

const ROOT = process.cwd();

function source(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");
}

describe("manual payment security invariants", () => {
  describe("payment proof validation", () => {
    it("rejects unsupported MIME types and extensions", async () => {
      const file = new File(["payload"], "payload.exe", {
        type: "application/x-msdownload",
      });

      const result = await fileUploadService.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects MIME/extension mismatch", async () => {
      const file = new File(["payload"], "proof.pdf", { type: "image/jpeg" });

      const result = await fileUploadService.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes("mismatch"))).toBe(true);
    });

    it("rejects empty and oversized files", async () => {
      const empty = new File([], "empty.jpg", { type: "image/jpeg" });
      const oversized = new File(
        [new Uint8Array(5 * 1024 * 1024 + 1)],
        "large.jpg",
        { type: "image/jpeg" },
      );

      await expect(fileUploadService.validateFile(empty)).resolves.toMatchObject({ valid: false });
      await expect(fileUploadService.validateFile(oversized)).resolves.toMatchObject({ valid: false });
    });
  });

  describe("server-authoritative upload boundary", () => {
    const uploadEdge = source("supabase/functions/upload-payment-proof/index.ts");
    const secureUpload = source("supabase/functions/_shared/secure-upload.ts");

    it("checks authenticated payment ownership before accepting a proof", () => {
      expect(uploadEdge).toMatch(/payment\.user_id\s*!==\s*userId/);
      expect(uploadEdge).toContain("PAYMENT_NOT_FOUND");
      expect(uploadEdge).toContain("FORBIDDEN");
    });

    it("validates signatures and scans content server-side", () => {
      expect(uploadEdge).toContain("validateSecureUpload");
      expect(uploadEdge).toContain("scanSecureUpload");
      expect(secureUpload).toMatch(/signature/i);
      expect(secureUpload).toMatch(/malware|scan/i);
    });

    it("removes the storage object when the database record is not confirmed", () => {
      expect(uploadEdge).toMatch(/storage[\s\S]*remove\(\[filePath\]\)/);
      expect(uploadEdge).toContain("payment_file_record_failed");
    });
  });

  describe("commercial table authority", () => {
    const manualPaymentHardening = source(
      "supabase/migrations/20260913153500_revoke_authenticated_manual_payment_dml.sql",
    );
    const auxiliaryHardening = source(
      "supabase/migrations/20260913165000_revoke_authenticated_aux_payment_dml.sql",
    );
    const paymentMethodHardening = source(
      "supabase/migrations/20260913170500_restrict_admin_payment_method_table_writes.sql",
    );
    const commercialAudit = source("scripts/security/audit-commercial-authority.mjs");

    it("revokes direct manual payment writes from browser sessions", () => {
      expect(manualPaymentHardening).toMatch(
        /REVOKE\s+INSERT,\s*UPDATE,\s*DELETE[\s\S]*public\.manual_payments[\s\S]*authenticated/i,
      );
    });

    it("revokes direct auxiliary payment mutation paths", () => {
      expect(auxiliaryHardening).toMatch(/public\.order_status_history[\s\S]*authenticated/i);
      expect(auxiliaryHardening).toMatch(/public\.payment_info_requests[\s\S]*authenticated/i);
      expect(auxiliaryHardening).toContain('DROP POLICY IF EXISTS "order_status_history_insert_admin"');
      expect(auxiliaryHardening).toContain('DROP POLICY IF EXISTS "payment_info_requests_admin_manage"');
    });

    it("keeps payment method reads but routes writes through server authority", () => {
      expect(paymentMethodHardening).toMatch(
        /REVOKE\s+INSERT,\s*UPDATE,\s*DELETE[\s\S]*public\.admin_payment_methods[\s\S]*authenticated/i,
      );
      expect(paymentMethodHardening).toMatch(/FOR\s+SELECT/i);
      expect(paymentMethodHardening).not.toMatch(/FOR\s+ALL/i);
    });

    it.each([
      "manual_payments",
      "payment_files",
      "payment_links",
      "quote_payments",
      "admin_payment_methods",
      "order_status_history",
      "payment_info_requests",
    ])("keeps %s under the commercial authority auditor", (table) => {
      expect(commercialAudit).toContain(`table: \"${table}\"`);
    });
  });

  describe("manual payment audit trail", () => {
    const historyMigration = source(
      "supabase/migrations/20260913171000_manual_payment_status_history_trigger.sql",
    );
    const timelineReadMigration = source(
      "supabase/migrations/20260916123710_allow_manual_payment_owner_timeline_read.sql",
    );
    const infoTimelineMigration = source(
      "supabase/migrations/20260916131805_consolidate_manual_payment_info_timeline.sql",
    );
    const singleTimelineMigration = source(
      "supabase/migrations/20260916143602_stop_dual_writing_manual_payment_info_requests.sql",
    );
    const paymentService = source("src/services/payments/payment-service.ts");

    it("records status transitions transactionally in the database", () => {
      expect(historyMigration).toContain("audit_manual_payment_status_transition");
      expect(historyMigration).toMatch(/AFTER\s+UPDATE\s+OF\s+status/i);
      expect(historyMigration).toContain("order_status_history");
      expect(historyMigration).toContain("manual_payment");
    });

    it("keeps the legacy generic history call idempotent for manual payments", () => {
      expect(historyMigration).toMatch(/v_order_type\s*=\s*'manual_payment'/);
      expect(historyMigration).toMatch(/SELECT\s+id[\s\S]*order_status_history/i);
    });

    it("limits customer history reads to their own manual payment while preserving admin reads", () => {
      expect(timelineReadMigration).toMatch(/TO\s+authenticated/i);
      expect(timelineReadMigration).toContain("public.has_role((SELECT auth.uid()), 'admin')");
      expect(timelineReadMigration).toMatch(/order_type\s*=\s*'manual_payment'/i);
      expect(timelineReadMigration).toMatch(/mp\.user_id\s*=\s*\(SELECT auth\.uid\(\)\)/i);
      expect(timelineReadMigration).not.toMatch(/FOR\s+ALL/i);
    });

    it("migrates information requests into history and then removes the active dual write", () => {
      expect(infoTimelineMigration).toMatch(/NEW\.status::text\s*=\s*'requires_info'/);
      expect(singleTimelineMigration).toContain("ordax.payment_info_request_message");
      expect(singleTimelineMigration).toMatch(/set_config\('ordax\.payment_info_request_message'/i);
      expect(singleTimelineMigration).toMatch(/current_setting\('ordax\.payment_info_request_message'/i);
      expect(singleTimelineMigration).toMatch(/INSERT\s+INTO\s+public\.order_status_history/i);
      expect(singleTimelineMigration).not.toMatch(/INSERT\s+INTO\s+public\.payment_info_requests/i);
      expect(singleTimelineMigration).toContain("Deprecated compatibility table");
    });

    it("assembles the sanitized timeline from the single RLS-protected history SSOT", () => {
      expect(paymentService).toContain('.from("order_status_history")');
      expect(paymentService).not.toContain('.from("payment_info_requests")');
      expect(paymentService).toContain('status === "requires_info"');
      expect(paymentService).toContain('return "info_requested"');
      expect(paymentService).toContain('action_type: "file_uploaded"');
      expect(paymentService).toContain("parsePaymentTimelineResponse");
      expect(paymentService).not.toContain("changed_by_name");
      expect(paymentService).not.toContain("changed_by,");
      expect(paymentService).not.toContain("get-manual-payment-timeline");
    });
  });

  describe("chat group membership boundary", () => {
    const groupReadHardening = source(
      "supabase/migrations/20260916152937_restrict_chat_group_metadata_to_members_or_admins.sql",
    );
    const executableGroupReadHardening = stripSqlComments(groupReadHardening);
    const groupService = source("src/services/groups/group-service.ts");

    it("does not expose chat group metadata to every authenticated user", () => {
      expect(groupReadHardening).toContain("DROP POLICY IF EXISTS chat_groups_select_all");
      expect(groupReadHardening).toContain("chat_groups_select_member_or_admin");
      expect(groupReadHardening).toContain("member.user_id = (SELECT auth.uid())");
      expect(executableGroupReadHardening).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    });

    it("builds member group summaries from RLS-protected tables instead of a phantom RPC", () => {
      expect(groupService).toContain('.from("chat_group_members")');
      expect(groupService).toContain('.from("chat_groups")');
      expect(groupService).toContain('.from("chat_group_messages")');
      expect(groupService).toContain('count: "exact", head: true');
      expect(groupService).not.toContain("get_member_groups_optimized");
      expect(groupService).not.toContain("GroupAdminRpcClient");
      expect(groupService).not.toMatch(/supabase\s+as\s+unknown\s+as/i);
    });
  });
});
