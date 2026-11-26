/**
 * Shared validation for the Curadoria's existing private import plan, used in
 * the browser and the headless batch runner. The existing Worker admin endpoint
 * remains the sole D1 writer and rechecks ownership, R2 and permissions live.
 */
export type PrivateTelegramManifest = {
  originId: string;
  studio: string;
  groupKey: string;
  name: string;
  universe: string;
  variant: string;
  franchiseId: number;
  images: Array<{ messageId: number; sha256: string }>;
};

export type PrivateTelegramPlannedDraft = {
  id: string;
  operationId: string;
  operation: "create" | "append";
  studio: string;
  manifest: PrivateTelegramManifest;
};

export type PrivateTelegramPlan = {
  drafts: PrivateTelegramPlannedDraft[];
  sha256: string;
  studioCount: number;
  photoCount: number;
};

const HEX24 = /^[a-f0-9]{24}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const SOLO = /^single:([1-9][0-9]{0,15})$/;
const SOURCE = "2370335738";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_OPERATIONS = 6000;
const ALLOWED_KEYS = [
  "originId",
  "studio",
  "groupKey",
  "name",
  "universe",
  "variant",
  "franchiseId",
  "images",
]
  .sort()
  .join("|");

function reject(reason: string): never {
  throw new Error("private_import_plan_" + reason);
}

function validText(value: unknown, max: number, required = false) {
  return (
    typeof value === "string" &&
    value.length <= max &&
    (!required || !!value.trim()) &&
    !Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
  );
}

function digest(bytes: Uint8Array) {
  if (!globalThis.crypto?.subtle) reject("crypto_unavailable");
  return globalThis.crypto.subtle
    .digest("SHA-256", bytes as BufferSource)
    .then((buffer) =>
      Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
    );
}

export async function parsePrivateTelegramPlan(
  text: string,
): Promise<PrivateTelegramPlan> {
  const bytes = new TextEncoder().encode(text);
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) reject("file_size");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length || lines.length > MAX_OPERATIONS) reject("operation_count");

  const drafts: PrivateTelegramPlannedDraft[] = [];
  const modelIds = new Set<string>();
  const messageIds = new Set<number>();
  const sourceHashes = new Set<string>();
  const operationIds = new Set<string>();
  const studios = new Set<string>();
  let photoCount = 0;

  for (const line of lines) {
    if (line.length > 24000) reject("line_size");
    let record: Record<string, unknown>;
    try {
      const value: unknown = JSON.parse(line);
      if (!value || Array.isArray(value) || typeof value !== "object")
        reject("record");
      record = value as Record<string, unknown>;
    } catch {
      reject("invalid_jsonl");
    }
    const operation = record.append_to_existing_private_draft === true ? "append" : "create";
    const expectedModelId = record.model_id;
    if (
      (operation === "create" && (record.new_private_draft_only !== true || record.append_to_existing_private_draft !== false || record.existing_d1_model !== null)) ||
      (operation === "append" && (record.new_private_draft_only !== false || record.existing_d1_model !== expectedModelId)) ||
      record.rights_verified !== false ||
      record.showcase_visible !== false ||
      record.production_write_authorized !== false ||
      record.apply_executed !== false
    ) reject("not_private_import_operation");
    if (
      typeof record.operation_id !== "string" ||
      !HEX64.test(record.operation_id) ||
      operationIds.has(record.operation_id)
    )
      reject("operation_id");
    operationIds.add(record.operation_id);

    const value = record.import_manifest;
    if (!value || Array.isArray(value) || typeof value !== "object")
      reject("manifest");
    const m = value as Record<string, unknown>;
    if (
      Object.keys(m).sort().join("|") !== ALLOWED_KEYS ||
      m.originId !== SOURCE ||
      !validText(m.studio, 120, true) ||
      /geral\s*\+?\s*50k/i.test(String(m.studio)) ||
      !validText(m.name, 160, true) ||
      !validText(m.universe, 160) ||
      !validText(m.variant, 160) ||
      !Number.isSafeInteger(m.franchiseId) ||
      (m.franchiseId as number) < 1 ||
      !Array.isArray(m.images) ||
      m.images.length < 1 ||
      m.images.length > 80
    )
      reject("manifest_fields");

    const group = m.groupKey;
    const solo = typeof group === "string" ? SOLO.exec(group) : null;
    if (typeof group !== "string" || (!HEX24.test(group) && !solo))
      reject("group_identity");
    const photos: PrivateTelegramManifest["images"] = [];
    for (const item of m.images as unknown[]) {
      if (!item || Array.isArray(item) || typeof item !== "object")
        reject("photo");
      const photo = item as Record<string, unknown>;
      if (
        Object.keys(photo).sort().join("|") !== "messageId|sha256" ||
        !Number.isSafeInteger(photo.messageId) ||
        (photo.messageId as number) < 1 ||
        typeof photo.sha256 !== "string" ||
        !HEX64.test(photo.sha256) ||
        messageIds.has(photo.messageId as number) ||
        sourceHashes.has(photo.sha256)
      )
        reject("photo_identity_or_duplicate");
      messageIds.add(photo.messageId as number);
      sourceHashes.add(photo.sha256);
      photos.push({
        messageId: photo.messageId as number,
        sha256: photo.sha256,
      });
    }
    if (
      solo &&
      (photos.length !== 1 || photos[0].messageId !== Number(solo[1]))
    )
      reject("singleton_mismatch");

    const canonicalGroup = solo
      ? (await digest(new TextEncoder().encode(SOURCE + ":" + group))).slice(
          0,
          24,
        )
      : group;
    const expectedId = "tg_" + canonicalGroup;
    if (record.model_id !== expectedId || modelIds.has(expectedId))
      reject("model_identity_or_duplicate");
    modelIds.add(expectedId);
    const manifest: PrivateTelegramManifest = {
      originId: SOURCE,
      studio: m.studio as string,
      groupKey: group,
      name: m.name as string,
      universe: m.universe as string,
      variant: m.variant as string,
      franchiseId: m.franchiseId as number,
      images: photos,
    };
    const workerBody = {
      ...manifest,
      operation,
      ...(operation === "append" ? { expectedModelId: expectedId } : {}),
    };
    if (JSON.stringify(workerBody).length > 20000) reject("request_size");
    drafts.push({
      id: expectedId,
      operationId: record.operation_id,
      operation,
      studio: manifest.studio,
      manifest,
    });
    studios.add(manifest.studio);
    photoCount += photos.length;
  }

  return {
    drafts,
    sha256: await digest(bytes),
    studioCount: studios.size,
    photoCount,
  };
}
