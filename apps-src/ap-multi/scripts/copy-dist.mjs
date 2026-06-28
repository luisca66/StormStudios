import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const websiteRoot =
  process.env.STORM_WEBSITE_ROOT ??
  "C:\\Users\\Luis\\Documents\\Claude Cowork\\nuevo_website\\storm-studios\\StormStudios";

const here = import.meta.dirname;
const dist = path.resolve(here, "..", "dist");
const target = path.resolve(websiteRoot, "public", "apps", "ap-multi");

await mkdir(path.dirname(target), { recursive: true });
await rm(target, { recursive: true, force: true });
await cp(dist, target, { recursive: true });

const files = await readdir(target);
console.log(`Copiado dist -> ${target} (${files.length} entradas)`);
