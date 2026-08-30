import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DOCUMENTATION_ONLY = [
  /^(?:AGENTS|README|URGENTE)\.md$/i,
  /^docs\//,
  /^docs-archive\//,
];

export function shouldIgnoreBuild(paths) {
  return (
    paths.length > 0 &&
    paths.every((path) => DOCUMENTATION_ONLY.some((pattern) => pattern.test(path)))
  );
}

function changedPaths() {
  const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;
  const currentSha = process.env.VERCEL_GIT_COMMIT_SHA || "HEAD";
  const baseRef = /^[0-9a-f]{40}$/i.test(previousSha || "")
    ? previousSha
    : "HEAD^";

  return execFileSync("git", ["diff", "--name-only", baseRef, currentSha, "--"], {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean);
}

function main() {
  try {
    const paths = changedPaths();

    if (shouldIgnoreBuild(paths)) {
      console.log(
        `Skipping Vercel build: ${paths.length} documentation-only file(s).`,
      );
      process.exit(0);
    }
  } catch {
    console.warn("Unable to classify the diff; continuing the Vercel build.");
  }

  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
