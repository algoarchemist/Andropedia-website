// Phase 5: steps 01 to 02b in a real browser (APP-01 to APP-03, DSN-07, DSN-08).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { DOMAINS, DRAFT_KEY, copy, fmt } from '@andropedia/shared';
import { validAbout, validDomain, validYou } from '../src/test/fixtures';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
async function noAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
}

let checkBody: unknown;
let taken = { registerNumberTaken: false, emailTaken: false };

test.beforeEach(async ({ page }) => {
  checkBody = undefined;
  taken = { registerNumberTaken: false, emailTaken: false };
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { recruitmentOpen: true, whatsappUrl: 'https://chat.whatsapp.com/x' } }),
  );
  await page.route('**/api/applications/check', (route) => {
    checkBody = route.request().postDataJSON();
    return route.fulfill({ json: taken });
  });
});

const seed = (page: Page, data: object) =>
  page.evaluate(([key, value]) => window.localStorage.setItem(key!, value!), [DRAFT_KEY, JSON.stringify(data)]);
const next = (page: Page) => page.getByRole('button', { name: copy.nav.next });
const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test('step 01: type every field, Next passes the duplicate check and lands on step 02', async ({ page }) => {
  await page.goto('/apply/you');
  await page.getByLabel(copy.you.name).fill('Asha Rao');
  await page.getByLabel(copy.you.regno).fill('ra2211003010001');
  await page.getByLabel(copy.you.email).fill(' Asha@SRMIST.edu.in ');
  await page.getByLabel(copy.you.phone).fill('98765 43210');
  await page.getByLabel(copy.you.department).selectOption('CSE');
  await page.getByLabel(copy.you.section).fill('a1');

  expect(await page.getByLabel(copy.you.regno).inputValue()).toBe('RA2211003010001');
  expect(await page.getByLabel(copy.you.phone).inputValue()).toBe('9876543210');
  expect(await noHorizontalScroll(page)).toBe(true);
  await noAxeViolations(page);

  await next(page).click();
  await expect(page).toHaveURL(/\/apply\/domain$/);
  expect(checkBody).toEqual({ registerNumber: 'RA2211003010001', email: 'asha@srmist.edu.in' });
});

test('step 01: a taken register number blocks Next with the duplicate message', async ({ page }) => {
  taken = { registerNumberTaken: true, emailTaken: false };
  await page.goto('/apply/you');
  await seed(page, validYou);
  await page.reload();
  await next(page).click();
  await expect(page.getByText(copy.err.duplicate)).toBeVisible();
  await expect(page).toHaveURL(/\/apply\/you$/);
  await expect(page.getByLabel(copy.you.regno)).toBeFocused();
  await noAxeViolations(page);
});

test('step 01: errors show on blur and a failed Next shakes and focuses the first invalid field', async ({ page }) => {
  await page.goto('/apply/you');
  await page.getByLabel(copy.you.email).fill('nope');
  await page.getByLabel(copy.you.email).blur();
  await expect(page.getByText(copy.err.email)).toBeVisible();

  // The shake class lives for 150ms, too short to poll for on a busy machine, so record it as it is added.
  await page.locator('[data-field="name"]').evaluate((el) => {
    const w = window as unknown as { shook?: boolean };
    w.shook = false;
    new MutationObserver(() => {
      if (el.classList.contains('shake')) w.shook = true;
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  });
  await next(page).click();
  await expect(page.getByLabel(copy.you.name)).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { shook?: boolean }).shook)).toBe(true);
  await noAxeViolations(page);
});

test('step 01: controls are 16px+ and 52px+ tall (no iOS zoom, DSN-07)', async ({ page }) => {
  await page.goto('/apply/you');
  for (const label of [copy.you.name, copy.you.regno, copy.you.email, copy.you.phone, copy.you.department, copy.you.section]) {
    const box = await page.getByLabel(label).evaluate((el) => ({
      font: parseFloat(getComputedStyle(el).fontSize),
      height: el.getBoundingClientRect().height,
      radius: parseFloat(getComputedStyle(el).borderTopLeftRadius),
    }));
    expect(box.font, label).toBeGreaterThanOrEqual(16);
    expect(box.height, label).toBeGreaterThanOrEqual(52);
    expect(box.radius, label).toBeLessThanOrEqual(4);
  }
});

test('step 02a: pick two domains; Preference 2 hides the first pick; picking it as first clears the second', async ({ page }) => {
  await page.goto('/apply/you');
  await seed(page, validYou);
  await page.goto('/apply/domain');

  const pref1 = page.getByRole('combobox', { name: new RegExp(copy.domain.pref1) });
  const pref2 = page.getByRole('combobox', { name: new RegExp(copy.domain.pref2) });

  await pref1.click();
  const options = page.getByRole('option');
  await expect(options).toHaveCount(DOMAINS.length);
  for (const option of await options.all()) {
    const box = await option.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(64);
  }
  expect(await noHorizontalScroll(page)).toBe(true);
  await noAxeViolations(page);
  await page.getByRole('option', { name: /Design/ }).click();
  await expect(pref1).toContainText('Design');
  await expect(options).toHaveCount(0);

  await pref2.click();
  await expect(options).toHaveCount(DOMAINS.length - 1);
  await expect(page.getByRole('option', { name: /Design/ })).toHaveCount(0);
  await page.getByRole('option', { name: /Technical/ }).click();
  await expect(pref2).toContainText('Technical');

  await pref1.click();
  await page.getByRole('option', { name: /Technical/ }).click();
  await expect(pref2).toContainText(copy.domain.prompt);
  await expect(page.getByText(copy.domain.pref2Reset)).toBeVisible();

  await pref2.click();
  await page.getByRole('option', { name: /Media/ }).click();
  await next(page).click();
  await expect(page).toHaveURL(/\/apply\/about$/);
});

test('step 02a: hovering a row floods it with its domain color', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'hover is a desktop interaction');
  await page.goto('/apply/you');
  await seed(page, validYou);
  await page.goto('/apply/domain');
  await page.getByRole('combobox', { name: new RegExp(copy.domain.pref1) }).click();
  const row = page.getByRole('option', { name: /Web development/ });
  await row.hover();
  await expect(row).toHaveAttribute('data-engaged', 'true');
  await page.waitForTimeout(300);
  const flood = await row.evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
  expect(flood).toBe('rgb(233, 64, 47)'); // --red
});

test('step 02b: fill every field, the stack takes tags, Next moves on', async ({ page }) => {
  await page.goto('/apply/you');
  await seed(page, { ...validYou, ...validDomain });
  await page.goto('/apply/about');

  await expect(page.getByText(copy.about.notFound)).toBeVisible();
  await expect(page.getByRole('textbox', { name: fmt(copy.about.whyDomain, { domain: 'Technical' }) })).toBeVisible();

  const stack = page.getByLabel(copy.about.stack);
  await stack.fill('React');
  await stack.press('Enter');
  await stack.fill('Python,');
  await expect(page.getByRole('button', { name: fmt(copy.about.stackRemove, { tag: 'Python' }) })).toBeVisible();
  await stack.press('Backspace');
  await expect(page.getByRole('button', { name: fmt(copy.about.stackRemove, { tag: 'Python' }) })).toHaveCount(0);

  await page.getByRole('textbox', { name: copy.about.self }).fill(validAbout.aboutYou);
  await page.getByRole('textbox', { name: fmt(copy.about.whyDomain, { domain: 'Technical' }) }).fill(validAbout.whyDomain);
  await page.getByLabel(copy.about.skills).fill(validAbout.skills);
  await page.getByLabel(copy.about.outside).fill(validAbout.outsideAcademics);
  await page.getByLabel(copy.about.whyClub).fill(validAbout.whyAndropedia);
  expect(await noHorizontalScroll(page)).toBe(true);
  await noAxeViolations(page);

  await page.getByLabel(copy.about.oneYear).fill(validAbout.oneYearVision);
  await next(page).click();
  await expect(page).toHaveURL(/\/apply\/work$/);
});

test('step 02b: tags are square and the counter shows at 800 characters', async ({ page }) => {
  await page.goto('/apply/you');
  await seed(page, { ...validYou, ...validDomain, techStack: ['React'] });
  await page.goto('/apply/about');

  const radius = await page
    .getByRole('button', { name: fmt(copy.about.stackRemove, { tag: 'React' }) })
    .evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
  expect(radius).toBeLessThanOrEqual(2);

  const box = page.getByRole('textbox', { name: copy.about.self });
  await box.fill('x'.repeat(799));
  await expect(page.getByText('799 / 1000')).toHaveCount(0);
  await box.fill('x'.repeat(800));
  await expect(page.getByText('800 / 1000')).toBeVisible();
});

test('reduced motion: the invalid Next shake becomes an opacity pulse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/apply/you');
  await next(page).click();
  // The 150ms animation is over by the time we look, so apply the class and read the rule that wins.
  const animation = await page.locator('[data-field="name"]').evaluate((el) => {
    el.classList.add('shake');
    return getComputedStyle(el).animationName;
  });
  expect(animation).toBe('shake-calm');
});
