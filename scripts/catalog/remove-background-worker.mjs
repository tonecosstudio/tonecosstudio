import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { removeBackground } from "@imgly/background-removal-node";

const rootRequire = createRequire(import.meta.url);
const imglyEntry = rootRequire.resolve("@imgly/background-removal-node");
const imglyRequire = createRequire(path.join(path.dirname(imglyEntry), "..", "package.json"));
const sharp = imglyRequire("sharp");

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const inputPath = argValue("input");
const outputPath = argValue("output");
const model = argValue("model", "small");

if (!inputPath || !outputPath) {
  throw new Error("Usage: remove-background-worker.mjs --input <png> --output <png>");
}

async function main() {
  const inputPng = await fs.readFile(inputPath);
  const blob = await removeBackground(new Blob([inputPng], { type: "image/png" }), {
    model,
    output: { format: "image/png", type: "foreground", quality: 0.95 },
  });

  const rawPng = Buffer.from(await blob.arrayBuffer());
  const normalized = await sharp(rawPng)
    .trim({ threshold: 2 })
    .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  await fs.writeFile(outputPath, normalized);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
