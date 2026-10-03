import { defineConfig, devices } from '@playwright/test';

// Runs against the production build served by `vite preview`, in the locally installed Chrome (no browser download).
// DSN-10: design at 360, check 390 and 430, then desktop at 1280.
const mobile = { isMobile: true, hasTouch: true, deviceScaleFactor: 3 };

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile-360', use: { ...mobile, viewport: { width: 360, height: 640 } } },
    { name: 'mobile-390', use: { ...mobile, viewport: { width: 390, height: 844 } } },
    { name: 'mobile-430', use: { ...mobile, viewport: { width: 430, height: 932 } } },
    { name: 'desktop-1280', use: { viewport: { width: 1280, height: 800 } } },
    // NFR-05: the happy path and duplicate submit on Pixel 7 and iPhone 14 emulation. WebKit is not installed here, so
    // the iPhone runs in Chrome with the iPhone 14 viewport, touch, scale and user agent (logged in DECISIONS).
    { name: 'pixel-7', testMatch: /submit\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'iphone-14', testMatch: /submit\.spec\.ts/, use: { ...devices['iPhone 14'], browserName: 'chromium' } },
  ],
});
