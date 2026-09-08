import { readdir, readFile, cp, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] || "build";
if (!["build", "check", "audit", "install"].includes(mode)) throw new Error("Use build, check, audit or install");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run through npm run apps:build/check/audit/install");
const folders = (await readdir(path.join(root, "apps-src"), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

function run(args, cwd) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd, stdio: "inherit" });
  if (result.error || result.status !== 0) throw new Error(`npm ${args.join(" ")} failed in ${cwd}`);
}
async function checkFiles(source, target) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) await checkFiles(from, to);
    else if (!(await readFile(from)).equals(await readFile(to))) throw new Error(`Published bundle differs: ${to}`);
  }
}
for (const folder of folders) {
  const cwd = path.join(root, "apps-src", folder);
  try { await access(path.join(cwd, "package.json")); } catch { continue; }
  console.log(`\n${mode}: ${folder}`);
  if (mode === "install") { run(["ci", "--ignore-scripts"], cwd); continue; }
  if (mode === "audit") { run(["audit", "--audit-level=low"], cwd); continue; }
  run(["run", "build"], cwd);
  const destinationName = folder === "oido-absoluto-multi-juego" ? "oido-absoluto-multi" : folder;
  const dist = path.join(cwd, "dist");
  const publicRoot = path.join(root, "public", "apps");
  const target = path.resolve(publicRoot, destinationName);
  if (path.dirname(target) !== publicRoot) throw new Error("Target outside public/apps");
  if (mode === "build") await cp(dist, target, { recursive: true });
  else await checkFiles(dist, target);
}
console.log(`All apps: ${mode} passed.`);
