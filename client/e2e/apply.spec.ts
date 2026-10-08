// Phase 4 (updated in Phase 5 for the real step 01 fields): application shell, routes, guards, draft persistence (SHL-01 to SHL-06).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { DRAFT_KEY, PROGRESS_STAGES, copy } from '@andropedia/shared';
import { validDomain, validYou } from '../src/test/fixtures';

async function stubConfig(page: Page, recruitmentOpen: boolean) {
  await page.unroute('**/api/config');
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { recruitmentOpen, whatsappUrl: 'https://chat.whatsapp.com/x' } }),
  );
}

/** Seeds the draft directly, for tests that are about the shell rather than the fields. */
async function seedDraft(page: Page, data: object) {
  await page.evaluate(([key, value]) => window.localStorage.setItem(key!, value!), [DRAFT_KEY, JSON.stringify(data)]);
}
const storedDraft = (page: Page) => page.evaluate((key) => window.localStorage.getItem(key), DRAFT_KEY);

const progress = (page: Page) => page.getByRole('navigation', { name: copy.progress.label });
const stageLink = (page: Page, k: number) =>
  progress(page).getByRole('link', { name: `${PROGRESS_STAGES[k]!.n} ${PROGRESS_STAGES[k]!.label}, ${copy.progress.completed}` });
const next = (page: Page) => page.getByRole('button', { name: copy.nav.next });
const back = (page: Page) => page.getByRole('button', { name: copy.nav.back });
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function noAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await stubConfig(page, true);
  await page.route('**/api/applications/check', (route) => route.fulfill({ json: { registerNumberTaken: false, emailTaken: false } }));
});

test('Apply now, then continue, opens step 01 inside the shell', async ({ page }) => {
  await page.goto('/join');
  await page.getByRole('button', { name: copy.cta.apply }).first().click();
  await page.getByRole('button', { name: copy.modal.continue }).click();

  await expect(page).toHaveURL(/\/apply\/you$/);
  await expect(page.getByRole('heading', { level: 1, name: copy.you.title })).toBeVisible();
  await expect(progress(page).locator('[aria-current="step"]')).toContainText('01');
  await expect(page).toHaveTitle('Step 01 · Andropedia Recruitment');
  await expect(page.getByLabel(copy.you.name)).toBeVisible();
});

test('with a saved draft, Apply now resumes at the first incomplete step (LND-07)', async ({ page }) => {
  await page.goto('/join');
  await seedDraft(page, validYou);
  await page.reload();
  await page.getByRole('button', { name: copy.cta.apply }).first().click();
  await page.getByRole('button', { name: copy.modal.continue }).click();
  await expect(page).toHaveURL(/\/apply\/domain$/);
  await expect(page.getByRole('status')).toContainText(copy.draft.restored);
});

test('refreshing restores the draft and shows the banner; Start over asks, then clears it', async ({ page }) => {
  await page.goto('/apply/you');
  await expect(page.getByText(copy.draft.restored)).toHaveCount(0);
  await seedDraft(page, validYou);
  await page.reload();

  await expect(page.getByRole('status')).toContainText(copy.draft.restored);
  await page.getByRole('button', { name: copy.draft.reset }).click();
  const dialog = page.getByRole('alertdialog', { name: copy.draft.confirmTitle });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: copy.draft.confirmNo })).toBeFocused();
  await page.waitForTimeout(450); // let the drop-in finish so contrast is measured on the final frame
  await noAxeViolations(page);

  await page.getByRole('button', { name: copy.draft.confirmYes }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(copy.draft.restored)).toHaveCount(0);
  await expect(page).toHaveURL(/\/apply\/you$/);
  expect(await storedDraft(page)).toBeNull();

  // The draft really is empty: Next now fails on step 01.
  await next(page).click();
  await expect(page).toHaveURL(/\/apply\/you$/);
  await expect(page.getByLabel(copy.you.name)).toBeFocused();
});

test('Next moves on with a valid step; Back and the browser back button return with data intact', async ({ page }) => {
  await page.goto('/apply/you');
  await seedDraft(page, validYou);
  await page.reload();

  await next(page).click();
  await expect(page).toHaveURL(/\/apply\/domain$/);
  await expect(page).toHaveTitle('Step 02 · Andropedia Recruitment');
  await expect(page.getByText(copy.draft.restored)).toHaveCount(0); // banner was for the first view only
  await expect(stageLink(page, 0)).toBeVisible();
  await expect(stageLink(page, 0).locator('[data-stamp]')).toBeVisible();
  await expect(progress(page).locator('[aria-current="step"]')).toContainText('02');

  await back(page).click();
  await expect(page).toHaveURL(/\/apply\/you$/);
  expect(JSON.parse((await storedDraft(page))!)).toEqual(validYou);

  await page.goForward();
  await expect(page).toHaveURL(/\/apply\/domain$/);
  await page.goBack(); // Android back button (SHL-05)
  await expect(page).toHaveURL(/\/apply\/you$/);
  await expect(page.getByRole('heading', { level: 1, name: copy.you.title })).toBeVisible();
});

test('tapping a completed stage goes back to it', async ({ page }) => {
  await page.goto('/apply/you');
  await seedDraft(page, { ...validYou, ...validDomain });
  await page.goto('/apply/about');
  await expect(page.getByRole('heading', { level: 1, name: copy.about.stepTitle })).toBeVisible();

  await stageLink(page, 0).click();
  await expect(page).toHaveURL(/\/apply\/you$/);
  // Locked and current stages are not links.
  await expect(progress(page).getByRole('link')).toHaveCount(0);
});

test('Back from step 01 returns to the landing page', async ({ page }) => {
  await page.goto('/apply/you');
  await back(page).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle('Andropedia Recruitment');
});

test('guards: a later step redirects to the first incomplete one and says why; done without a submission goes home', async ({ page }) => {
  await page.goto('/apply/work');
  await expect(page).toHaveURL(/\/apply\/you$/);
  await expect(page.getByRole('alert')).toHaveText(copy.shell.guarded);
  await noAxeViolations(page);

  await page.goto('/apply/done');
  await expect(page).toHaveURL(/\/$/);
});

test('a closed round sends /apply/you back to the landing page', async ({ page }) => {
  await stubConfig(page, false);
  await page.goto('/apply/you');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(copy.closed.body)).toHaveCount(1);
});

test('layout: progress bar fits, no horizontal scroll, buttons 56px and in normal flow', async ({ page, isMobile }) => {
  await page.goto('/apply/you');
  await seedDraft(page, { ...validYou, ...validDomain });
  await page.goto('/apply/about');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

  const stages = await progress(page).getByRole('listitem').all();
  expect(stages).toHaveLength(5);
  for (const stage of stages) {
    const box = (await stage.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(innerWidth);
  }
  // Labels at 11 to 12px.
  const labelSize = await progress(page).getByText('Domain', { exact: true }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(labelSize).toBeGreaterThanOrEqual(11);
  expect(labelSize).toBeLessThanOrEqual(12);

  const nextBox = (await next(page).boundingBox())!;
  const backBox = (await back(page).boundingBox())!;
  expect(nextBox.height).toBeGreaterThanOrEqual(56);
  expect(backBox.height).toBeGreaterThanOrEqual(56);
  if (isMobile) {
    expect(backBox.y).toBeGreaterThan(nextBox.y); // stacked, Next on top
    expect(Math.round(backBox.x)).toBe(Math.round(nextBox.x));
  } else {
    expect(Math.round(backBox.y)).toBe(Math.round(nextBox.y)); // side by side, Back on the left
    expect(backBox.x).toBeLessThan(nextBox.x);
  }

  for (const el of [next(page), back(page)]) {
    const position = await el.evaluate((node) => {
      for (let n: Element | null = node; n; n = n.parentElement) {
        const p = getComputedStyle(n).position;
        if (p === 'fixed' || p === 'sticky') return p;
      }
      return 'flow';
    });
    expect(position).toBe('flow');
  }

  await noAxeViolations(page);
});

test('invalid Next lists the errors and focuses the first, with no axe violations', async ({ page }) => {
  await page.goto('/apply/you');
  await next(page).click();
  await expect(page.getByLabel(copy.you.name)).toBeFocused();
  await expect(page.getByText(copy.err.regno)).toBeVisible();
  await noAxeViolations(page);
});

test('screenshot', async ({ page }, info) => {
  await page.goto('/apply/you');
  await seedDraft(page, { ...validYou, ...validDomain });
  await page.goto('/apply/about');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `e2e/.results/apply-${info.project.name}.png`, fullPage: true });
});
