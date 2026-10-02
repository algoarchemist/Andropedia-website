import { defineConfig } from '@playwright/test';

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
  ],
});
