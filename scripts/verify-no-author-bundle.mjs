// Verifies that Sequencer v5 author-only code (voicing, harmonizing, review,
// author transposition) is never bundled into production client chunks.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FORBIDDEN_MARKERS = [
  "author-voice",
  "author-panel",
  "Repartir la pista",
  "Armonizar la soprano",
  "realizeChordTrack",
  "harmonizeOptions",
];

async function collectJsFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsFiles(full)));
    } else if (entry.isFile() && /\.(?:m?js)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const checkOpenNext = process.argv.includes("--open-next");
const staticDirs = checkOpenNext
  ? [path.join(ROOT, ".open-next", "assets", "_next", "static")]
  : [path.join(ROOT, ".next", "static")];

let scanned = 0;
const violations = [];

for (const dir of staticDirs) {
  const files = await collectJsFiles(dir);
  for (const file of files) {
    scanned++;
    const content = await readFile(file, "utf8");
    for (const marker of FORBIDDEN_MARKERS) {
      if (content.includes(marker)) {
        violations.push({ file: path.relative(ROOT, file), marker });
      }
    }
  }
}

if (scanned === 0) {
  console.error("verify-no-author-bundle: no client chunks found in .next/static");
  process.exit(1);
}

if (violations.length > 0) {
  console.error("verify-no-author-bundle: author-only code leaked into production chunks:");
  for (const v of violations) {
    console.error(`  - ${v.file} matched "${v.marker}"`);
  }
  process.exit(1);
}

console.log(`verify-no-author-bundle: OK (${scanned} client chunks verified clean).`);
