// Phase 8: every row of the DSN-08 micro-interaction table, its reduced-motion form, and DSN-10 touch targets.
import { expect, test, type Page } from '@playwright/test';
import { DOMAINS, DRAFT_KEY, copy } from '@andropedia/shared';
import { validThroughUs, validYou } from '../src/test/fixtures';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64',
);

/** DSN-08 table: the part of each domain icon that moves, and the keyframes it runs. */
const ICON_MOTION: Record<string, [selector: string, keyframes: string]> = {
  terminal: ['.ico-cursor', 'ico-blink'],
  browser: ['.ico-bar', 'ico-slide'],
  clapper: ['.ico-clap', 'ico-snap'],
  megaphone: ['.ico-wave', 'ico-emit'],
  pen: ['.ico-squiggle', 'ico-draw'],
  bulb: ['.ico-lit', 'ico-flicker'],
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { recruitmentOpen: true, whatsappUrl: 'https://chat.whatsapp.com/x' } }),
  );
  await page.route('**/api/applications/check', (route) =>
    route.fulfill({ json: { registerNumberTaken: false, emailTaken: false } }),
  );
  await page.route('**/stub-photo.png', (route) => route.fulfill({ body: PNG, contentType: 'image/png' }));
});

async function seedDraft(page: Page, data: object) {
  await page.goto('/apply/you');
  await page.evaluate(([key, value]) => window.localStorage.setItem(key!, value!), [DRAFT_KEY, JSON.stringify(data)]);
}

/** Puts `className` (and data attributes) on a scratch element and reads the animation the stylesheet gives it. */
function animationFor(page: Page, className: string, data: Record<string, string> = {}) {
  return page.evaluate(
    ([cls, attrs]) => {
      const el = document.createElement('div');
      el.className = cls;
      for (const [k, v] of Object.entries(attrs)) el.dataset[k] = v;
      document.body.append(el);
      const name = getComputedStyle(el).animationName;
      el.remove();
      return name;
    },
    [className, data] as const,
  );
}

test('every domain icon plays its own animation when its row is engaged', async ({ page, isMobile }) => {
  await page.goto('/');
  const rows = page.locator('.domain-row');
  for (const [i, domain] of DOMAINS.entries()) {
    const row = rows.nth(i);
    await row.scrollIntoViewIfNeeded();
    if (isMobile) await row.tap();
    else await row.hover();
    const icon = row.locator('svg.domain-icon');
    await expect(icon).toHaveAttribute('data-play', 'true');
    const [selector, keyframes] = ICON_MOTION[domain.icon]!;
    expect(await icon.locator(selector).first().evaluate((el) => getComputedStyle(el).animationName)).toBe(keyframes);
  }
});

test('motion tokens match DSN-08: fast 150ms, base 250ms, slow 400ms, one easing curve', async ({ page }) => {
  await page.goto('/');
  // Resolve each token through a real transition, so the minifier's spelling (.15s) does not matter.
  const tokens = await page.evaluate(() =>
    ['--motion-fast', '--motion-base', '--motion-slow'].map((t) => {
      const el = document.createElement('div');
      el.style.transition = `opacity var(${t}) var(--ease)`;
      document.body.append(el);
      const { transitionDuration, transitionTimingFunction } = getComputedStyle(el);
      el.remove();
      return `${transitionDuration} ${transitionTimingFunction}`;
    }),
  );
  const ease = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
  expect(tokens).toEqual([`0.15s ${ease}`, `0.25s ${ease}`, `0.4s ${ease}`]);
});

test('the rest of the table: modal drop, tile drop, stage stamp, shake', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: copy.cta.apply }).first().click();
  expect(await page.locator('.modal-box').evaluate((el) => getComputedStyle(el).animationName)).toBe('modal-drop');
  expect(await animationFor(page, 'wall-tile', { fresh: 'true' })).toBe('tile-drop');
  expect(await animationFor(page, 'stamp', { in: 'true' })).toBe('stamp-land');
  expect(await animationFor(page, 'pick-stamp', { fresh: 'true' })).toBe('stamp-land');
  expect(await animationFor(page, 'shake')).toBe('shake');
});

test.describe('prefers-reduced-motion: reduce', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('domain rows fade instead of sliding, and icons stay still', async ({ page, isMobile }) => {
    await page.goto('/');
    const row = page.locator('.domain-row').first();
    // The flood layer never moves: it is always full width and only its opacity changes.
    expect(await row.evaluate((el) => getComputedStyle(el, '::before').transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await row.scrollIntoViewIfNeeded();
    if (isMobile) await row.tap();
    else await row.hover();
    await expect(row.locator('svg.domain-icon')).toHaveAttribute('data-play', 'true');
    expect(await row.locator('.ico-cursor').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });

  test('Apply now does not press in; the modal, tiles and stamps fade; the shake becomes a pulse', async ({ page }) => {
    await page.goto('/');
    const apply = page.getByRole('button', { name: copy.cta.apply }).first();
    expect(await apply.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('none');
    await apply.click();
    expect(await page.locator('.modal-box').evaluate((el) => getComputedStyle(el).animationName)).toBe('fade-in');
    expect(await animationFor(page, 'wall-tile', { fresh: 'true' })).toBe('fade-in');
    expect(await animationFor(page, 'stamp', { in: 'true' })).toBe('fade-in');
    expect(await animationFor(page, 'pick-stamp', { fresh: 'true' })).toBe('fade-in');
    expect(await animationFor(page, 'shake')).toBe('shake-calm');
  });

  test('a completed stage stamp only fades in: no scale, no change of angle', async ({ page }) => {
    await seedDraft(page, validYou);
    await page.goto('/apply/you');
    // Record every transform the new stamp passes through while it lands.
    const seen = page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const out = new Set<string>();
          const start = performance.now();
          const tick = () => {
            const stamp = document.querySelector<HTMLElement>('nav [data-stamp]');
            if (stamp) out.add(stamp.style.transform);
            if (performance.now() - start < 1500) requestAnimationFrame(tick);
            else resolve([...out]);
          };
          tick();
        }),
    );
    await page.getByRole('button', { name: copy.nav.next }).click();
    const transforms = await seen;
    expect(transforms.length).toBeGreaterThan(0);
    expect(transforms.join(' ')).not.toContain('scale');
    expect(new Set(transforms.map((t) => t.match(/rotate\(([^)]+)\)/)?.[1] ?? 'none')).size).toBe(1);
  });
});

test('DSN-10: every control on every form step is at least 44px in both directions', async ({ page }) => {
  await seedDraft(page, { ...validThroughUs, inOtherClub: true, otherClubs: 'Coding club', rememberUs: 'Hello.' });
  for (const step of ['you', 'domain', 'about', 'work', 'us', 'last']) {
    await page.goto(`/apply/${step}`);
    await expect(page).toHaveURL(new RegExp(`/apply/${step}$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const small = await page.evaluate(() => {
      const controls = [...document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [role="combobox"]')];
      return controls
        .filter((el) => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'))
        .map((el) => {
          // A visually hidden radio is operated through its label (APP-05 Yes/No).
          const target = el.matches('input[type="radio"]') ? (el.closest('label') ?? el) : el;
          const r = target.getBoundingClientRect();
          return { what: `${target.tagName} ${target.textContent?.trim().slice(0, 20) || target.getAttribute('aria-label') || ''}`, w: r.width, h: r.height };
        })
        .filter((c) => c.w < 44 || c.h < 44);
    });
    expect(small, `/apply/${step}`).toEqual([]);
  }
});
