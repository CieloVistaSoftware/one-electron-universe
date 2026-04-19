/**
 * tooltip-alignment-test.js
 *
 * Tests that every tooltip opens correctly aligned to its parent bar.
 * Requires Playwright. Run with:
 *   node tooltip-alignment-test.js
 * or against live URL:
 *   node tooltip-alignment-test.js --live
 *
 * Pass criteria per person:
 *   1. Tip is visible (display !== none)
 *   2. Tip is within viewport bounds
 *   3. Tip left edge ≥ outerRect.left (inside or right of container)
 *   4. Tip top edge > outerRect.top (below container top edge)
 *   5. Tip top edge < outerRect.bottom (not below container)
 *   6. Debug [x,y] in tip name matches canvas coords computed in JS
 *   7. scrollLeft set to bxCanvas*zoom - REM (within ±2px)
 *   8. scrollTop  set to ryCanvas*zoom - REM (within ±2px)
 */

const PW_PATH = 'C:\\Users\\jwpmi\\Downloads\\VSCode\\projects\\cielovista-tools\\node_modules\\playwright';
const { chromium } = require(PW_PATH);
const path = require('path');

const LIVE_URL  = 'https://cielovistasoftware.github.io/one-electron-universe/JesusFamilyTree/';
const LOCAL_URL = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g,'/');
const USE_LIVE  = process.argv.includes('--live');
const URL       = USE_LIVE ? LIVE_URL : LOCAL_URL;

const TOLERANCE = 3; // px — rounding / subpixel tolerance

async function run() {
  console.log('\nJesusFamilyTree — Tooltip Alignment Test');
  console.log('='.repeat(60));
  console.log('URL:', URL);
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  // 1280x800 desktop viewport
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(URL, { waitUntil: 'networkidle' });

  // Wait for canvas to be painted
  await page.waitForFunction(() => {
    const cvs = document.getElementById('tlc');
    return cvs && cvs.width > 0;
  });

  // Enable debug mode so tip-name contains [x,y]
  await page.keyboard.press('Control+Shift+D');
  await page.waitForTimeout(100);

  // Get total people count and outer/viewport info
  const meta = await page.evaluate(() => ({
    count:      window._debug !== undefined ? window.people?.length ?? 0 : 0,
    debugOn:    window._debug,
    vw:         window.innerWidth,
    vh:         window.innerHeight,
    outerRect:  document.getElementById('chart-outer').getBoundingClientRect(),
  }));

  if (!meta.debugOn) {
    console.error('ERROR: debug mode did not enable — check Ctrl+Shift+D handler');
    await browser.close();
    process.exit(1);
  }

  const COUNT = meta.count;
  console.log(`People: ${COUNT}  |  Viewport: ${meta.vw}x${meta.vh}`);
  console.log(`chart-outer rect: left=${Math.round(meta.outerRect.left)} top=${Math.round(meta.outerRect.top)} right=${Math.round(meta.outerRect.right)} bottom=${Math.round(meta.outerRect.bottom)}`);
  console.log('');

  let passed = 0, failed = 0;
  const failures = [];

  for (let idx = 0; idx < COUNT; idx++) {
    // Call gotoIdx — this sets scroll + shows tip deterministically
    const result = await page.evaluate((i) => {
      window.gotoIdx(i);
      const tip    = document.getElementById('tip');
      const outer  = document.getElementById('chart-outer');
      const tipEl  = document.getElementById('tip-name');

      const tipRect   = tip.getBoundingClientRect();
      const outerRect = outer.getBoundingClientRect();
      const display   = window.getComputedStyle(tip).display;

      // Parse [x,y] from debug name  e.g. "[175,58] Adam"
      const nameText = tipEl ? tipEl.textContent : '';
      const coordMatch = nameText.match(/^\[(\d+),(\d+)\]\s+(.+)$/);

      return {
        display,
        tipRect:    { left: tipRect.left, top: tipRect.top, right: tipRect.right, bottom: tipRect.bottom },
        outerRect:  { left: outerRect.left, top: outerRect.top, right: outerRect.right, bottom: outerRect.bottom },
        scrollLeft: outer.scrollLeft,
        scrollTop:  outer.scrollTop,
        nameText,
        coordMatch: coordMatch ? [+coordMatch[1], +coordMatch[2], coordMatch[3]] : null,
        vw: window.innerWidth,
        vh: window.innerHeight,
        zoom: window.zoom,
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
        row: 30, // ROW constant
      };
    }, idx);

    const errs = [];

    // 1. Visible
    if (result.display === 'none') errs.push('tip display:none');

    // 2. Within viewport
    if (result.tipRect.left < 0)           errs.push(`tip.left ${Math.round(result.tipRect.left)} < 0`);
    if (result.tipRect.top  < 0)           errs.push(`tip.top ${Math.round(result.tipRect.top)} < 0`);
    if (result.tipRect.right  > result.vw) errs.push(`tip.right ${Math.round(result.tipRect.right)} > vw ${result.vw}`);
    if (result.tipRect.bottom > result.vh) errs.push(`tip.bottom ${Math.round(result.tipRect.bottom)} > vh ${result.vh}`);

    // 3. Tip left >= outer left
    if (result.tipRect.left < result.outerRect.left - TOLERANCE)
      errs.push(`tip.left ${Math.round(result.tipRect.left)} < outer.left ${Math.round(result.outerRect.left)}`);

    // 4. Tip top > outer top
    if (result.tipRect.top <= result.outerRect.top)
      errs.push(`tip.top ${Math.round(result.tipRect.top)} <= outer.top ${Math.round(result.outerRect.top)}`);

    // 5. Tip top < outer bottom
    if (result.tipRect.top >= result.outerRect.bottom)
      errs.push(`tip.top ${Math.round(result.tipRect.top)} >= outer.bottom ${Math.round(result.outerRect.bottom)}`);

    // 6. Debug coords present and match tip position
    if (!result.coordMatch) {
      errs.push(`no [x,y] in name: "${result.nameText}"`);
    } else {
      const [bxC, ryC, name] = result.coordMatch;
      // Expected scroll targets
      const expScrollLeft = Math.max(0, bxC * result.zoom - result.rem);
      const expScrollTop  = Math.max(0, ryC * result.zoom - result.rem);

      // 7. scrollLeft correct
      if (Math.abs(result.scrollLeft - expScrollLeft) > TOLERANCE)
        errs.push(`scrollLeft ${Math.round(result.scrollLeft)} expected ~${Math.round(expScrollLeft)} (bxC=${bxC} zoom=${result.zoom} REM=${result.rem})`);

      // 8. scrollTop correct
      if (Math.abs(result.scrollTop - expScrollTop) > TOLERANCE)
        errs.push(`scrollTop ${Math.round(result.scrollTop)} expected ~${Math.round(expScrollTop)} (ryC=${ryC})`);

      // 9. Tip left ≈ outerRect.left + REM (deterministic formula)
      const expTipLeft = result.outerRect.left + result.rem;
      if (Math.abs(result.tipRect.left - expTipLeft) > TOLERANCE + 1)
        errs.push(`tip.left ${Math.round(result.tipRect.left)} expected ~${Math.round(expTipLeft)} (outer.left + REM)`);

      // 10. Tip top ≈ outerRect.top + ROW*zoom + 2*REM
      const expTipTop = result.outerRect.top + result.row * result.zoom + 2 * result.rem;
      if (Math.abs(result.tipRect.top - expTipTop) > TOLERANCE + 1)
        errs.push(`tip.top ${Math.round(result.tipRect.top)} expected ~${Math.round(expTipTop)} (outer.top + ROW*zoom + 2*REM)`);
    }

    const ok = errs.length === 0;
    const name = result.coordMatch ? result.coordMatch[2] : `idx ${idx}`;
    const sym  = ok ? '✓' : '✗';
    const line = `  ${sym} [${String(idx).padStart(2)}] ${name.padEnd(22)} scroll=(${Math.round(result.scrollLeft)},${Math.round(result.scrollTop)}) tip=(${Math.round(result.tipRect.left)},${Math.round(result.tipRect.top)})`;

    if (ok) {
      passed++;
      if (idx % 10 === 0) console.log(line); // sample progress
    } else {
      failed++;
      console.log(line);
      errs.forEach(e => console.log(`       ↳ ${e}`));
      failures.push({ idx, name, errs });
    }
  }

  await browser.close();

  console.log('');
  console.log('='.repeat(60));
  console.log(`Result: ${passed} passed, ${failed} failed out of ${COUNT}`);
  if (failed === 0) {
    console.log('ALL PASS — every tooltip aligns correctly to its bar.');
  } else {
    console.log(`\nFailed persons (${failed}):`);
    failures.forEach(f => console.log(`  idx=${f.idx} ${f.name}: ${f.errs[0]}`));
  }
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
