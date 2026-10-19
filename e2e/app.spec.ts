import { test, expect, type Page } from '@playwright/test';

async function clickSquare(page: Page, sq: string) {
  const box = await page.locator(`[data-square="${sq}"]`).first().boundingBox();
  if (!box) throw new Error(`no square ${sq}`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function fresh(page: Page) {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./#/home');
}

test('home renders RTL Arabic and switches to English and French', async ({ page }) => {
  await fresh(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('btn-continue')).toContainText('تابع رحلتك');
  await page.goto('./#/settings');
  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.getByTestId('lang-fr').click();
  await page.goto('./#/home');
  await expect(page.getByTestId('btn-continue')).toContainText('Continuer');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('diagnostic starts and records an answer', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('btn-continue').click();
  await page.getByTestId('exp-new').click();
  await page.getByTestId('begin-diagnostic').click();
  await expect(page.getByTestId('puzzle-prompt')).toBeVisible();
  // "new" starts near 600, so the adaptive test opens with the Fool's-mate status question (650).
  await page.getByTestId('choice-checkmate').click();
  await expect(page.getByTestId('puzzle-feedback')).toContainText('صحيح');
  await page.getByTestId('puzzle-next').click();
  await expect(page.getByTestId('puzzle-prompt')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zcd.profile.v1') || '{}').onboarding?.diagnostic?.attempts.length))
    .toBe(1);
});

test('real Stockfish replies in the browser; game survives a reload; analysis runs', async ({ page }) => {
  await fresh(page);
  await page.goto('./#/play');
  await page.locator('.chip', { hasText: 'الأبيض' }).first().click();
  await page.getByTestId('start-free-game').click();
  await clickSquare(page, 'e2');
  await clickSquare(page, 'e4');
  await expect(page.locator('[data-testid="movelist"] li')).toHaveCount(1);
  // Bot (Stockfish in a Web Worker) answers.
  await expect(page.locator('[data-testid="movelist"] li span').nth(2)).not.toHaveText('', { timeout: 30_000 });
  await page.reload();
  await page.goto('./#/match');
  await expect(page.locator('[data-testid="movelist"] li span').nth(2)).not.toHaveText('');
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('resign').click();
  await expect(page.getByTestId('result-title')).toBeVisible();
  await expect(page.getByTestId('accuracy')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zcd.profile.v1') || '{}').games?.length)).toBe(1);
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('zcd.profile.v1') || '{}').games[0]);
  expect(rec.result).toBe('0-1');
  expect(rec.rated).toBe(true);
  expect(rec.ratingAfter.r).toBeLessThan(rec.ratingBefore.r);
});

test('level 1: lesson, interactive example and first exercise', async ({ page }) => {
  await fresh(page);
  await page.goto('./#/level/w1-l1');
  for (let i = 0; i < 5; i++) await page.getByTestId('lesson-next').click();
  await page.getByTestId('lesson-done').click();
  await clickSquare(page, 'g1');
  await clickSquare(page, 'f3');
  await page.getByTestId('example-done').click();
  await expect(page.getByTestId('puzzle-prompt')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/level-exercise.png' });
});

test('promotion picker works on touch board', async ({ page }) => {
  // Levels are gated: seed (before the app boots) a profile where levels 1–2 are passed.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const lv = { lessonDone: true, exampleDone: true, exercisesDone: [], matchPlayed: true, masteryBest: 1, masteryAttempts: 1, passed: true };
    const p = { version: 1, createdAt: Date.now(), rating: { r: 800, rd: 300, vol: 0.06 }, levels: { 'w1-l1': lv, 'w1-l2': lv } };
    localStorage.setItem('zcd.profile.v1', JSON.stringify(p));
  });
  await page.goto('./#/level/w1-l3');
  await page.getByTestId('step-exercises').click();
  // Exercise 3 is the promotion task: solve exercises 1 and 2 first.
  await page.getByTestId('choice-both').click();
  await page.getByTestId('puzzle-next').click();
  await clickSquare(page, 'e1');
  await clickSquare(page, 'g1');
  await page.getByTestId('puzzle-next').click();
  await clickSquare(page, 'e7');
  await clickSquare(page, 'e8');
  await page.locator('[data-promo="q"]').click();
  await expect(page.getByTestId('puzzle-feedback')).toBeVisible();
});

test('screenshots of main screens', async ({ page }) => {
  await fresh(page);
  await page.screenshot({ path: 'docs/screenshots/home.png', fullPage: true });
  await page.goto('./#/worlds');
  await page.screenshot({ path: 'docs/screenshots/worlds.png', fullPage: true });
});
