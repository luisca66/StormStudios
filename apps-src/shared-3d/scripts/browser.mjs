// Inspector en Chromium sin ventana, para las capturas y la prueba visual.
// WebGL por software (SwiftShader): lento pero determinista, igual en cualquier máquina.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function openInspector({ width, height, port = 0 }) {
  const server = await createServer({
    configFile: path.join(root, "vite.config.ts"),
    logLevel: "error",
    // Puerto libre: se puede correr junto al inspector abierto en 5190.
    // Sin recarga en caliente: si alguien edita el inspector a media corrida, no se recarga la página.
    server: { port, strictPort: false, hmr: false, watch: null },
  });
  await server.listen();
  const base = server.resolvedUrls.local[0];
  const browser = await chromium.launch({
    // En la PC de Luis, Playwright usa su Chromium; en la nube, el que ya está instalado.
    executablePath: process.env.CHROMIUM_PATH ?? (process.platform === "linux" ? "/opt/pw-browsers/chromium" : undefined),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (error) => console.error("página:", error.message));

  /** Renderiza con los parámetros de URL del inspector; devuelve la imagen y los datos del modelo. */
  async function render(query) {
    const search = new URLSearchParams({ capture: "1", ...query });
    await page.goto(`${base}?${search}`);
    await page.waitForFunction(() => window.__inspector?.ready, null, { timeout: 120_000 });
    const { error, stats } = await page.evaluate(() => window.__inspector);
    if (error) throw new Error(`${query.model ?? query.src}: ${error}`);
    return { image: PNG.sync.read(await page.locator("canvas").screenshot()), stats };
  }

  async function close() {
    await browser.close();
    await server.close();
  }

  return { render, close };
}

/** Pega imágenes del mismo alto en una tira horizontal. */
export function strip(images) {
  const height = images[0].height;
  const sheet = new PNG({ width: images.reduce((sum, image) => sum + image.width, 0), height });
  let x = 0;
  for (const image of images) {
    PNG.bitblt(image, sheet, 0, 0, image.width, image.height, x, 0);
    x += image.width;
  }
  return PNG.sync.write(sheet);
}
