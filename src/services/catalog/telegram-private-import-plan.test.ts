import { createHash, webcrypto } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { parsePrivateTelegramPlan } from "./telegram-private-import-plan";

const source = "2370335738";
const solo = "single:24268";
const soloId =
  "tg_" +
  createHash("sha256")
    .update(source + ":" + solo)
    .digest("hex")
    .slice(0, 24);

function entry(
  group = solo,
  messageId = 24268,
  id = soloId,
  operationId = "b".repeat(64),
) {
  return {
    operation_id: operationId,
    model_id: id,
    new_private_draft_only: true,
    append_to_existing_private_draft: false,
    existing_d1_model: null,
    rights_verified: false,
    showcase_visible: false,
    r2_verified: false,
    production_write_authorized: false,
    apply_executed: false,
    import_manifest: {
      originId: source,
      studio: "Momoji",
      groupKey: group,
      name: "Modelo sem nome #24268",
      universe: "Naruto",
      variant: "",
      franchiseId: 48,
      images: [{ messageId, sha256: "a".repeat(64) }],
    },
  };
}

beforeAll(() => vi.stubGlobal("crypto", webcrypto));
afterAll(() => vi.unstubAllGlobals());

describe("TONART private draft plan uses the canonical Worker importer only", () => {
  it("validates exact existing single identities and computes source SHA", async () => {
    const text = JSON.stringify(entry()) + "\n";
    const plan = await parsePrivateTelegramPlan(text);
    expect(plan.drafts).toHaveLength(1);
    expect(plan.drafts[0]).toMatchObject({
      id: soloId,
      studio: "Momoji",
      manifest: { groupKey: solo, images: [{ messageId: 24268 }] },
    });
    expect(plan.sha256).toBe(createHash("sha256").update(text).digest("hex"));
    expect(plan.studioCount).toBe(1);
    expect(plan.photoCount).toBe(1);
  });

  it("allows conservative stable galleries but detects duplicate images across operations", async () => {
    const group = "c".repeat(24);
    const other = entry(group, 24270, "tg_" + group, "d".repeat(64));
    other.import_manifest.images[0].sha256 = "e".repeat(64);
    const valid = await parsePrivateTelegramPlan(
      [JSON.stringify(entry()), JSON.stringify(other)].join("\n"),
    );
    expect(valid.drafts).toHaveLength(2);
    expect(valid.photoCount).toBe(2);
    expect(valid.studioCount).toBe(1);

    other.import_manifest.images[0].sha256 = "a".repeat(64);
    await expect(
      parsePrivateTelegramPlan(
        [JSON.stringify(entry()), JSON.stringify(other)].join("\n"),
      ),
    ).rejects.toThrow("private_import_plan_photo_identity_or_duplicate");
  });

  it.each([
    [
      "ownerless authorization",
      (x: ReturnType<typeof entry>) => {
        x.production_write_authorized = true;
      },
    ],
    [
      "unexpected visibility",
      (x: ReturnType<typeof entry>) => {
        x.showcase_visible = true;
      },
    ],
    [
      "preexisting gallery append",
      (x: ReturnType<typeof entry>) => {
        x.new_private_draft_only = false;
      },
    ],
    [
      "mismatched derived model ID",
      (x: ReturnType<typeof entry>) => {
        x.model_id = "tg_" + "f".repeat(24);
      },
    ],
    [
      "wrong singleton message",
      (x: ReturnType<typeof entry>) => {
        x.import_manifest.images[0].messageId = 42;
      },
    ],
    [
      "external Telegram origin",
      (x: ReturnType<typeof entry>) => {
        x.import_manifest.originId = "another";
      },
    ],
  ])("fails closed on %s", async (_title, change) => {
    const row = entry();
    change(row);
    await expect(parsePrivateTelegramPlan(JSON.stringify(row))).rejects.toThrow(
      /^private_import_plan_/,
    );
  });

  it("rejects large or malformed files before any network operation", async () => {
    await expect(parsePrivateTelegramPlan("")).rejects.toThrow(
      "private_import_plan_file_size",
    );
    await expect(parsePrivateTelegramPlan("{ invalid")).rejects.toThrow(
      "private_import_plan_invalid_jsonl",
    );
    await expect(
      parsePrivateTelegramPlan(" ".repeat(8 * 1024 * 1024 + 1)),
    ).rejects.toThrow("private_import_plan_file_size");
  });
});
