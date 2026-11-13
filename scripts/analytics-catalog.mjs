// Public route allowlist: never persist arbitrary paths supplied by a visitor.
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const paths = [];
for (const locale of ["es", "en"]) {
  for (const [folder, route] of [["blog", "blog"], ["maestria", locale === "es" ? "maestria" : "mastery"]]) {
    const files = await readdir(path.join(root, "content", folder, locale));
    for (const file of files.filter((file) => /\.mdx?$/.test(file))) {
      paths.push(`/${locale}/${route}/${file.replace(/\.mdx?$/, "")}`);
    }
  }
}
async function htmlPaths(directory) {
  for (const entry of await readdir(path.join(root, "public", directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await htmlPaths(relative);
    else if (entry.name.endsWith(".html")) paths.push(`/${relative}`);
  }
}
await htmlPaths("apps");
await htmlPaths("tools");
await mkdir(path.join(root, "lib", "analytics"), { recursive: true });
await writeFile(path.join(root, "lib", "analytics", "public-paths.json"), `${JSON.stringify(paths.sort(), null, 2)}\n`);
