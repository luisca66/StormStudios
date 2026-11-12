import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function instrumentHtml(html) {
  if (html.includes('src="/site-measurement.js"')) return html;
  return html.replace(/<head(?:\s[^>]*)?>/i, '$&\n<script defer src="/site-measurement.js"></script>');
}

export async function instrumentStandalone(root) {
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.name.endsWith(".html")) {
        const original = await readFile(file, "utf8");
        const result = instrumentHtml(original);
        if (result !== original) await writeFile(file, result);
      }
    }
  }
  await visit(path.join(root, "public", "apps"));
  await visit(path.join(root, "public", "tools"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await instrumentStandalone(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
}
