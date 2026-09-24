import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Las pruebas no dependen de la red: fuentes, audio y analítica externos se
// bloquean, así que sus "Failed to load resource" no cuentan como error.
async function blockExternalRequests(page: Page) {
  await page.route(/^https?:\/\/(?!localhost[:/])/, (route) => route.abort());
  await page.route("**/_vercel/**", (route) => route.abort());
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) {
      errors.push(message.text());
    }
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  await blockExternalRequests(page);
});

for (const locale of ["es", "en"] as const) {
  test(`home loads in ${locale}`, async ({ page }) => {
    const errors = collectErrors(page);
    const response = await page.goto(`/${locale}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("language switch keeps the lesson", async ({ page }) => {
  await page.goto("/es/curso-armonia/p01-notas");
  await page.getByRole("button", { name: "Cambiar idioma a English" }).click();
  await expect(page).toHaveURL(/\/en\/harmony-course\/p01-writing-musical-notes$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("unknown slug renders the full 404 page", async ({ page }) => {
  const response = await page.goto("/es/apps/no-existe");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle(/404/);
  await expect(page.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
});

test("contact form submits to the API", async ({ page }) => {
  let body: Record<string, unknown> | undefined;
  await page.route("**/api/contact", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, json: { success: true } });
  });

  await page.goto("/es/contacto");
  await page.getByLabel("Nombre").fill("Prueba E2E");
  await page.getByLabel("Correo electrónico").fill("prueba@example.com");
  await page.getByLabel("Mensaje").fill("Mensaje de prueba automática.");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  await expect(page.getByRole("status")).toContainText("Mensaje enviado");
  expect(body).toMatchObject({ name: "Prueba E2E", email: "prueba@example.com", website: "" });
});

test("Virtual Teacher checks the sample MIDI", async ({ page }) => {
  await page.goto("/es/curso-armonia/04-leccion-3");
  await page
    .locator('input[type="file"][accept=".mid,.midi"]')
    .setInputFiles(path.join(__dirname, "../lib/maestro-virtual/__fixtures__/leccion3-correcta.mid"));
  await expect(page.getByText("Puntuación: 100/100")).toBeVisible();
});

test("an embedded app loads without errors", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/es/apps/acordes/jugar");
  const frame = page.frameLocator('iframe[src^="/apps/acordes/"]');
  await expect(frame.locator("#app")).not.toBeEmpty();
  expect(errors).toEqual([]);
});
