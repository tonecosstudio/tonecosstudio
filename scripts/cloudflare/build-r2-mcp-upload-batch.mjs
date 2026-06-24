import fs from "node:fs";
import path from "node:path";

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const PLAN_PATH = path.resolve(
  argValue(
    "plan",
    "tmp/dragon-ball-live/telegram_webp_storage_upload_plan.json",
  ),
);
const OFFSET = Number.parseInt(argValue("offset", "0"), 10) || 0;
const LIMIT = Number.parseInt(argValue("limit", "10"), 10) || 10;
const OUT_PATH = argValue("out", null);

const plan = JSON.parse(fs.readFileSync(PLAN_PATH, "utf8"));
const operations = (plan.operations || [])
  .filter((item) => item.status === "ready_for_upload")
  .slice(OFFSET, OFFSET + LIMIT)
  .map((item) => {
    const bytes = fs.readFileSync(item.local_path);
    return {
      key: item.storage_path,
      contentType: item.content_type || "image/webp",
      expectedBytes: item.actual_bytes ?? item.expected_bytes ?? bytes.length,
      sha256: item.sha256 || null,
      b64: bytes.toString("base64"),
    };
  });

const code = `async () => {
  const uploads = ${JSON.stringify(operations)};
  const results = [];
  for (const item of uploads) {
    const body = Buffer.from(item.b64, 'base64');
    const response = await cloudflare.request({
      method: 'PUT',
      path: \`/accounts/\${accountId}/r2/buckets/ordax-catalog/objects/\${item.key}\`,
      body,
      contentType: item.contentType,
      rawBody: true,
    });
    results.push({
      key: item.key,
      success: response.success,
      status: response.status,
      result: response.result,
    });
  }
  return {
    count: uploads.length,
    uploadedKeys: results.filter((item) => item.success).length,
    failedKeys: results.filter((item) => !item.success).length,
    results,
  };
}`;

if (OUT_PATH) {
  fs.writeFileSync(path.resolve(OUT_PATH), code);
} else {
  process.stdout.write(code);
}
