import { expect, test } from '@playwright/test';

test('reCAPTCHA CSP uses specific paths and does not allow its scripts in standalone games', async ({ request }) => {
  const response = await request.get('/es/memoria');
  const csp = response.headers()['content-security-policy'];
  expect(csp).toContain('https://www.google.com/recaptcha/');
  expect(csp).toContain('https://www.gstatic.com/recaptcha/');
  expect(csp).not.toContain('https://*.google.com');
  const game = await request.get('/apps/acordes/index.html');
  expect(game.headers()['content-security-policy']).not.toContain('recaptcha');
});

for (const locale of ['es', 'en'] as const) {
  test(`Memoria ${locale} preserves edits when Firebase is unavailable`, async ({ page }) => {
    const recaptchaRequests: string[] = [];
    page.on('request', request => {
      if (/recaptcha/.test(request.url())) recaptchaRequests.push(request.url());
    });
    await page.route(/^https?:\/\/(?!localhost[:/])/, route => route.abort());
    await page.goto(`/${locale}/memoria`);
    await page.getByRole('button', { name: /^0-9 / }).click();
    await page.getByRole('button', { name: locale === 'es' ? 'Ver Código' : 'View/Edit Code', exact: true }).click();
    await page.getByRole('button', { name: locale === 'es' ? 'Editar' : 'Edit', exact: true }).click();
    const word = page.getByRole('textbox', { name: locale === 'es' ? 'Palabra para 0' : 'Word for 0', exact: true });
    await word.fill('Prueba sin red');
    await page.getByRole('button', { name: locale === 'es' ? 'Guardar' : 'Save', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: locale === 'es' ? 'No se pudieron guardar' : 'could not be saved' })).toBeVisible();
    await expect(word).toHaveValue('Prueba sin red');
    await expect(page.getByRole('button', { name: locale === 'es' ? 'Guardar' : 'Save', exact: true })).toBeEnabled();
    // Local and CI browsers never use a debug bypass or consume the site quota.
    expect(recaptchaRequests).toEqual([]);
  });
}
