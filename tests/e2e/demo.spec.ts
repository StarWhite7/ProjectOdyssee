import { expect, test } from '@playwright/test';
test('creates and advances a mock adventure', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Créer une aventure/ }).click();
  await page.getByRole('button', { name: 'Créer la démo' }).click();
  await expect(page.getByRole('heading', { name: 'Laboratoire des Hautes-Strates' })).toBeVisible();
  await page.getByRole('button', { name: /Observer les détails/ }).click();
  await page.getByRole('button', { name: 'Valider en secret' }).click();
  await expect(page.getByText('Conséquence')).toBeVisible();
  await page.reload();
  await expect(page.getByText('TOUR 2')).toBeVisible();
});
