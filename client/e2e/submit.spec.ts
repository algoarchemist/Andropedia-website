// Phase 7: steps 05 and 06, submit and success (APP-05, APP-06, DONE), plus the NFR-05 happy path end to end
// through every screen and a duplicate-submit case.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { DRAFT_KEY, INSTAGRAM_URL, copy, fmt } from '@andropedia/shared';
import { validThroughUs } from '../src/test/fixtures';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64',
);
const PHOTO_ID = '6f1c2b1e-8d5a-4c3e-9f7a-2b4c6d8e0a1b';
const WHATSAPP = 'https://chat.whatsapp.com/andropedia';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
async function noAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
}

let submitStatus = 201;
let submitted: Record<string, unknown> | undefined;

test.beforeEach(async ({ page }) => {
  submitStatus = 201;
  submitted = undefined;
  await page.route('**/api/config', (route) => route.fulfill({ json: { recruitmentOpen: true, whatsappUrl: WHATSAPP } }));
  await page.route('**/api/applications/check', (route) =>
    route.fulfill({ json: { registerNumberTaken: false, emailTaken: false } }),
  );
  await page.route('**/api/uploads/photo', (route) =>
    route.fulfill({ status: 201, json: { photoId: PHOTO_ID, url: 'http://127.0.0.1:4173/stub-photo.png' } }),
  );
  await page.route('**/stub-photo.png', (route) => route.fulfill({ body: PNG, contentType: 'image/png' }));
  await page.route('**/api/applications', (route) => {
    submitted = route.request().postDataJSON();
    if (submitStatus === 409) {
      return route.fulfill({ status: 409, json: { field: 'email', errors: [{ path: 'email', message: copy.err.duplicate }] } });
    }
    return route.fulfill({ status: 201, json: { id: 'b1c2' } });
  });
});

const next = (page: Page) => page.getByRole('button', { name: copy.nav.next });
const emptyTile = (page: Page, prompt: string) => page.getByRole('button', { name: new RegExp(prompt.replace('+', '\\+')) });

test('happy path: Apply now through all six screens to the WhatsApp button', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: copy.cta.apply }).first().click();
  await page.getByRole('button', { name: copy.modal.continue }).click();

  // 01
  await page.getByLabel(copy.you.name).fill('Asha Rao');
  await page.getByLabel(copy.you.regno).fill('RA2211003010001');
  await page.getByLabel(copy.you.email).fill('asha@srmist.edu.in');
  await page.getByLabel(copy.you.phone).fill('9876543210');
  await page.getByLabel(copy.you.department).selectOption('CSE');
  await page.getByLabel(copy.you.section).fill('A1');
  await next(page).click();

  // 02a
  await page.getByRole('combobox', { name: new RegExp(copy.domain.pref1) }).click();
  await page.getByRole('option', { name: /Design/ }).click();
  await page.getByRole('combobox', { name: new RegExp(copy.domain.pref2) }).click();
  await page.getByRole('option', { name: /Web development/ }).click();
  await next(page).click();

  // 02b
  const long = 'Long enough answer for this one.';
  await page.getByRole('textbox', { name: copy.about.self }).fill(long);
  await page.getByRole('textbox', { name: fmt(copy.about.whyDomain, { domain: 'Design' }) }).fill(long);
  await page.getByLabel(copy.about.skills).fill(long);
  await page.getByLabel(copy.about.stack).fill('Figma');
  await page.getByLabel(copy.about.stack).press('Enter');
  await page.getByLabel(copy.about.outside).fill(long);
  await page.getByLabel(copy.about.whyClub).fill(long);
  await page.getByLabel(copy.about.oneYear).fill(long);
  await next(page).click();

  // 03 wall
  await page.getByTestId('photo-input').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('button', { name: copy.work.replace })).toBeVisible();
  await emptyTile(page, copy.work.empty.link).click();
  await page.getByLabel(copy.work.link).fill('https://github.com/asha');
  await page.getByRole('button', { name: copy.work.save }).click();
  await emptyTile(page, copy.work.empty.proud).click();
  await page.getByLabel(copy.work.proudTitle).fill('Hackathon');
  await page.getByLabel(copy.work.proudDesc).fill('Second place.');
  await page.getByRole('button', { name: copy.work.save }).click();
  await next(page).click();

  // 04: sliders by keyboard in a real browser
  await expect(page).toHaveURL(/\/apply\/us$/);
  const hours = page.getByRole('slider', { name: copy.us.hours });
  await expect(hours).toHaveAttribute('aria-valuetext', copy.us.notAnswered);
  await hours.focus();
  await page.keyboard.press('End');
  await expect(hours).toHaveAttribute('aria-valuetext', copy.us.hoursMaxValue);
  const resp = page.getByRole('slider', { name: copy.us.responsibility });
  await resp.focus();
  await page.keyboard.press('Home'); // already on the ghost value: still counts as answered
  await expect(resp).toHaveAttribute('aria-valuetext', '0 out of 5');
  await page.getByText(copy.us.no, { exact: true }).click();
  await page.getByLabel(copy.us.goodClub).fill('Real projects and mentors.');
  await noAxeViolations(page);
  await next(page).click();

  // 05
  await expect(page.getByText(copy.last.intro)).toBeVisible();
  await page.getByLabel(copy.last.remember).fill('I fix things nobody asked me to fix.');
  await noAxeViolations(page);
  await page.getByRole('button', { name: copy.last.submit }).click();

  // Done
  await expect(page).toHaveURL(/\/apply\/done$/);
  await expect(page.getByRole('heading', { level: 1, name: copy.done.title })).toBeVisible();
  const whatsapp = page.getByRole('link', { name: copy.done.whatsapp });
  await expect(whatsapp).toHaveAttribute('href', WHATSAPP);
  expect((await whatsapp.boundingBox())!.height).toBeGreaterThanOrEqual(72);
  await expect(page.getByRole('link', { name: copy.done.instagram })).toHaveAttribute('href', INSTAGRAM_URL);
  await expect(page.getByText(fmt(copy.done.signoff, { firstName: 'Asha' }))).toBeVisible();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_KEY)).toBeNull();
  await expect(page.locator('nav [data-stamp]')).toHaveCount(5);

  expect(submitted).toMatchObject({
    name: 'Asha Rao',
    domainPref1: 'DESIGN',
    domainPref2: 'WEB_DEV',
    techStack: ['Figma'],
    photoId: PHOTO_ID,
    hoursPerWeek: 7,
    responsibility: 0,
    inOtherClub: false,
    website: '',
  });
  expect(submitted).not.toHaveProperty('photoUrl');
  await page.waitForTimeout(800); // stamps finish landing before contrast is measured
  await noAxeViolations(page);

  // Refreshing the success screen goes home: the submission id lives in memory only.
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
});

test('duplicate submit: 409 shows err.duplicate, keeps the draft, and stays on step 06', async ({ page }) => {
  submitStatus = 409;
  await page.goto('/apply/you');
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key!, value!),
    [DRAFT_KEY, JSON.stringify({ ...validThroughUs, photoId: PHOTO_ID, rememberUs: 'Hello there.' })],
  );
  await page.goto('/apply/last');
  await page.getByRole('button', { name: copy.last.submit }).click();
  await expect(page.getByRole('alert')).toContainText(copy.err.duplicate);
  await expect(page).toHaveURL(/\/apply\/last$/);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_KEY)).not.toBeNull();
});

test('over 30 words disables Submit without blocking typing', async ({ page }) => {
  await page.goto('/apply/you');
  await page.evaluate(([key, value]) => window.localStorage.setItem(key!, value!), [DRAFT_KEY, JSON.stringify(validThroughUs)]);
  await page.goto('/apply/last');
  const box = page.getByLabel(copy.last.remember);
  await box.fill(Array.from({ length: 31 }, (_, i) => `w${i}`).join(' '));
  await expect(page.getByText(copy.err.words)).toBeVisible();
  await expect(page.getByRole('button', { name: copy.last.submit })).toBeDisabled();
  await box.press('End');
  await box.pressSequentially(' more');
  await expect(box).toHaveValue(/ more$/);
  await noAxeViolations(page);
});
