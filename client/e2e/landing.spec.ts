import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { DOMAINS, copy } from '@andropedia/shared';

async function stubConfig(page: Page, recruitmentOpen: boolean) {
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { recruitmentOpen, whatsappUrl: 'https://chat.whatsapp.com/x' } }),
  );
}

const applyButtons = (page: Page) => page.getByRole('button', { name: copy.cta.apply });

test.beforeEach(async ({ page }) => {
  await stubConfig(page, true);
  await page.goto('/');
  await expect(applyButtons(page)).toHaveCount(2);
});

test('no horizontal scroll at this width', async ({ page }) => {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});

test('hero lines and Apply now fit on the first screen', async ({ page }) => {
  const viewport = page.viewportSize()!;
  const h1 = await page.getByRole('heading', { level: 1 }).boundingBox();
  const apply = await applyButtons(page).first().boundingBox();
  expect(h1!.x).toBeGreaterThanOrEqual(0);
  expect(h1!.x + h1!.width).toBeLessThanOrEqual(viewport.width);
  expect(apply!.y + apply!.height).toBeLessThanOrEqual(viewport.height);
});

test('lines 1 and 2 are the largest type on the page', async ({ page }) => {
  const sizes = await page.evaluate(() => {
    const px = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
    const h1Lines = Array.from(document.querySelectorAll('h1 > span')).map(px);
    const others = Array.from(document.querySelectorAll('body *'))
      .filter((el) => !el.closest('h1') && el.childNodes.length && Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim()))
      .map(px);
    return { big: Math.min(h1Lines[0]!, h1Lines[1]!), small: Math.max(h1Lines[2]!, h1Lines[3]!), restMax: Math.max(...others) };
  });
  expect(sizes.big).toBeGreaterThan(sizes.restMax);
  expect(sizes.small).toBeLessThan(sizes.big);
});

test('every button is at least 44px in both directions', async ({ page }) => {
  for (const button of await page.getByRole('button').all()) {
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
});

test('domain rows show icon, name and tagline in their color, and flood on hover or tap', async ({ page, isMobile }) => {
  const rows = page.locator('.domain-row');
  await expect(rows).toHaveCount(DOMAINS.length);

  for (const [i, domain] of DOMAINS.entries()) {
    const row = rows.nth(i);
    await expect(row.getByRole('heading', { level: 3 })).toHaveText(domain.name);
    await expect(row).toContainText(domain.tagline);
    await expect(row.locator('svg.domain-icon')).toBeVisible();
    const block = await row.locator('svg.domain-icon').evaluate((svg) => getComputedStyle(svg.parentElement!).backgroundColor);
    const token = await page.evaluate((c) => getComputedStyle(document.documentElement).getPropertyValue(`--${c}`).trim(), domain.color);
    expect(rgbToHex(block)).toBe(token.toLowerCase());
  }

  const row = rows.first();
  await row.scrollIntoViewIfNeeded();
  if (isMobile) await row.tap();
  else await row.hover();
  await expect(row).toHaveAttribute('data-engaged', 'true');
  await expect(row.locator('svg.domain-icon')).toHaveAttribute('data-play', 'true');
  // The flood is fully in after the base duration.
  await page.waitForTimeout(350);
  const flood = await row.evaluate((el) => getComputedStyle(el, '::before').transform);
  expect(flood === 'none' || flood === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
});

test('Apply now opens the Error 404 alertdialog; Esc closes it and focus returns', async ({ page }) => {
  const trigger = applyButtons(page).first();
  await trigger.click();
  const dialog = page.getByRole('alertdialog', { name: copy.modal.title });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription(copy.modal.body);
  await expect(page.getByRole('button', { name: copy.modal.continue })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('the modal traps focus', async ({ page }) => {
  await applyButtons(page).first().click();
  const close = page.getByRole('button', { name: copy.modal.close });
  const go = page.getByRole('button', { name: copy.modal.continue });
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(go).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(go).toBeFocused();
});

test('backdrop press closes the modal; the primary button goes to /apply/you', async ({ page }) => {
  await applyButtons(page).last().click();
  await page.mouse.click(4, 4);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  await applyButtons(page).first().click();
  await page.getByRole('button', { name: copy.modal.continue }).click();
  await expect(page).toHaveURL(/\/apply\/you$/);
});

test('no axe violations (WCAG 2.1 A and AA, including contrast), page and open modal', async ({ page }) => {
  const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
  const page1 = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(page1.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);

  await applyButtons(page).first().click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.waitForTimeout(500); // let the drop-in finish so contrast is measured on the final frame
  const modal = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(modal.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
});

test('closed state replaces every Apply now with the closed message (LND-08)', async ({ page }) => {
  await page.unroute('**/api/config');
  await stubConfig(page, false);
  await page.reload();
  await expect(page.getByText(copy.closed.body)).toHaveCount(2);
  await expect(applyButtons(page)).toHaveCount(0);
});

test('the final process step stamps in once scrolled into view', async ({ page }) => {
  const stamp = page.locator('.stamp');
  await expect(stamp).toHaveAttribute('data-in', 'false');
  await page.getByText(copy.process.steps[4]).scrollIntoViewIfNeeded();
  await expect(stamp).toHaveAttribute('data-in', 'true');
  await expect(stamp).toBeVisible();
});

test('screenshot', async ({ page }, info) => {
  // Bring the stamp in first so the full-page capture shows the final state.
  await page.getByText(copy.process.steps[4]).scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `e2e/.results/landing-${info.project.name}.png`, fullPage: true });
  await page.screenshot({ path: `e2e/.results/landing-${info.project.name}-fold.png` });
});

function rgbToHex(rgb: string) {
  const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
  return `#${[r, g, b].map((n) => n!.toString(16).padStart(2, '0')).join('')}`;
}
