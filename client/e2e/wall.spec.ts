// Phase 6: step 04 portfolio wall (APP-04 R1 to R5, API-03 client side).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { DRAFT_KEY, copy, fmt } from '@andropedia/shared';
import { validAbout, validDomain, validYou } from '../src/test/fixtures';

// A 2x2 red PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAwMDAxMDAAAAeAQIBMzu6WgAAAABJRU5ErkJggg==',
  'base64',
);
const PHOTO_ID = '6f1c2b1e-8d5a-4c3e-9f7a-2b4c6d8e0a1b';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
async function noAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
}

let uploads = 0;
let failNext = false;

test.beforeEach(async ({ page }) => {
  uploads = 0;
  failNext = false;
  await page.route('**/api/config', (route) => route.fulfill({ json: { recruitmentOpen: true, whatsappUrl: 'x' } }));
  await page.route('**/api/uploads/photo', (route) => {
    uploads++;
    if (failNext) {
      failNext = false;
      return route.abort('failed');
    }
    return route.fulfill({ status: 201, json: { photoId: PHOTO_ID, url: 'http://127.0.0.1:4173/stub-photo.png' } });
  });
  await page.route('**/stub-photo.png', (route) => route.fulfill({ body: PNG, contentType: 'image/png' }));
  await page.goto('/apply/you');
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key!, value!),
    [DRAFT_KEY, JSON.stringify({ ...validYou, ...validDomain, ...validAbout })],
  );
  await page.goto('/apply/work');
});

const emptyTile = (page: Page, prompt: string) => page.getByRole('button', { name: new RegExp(prompt.replace('+', '\\+')) });
const draft = (page: Page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '{}'), DRAFT_KEY);

test('the wall: dashed prompts, no dropzone, straight editors, tilted tiles within 1.5 degrees', async ({ page }) => {
  await expect(emptyTile(page, copy.work.empty.photo)).toBeVisible();
  await expect(page.getByText(/drag|drop files here|browse/i)).toHaveCount(0);
  await noAxeViolations(page);

  await emptyTile(page, copy.work.empty.link).click();
  await page.getByLabel(copy.work.link).fill('https://github.com/asha-rao');
  // The editor is straight (APP-04-R2).
  const editorTilt = await page.getByLabel(copy.work.link).evaluate((el) => getComputedStyle(el.closest('li')!).transform);
  expect(editorTilt).toBe('none');
  await page.getByRole('button', { name: copy.work.save }).click();
  await expect(page.getByRole('button', { name: fmt(copy.work.linkTile, { label: copy.work.link, link: 'github.com/asha-rao' }) })).toBeVisible();

  await page.waitForTimeout(450); // let the drop animation settle before measuring
  const tilts = await page.locator('.wall-tile').evaluateAll((els) =>
    els.map((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return Math.abs((Math.atan2(m.b, m.a) * 180) / Math.PI);
    }),
  );
  for (const t of tilts) expect(t).toBeLessThanOrEqual(1.5 + 1e-6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('layout: one column with alternating offsets under 480px, two equal columns from 480px (R3)', async ({ page }) => {
  const width = page.viewportSize()!.width;
  await expect(emptyTile(page, copy.work.empty.photo)).toBeVisible();
  const boxes = await page.locator('main ul > li[data-field]').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), w: Math.round(r.width) };
    }),
  );
  const columns = new Set(boxes.map((b) => b.x));
  if (width < 480) {
    expect(boxes[0]!.x).not.toBe(boxes[1]!.x); // alternating offsets
    expect(Math.abs(boxes[0]!.x - boxes[1]!.x)).toBe(8);
  } else {
    expect(columns.size).toBe(2);
    expect(boxes[0]!.w).toBe(boxes[1]!.w);
  }
});

test('photo: pick, see progress, get a polaroid with the first name; only photoId and url reach the draft', async ({ page }) => {
  await page.getByTestId('photo-input').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('img', { name: fmt(copy.work.photoAlt, { name: 'Asha' }) })).toBeVisible();
  await expect(page.locator('figcaption')).toHaveText('Asha');
  await expect(page.getByRole('button', { name: copy.work.replace })).toBeVisible();
  await expect(page.getByRole('button', { name: copy.work.removePhoto })).toBeVisible();
  await expect.poll(async () => (await draft(page)).photoId).toBe(PHOTO_ID);
  const stored = await draft(page);
  expect(stored.photoUrl).toBe('http://127.0.0.1:4173/stub-photo.png');
  expect(JSON.stringify(stored)).not.toContain('data:image');
  await noAxeViolations(page);
});

test('photo: a failed upload offers a retry, which works (R4)', async ({ page }) => {
  failNext = true;
  await page.getByTestId('photo-input').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('alert')).toContainText(copy.err.network);
  await page.getByRole('button', { name: copy.work.retry }).click();
  await expect(page.getByRole('button', { name: copy.work.replace })).toBeVisible();
  expect(uploads).toBe(2);
});

test('photo: a wrong type never uploads', async ({ page }) => {
  await page.getByTestId('photo-input').setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
  await expect(page.getByRole('alert')).toContainText(copy.err.photoType);
  expect(uploads).toBe(0);
});

test('a complete wall moves on to step 05', async ({ page }) => {
  await page.getByTestId('photo-input').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('button', { name: copy.work.replace })).toBeVisible();
  await emptyTile(page, copy.work.empty.link).click();
  await page.getByLabel(copy.work.link).fill('https://drive.google.com/drive/folders/abc');
  await page.getByRole('button', { name: copy.work.save }).click();
  await emptyTile(page, copy.work.empty.proud).click();
  await page.getByLabel(copy.work.proudTitle).fill('Hackathon');
  await page.getByLabel(copy.work.proudDesc).fill('Second place at the college hackathon.');
  await page.getByRole('button', { name: copy.work.save }).click();
  await noAxeViolations(page);
  await page.getByRole('button', { name: copy.nav.next }).click();
  await expect(page).toHaveURL(/\/apply\/us$/);
});
