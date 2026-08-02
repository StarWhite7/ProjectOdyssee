import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function signIn(page: Page, email: string) {
  await page.goto('/connexion');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill('odyssee-test');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page).toHaveURL(/tableau-de-bord/);
}

async function createCharacter(page: Page, name: string) {
  await page.getByRole('link', { name: /Créer mon personnage/ }).click();
  await page.getByLabel('Nom', { exact: true }).fill(name);
  await page.getByLabel('Apparence').fill('Une silhouette attentive aux détails.');
  await page.getByLabel(/Personnalité/).fill('curieux, loyal');
  await page.getByRole('button', { name: 'Valider mon personnage' }).click();
  await expect(page).toHaveURL(/salon/);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('creates and advances the seeded Mock adventure', async ({ page }) => {
  await signIn(page, 'mara@odyssee.local');
  await page.getByRole('button', { name: 'Ouvrir la démonstration' }).click();
  await expect(page.getByRole('heading', { name: 'Laboratoire des Hautes-Strates' })).toBeVisible();
  await page.getByLabel(/écrivez librement votre action/i).fill('ouvrir le coffre scellé de Sora');
  await page.getByRole('button', { name: 'Valider en secret' }).click();
  await expect(page.getByText('TOUR 2')).toBeVisible();
  await page.reload();
  await expect(page.getByText('TOUR 2')).toBeVisible();
  await page.getByRole('link', { name: 'Souvenirs' }).click();
  await expect(page.getByRole('heading', { name: 'La piste du tour 1' })).toBeVisible();
});

test('keeps two real browser pages secret and resolves exactly once', async ({ context, page }) => {
  await signIn(page, 'alice@odyssee.local');
  await page.getByRole('button', { name: 'Créer l’aventure' }).click();
  await expect(page).toHaveURL(/salon/);
  const code = (await page.locator('.code strong').textContent())!.trim();

  const partner = await context.newPage();
  await signIn(partner, 'bob@odyssee.local');
  await partner.getByLabel('Code d’invitation').fill(code);
  await partner.getByRole('button', { name: 'Rejoindre', exact: true }).click();
  await expect(partner).toHaveURL(/salon/);
  await createCharacter(partner, 'Bastien');
  await page.reload();
  await createCharacter(page, 'Ariane');

  await page.getByRole('link', { name: 'Entrer dans l’aventure' }).click();
  await partner.reload();
  await partner.getByRole('link', { name: 'Entrer dans l’aventure' }).click();
  await page.getByLabel(/écrivez librement votre action/i).fill('ouvrir le coffre scellé de Sora');
  await page.getByRole('button', { name: 'Valider en secret' }).click();
  await expect(page.getByText('Décision verrouillée')).toBeVisible();
  await expect(partner.getByText(/ouvrir le coffre scellé de Sora/i)).not.toBeVisible();
  await partner.getByRole('button', { name: /Prendre l’initiative/ }).click();
  await partner.getByRole('button', { name: 'Valider en secret' }).click();
  await expect(partner.getByText('TOUR 2')).toBeVisible();
  await page.reload();
  await expect(page.getByText('TOUR 2')).toBeVisible();
  await expect(page.getByText('Conséquence précédente')).toHaveCount(1);
});

test('creates a server-equivalent timeout decision in Mock mode', async ({ page }) => {
  await signIn(page, 'timer@odyssee.local');
  await page.getByRole('button', { name: 'Ouvrir la démonstration' }).click();
  await expect(page).toHaveURL(/jouer/);
  await page.evaluate(() => {
    const games = JSON.parse(localStorage.getItem('odyssee_games_v1') ?? '[]') as Array<{
      id: string;
      playMode: string;
      timerSeconds: number | null;
      turns: Array<{ createdAt: string }>;
    }>;
    const demo = games.find((game) => game.id === 'demo-adventure')!;
    demo.playMode = 'realtime';
    demo.timerSeconds = 1;
    demo.turns.at(-1)!.createdAt = new Date(Date.now() - 2_000).toISOString();
    localStorage.setItem('odyssee_games_v1', JSON.stringify(games));
  });
  await page.reload();
  await expect(page.getByText('TOUR 2')).toBeVisible({ timeout: 8_000 });
});
