import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const androidRoot =
  process.env.AP_MULTI_ANDROID_ROOT ??
  "D:\\Android Studio\\Ear Training Apps\\appapmulti";

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
const appImageSource = path.resolve(websiteRoot, "public", "images", "app-ap-multi.png");

const here = import.meta.dirname;
const publicRoot = path.resolve(here, "..", "public");
const brandTarget = path.resolve(publicRoot, "brand");

await mkdir(brandTarget, { recursive: true });
await cp(logoSource, path.resolve(brandTarget, "storm-studios-logo.png"));
await cp(appImageSource, path.resolve(brandTarget, "app-ap-multi.png"));

console.log("Assets de marca sincronizados. Los samples se sirven desde el bucket R2 compartido.");
