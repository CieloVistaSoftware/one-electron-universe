// playwright.config.js
// Playwright configuration for CieloVista AI Website Generator
// Docs: https://playwright.dev/docs/test-configuration
const path = require('path');

const siteSlug = process.env.CV_SITE_SLUG || '_shared';
const artifactsDir = path.join('generated', siteSlug, 'artifacts');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: 'tests',
  timeout: 30000,
  retries: 0,
  outputDir: path.join(artifactsDir, 'tests'),
  reporter: [
    ['line'],
    ['html', { outputFolder: path.join(artifactsDir, 'playwright-report'), open: 'never' }],
  ],
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      PORT: '3100',
      NO_OPEN_BROWSER: '1',
      NODE_ENV: 'test',
      GENERATED_DIR: path.join(process.cwd(), 'generated'),
      CV_SITE_SLUG: '_shared',
    },
  },
  use: {
    headless: true,
    baseURL: 'http://localhost:3100',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
};

module.exports = config;
