import { cp, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

const androidRoot =
  process.env.AP_GUITAR_ANDROID_ROOT ??
  "D:\\Android Studio\\Ear Training Apps\\appapguitar";

const audioSource = path.resolve(androidRoot, "app", "src", "main", "assets");
const logoSource = path.resolve(
  androidRoot,
  "app",
  "src",
  "main",
  "res",
  "drawable",
  "storm_studios_logo.png",
);
const websiteRoot =
  process.env.STORM_WEBSITE_ROOT ??
  "C:\\Users\\Luis\\Documents\\Claude Cowork\\nuevo_website\\storm-studios\\StormStudios";
const appImageSource = path.resolve(websiteRoot, "public", "images", "app-ap-guitar.jpeg");

const here = import.meta.dirname;
const publicRoot = path.resolve(here, "..", "public");
const audioTarget = path.resolve(publicRoot, "audio");
const brandTarget = path.resolve(publicRoot, "brand");

await mkdir(audioTarget, { recursive: true });
await mkdir(brandTarget, { recursive: true });
await cp(audioSource, audioTarget, { recursive: true });
await cp(logoSource, path.resolve(brandTarget, "storm-studios-logo.png"));
await cp(appImageSource, path.resolve(brandTarget, "app-ap-guitar.jpeg"));

const sharpAliases = await createSharpAliases(audioTarget);
console.log(`Samples sincronizados desde Android. Alias sharp creados: ${sharpAliases}`);

async function createSharpAliases(directory) {
  let count = 0;
  for (const entry of await readdir(directory)) {
    const fullPath = path.resolve(directory, entry);
    const entryStat = await stat(fullPath);

    if (entryStat.isDirectory()) {
      count += await createSharpAliases(fullPath);
      continue;
    }

    if (entry.includes("#") && entry.toLowerCase().endsWith(".mp3")) {
      const safeName = entry.replaceAll("#", "sharp");
      await cp(fullPath, path.resolve(directory, safeName));
      count += 1;
    }
  }
  return count;
}
