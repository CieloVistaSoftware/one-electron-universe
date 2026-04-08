import { test, expect } from '@playwright/test';

test.describe('Website Generator preview flow', () => {
  test('opens preview modal after generation (mocked)', async ({ page }) => {
    await page.route('**/ai', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: JSON.stringify({
            title: 'Test Site',
            tagline: 'Tagline',
            introduction: 'Intro paragraph',
            concepts: [],
            timeline: [],
            cards: [],
            quotes: [],
            faq: [],
            footer: 'Footer',
          }),
        }),
      });
    });

    await page.route('**/save', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          path: 'generated/test-site/index.html',
          url: '/generated/test-site/index.html',
          slug: 'test-site',
        }),
      });
    });

    await page.goto('/');
    await page.click('#genbtn');

    await expect(page.locator('#preview-modal')).toHaveClass(/show/, { timeout: 10000 });
    await expect(page.locator('#p-save-btn')).toBeVisible();
  });

  test('auto mode falls back to OpenAI if Claude stalls', async ({ page }) => {
    await page.addInitScript(() => {
      window.__CV_REQUEST_TIMEOUT_MS = 400;
    });

    let sawOpenAIFallback = false;

    await page.route('**/ai', async (route) => {
      const req = route.request();
      const body = JSON.parse(req.postData() || '{}');

      if (body.provider === 'claude') {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ content: JSON.stringify({ title: 'Late Claude', tagline: '', introduction: 'late', concepts: [], timeline: [], cards: [], quotes: [], faq: [], footer: '' }) }),
        });
        return;
      }

      if (body.provider === 'openai') {
        sawOpenAIFallback = true;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: JSON.stringify({
            title: 'OpenAI Fallback',
            tagline: 'Recovered',
            introduction: 'Fallback content',
            concepts: [],
            timeline: [],
            cards: [],
            quotes: [],
            faq: [],
            footer: 'Done',
          }),
        }),
      });
    });

    await page.route('**/save', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          path: 'generated/fallback/index.html',
          url: '/generated/fallback/index.html',
          slug: 'fallback',
        }),
      });
    });

    await page.goto('/');
    await page.click('#genbtn');

    await expect(page.locator('#preview-modal')).toHaveClass(/show/, { timeout: 10000 });
    expect(sawOpenAIFallback).toBeTruthy();
  });
});
