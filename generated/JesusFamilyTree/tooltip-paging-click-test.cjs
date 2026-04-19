/**
 * tooltip-paging-click-test.cjs
 *
 * Suite P — PageDown / PageUp: verify tooltip tracks correctly through keyboard paging
 * Suite C — Click:  simulate real click on visible bar, verify correct tooltip
 *
 * Run: node tooltip-paging-click-test.cjs
 *      node tooltip-paging-click-test.cjs --live
 */
const PW_PATH = 'C:\\Users\\jwpmi\\Downloads\\VSCode\\projects\\cielovista-tools\\node_modules\\playwright';
const { chromium } = require(PW_PATH);
const path = require('path');

const LIVE_URL  = 'https://cielovistasoftware.github.io/one-electron-universe/JesusFamilyTree/';
const LOCAL_URL = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const USE_LIVE  = process.argv.includes('--live');
const URL       = USE_LIVE ? LIVE_URL : LOCAL_URL;
const TOL       = 6;

// ─── helpers ─────────────────────────────────────────────────────────────────

function tipOk(r) {
  const errs = [];
  if (r.display === 'none')                          errs.push('tip hidden');
  if (r.tipRect.left   < 0)                         errs.push(`tip.left ${Math.round(r.tipRect.left)} < 0`);
  if (r.tipRect.top    < 0)                         errs.push(`tip.top ${Math.round(r.tipRect.top)} < 0`);
  if (r.tipRect.right  > r.vw + TOL)                errs.push(`tip.right ${Math.round(r.tipRect.right)} > vw`);
  if (r.tipRect.bottom > r.vh + TOL)                errs.push(`tip.bottom ${Math.round(r.tipRect.bottom)} > vh`);
  if (r.tipRect.top    >= r.outerRect.bottom)       errs.push('tip below container');
  if (!r.tipName)                                   errs.push('no tip name text');
  return errs;
}

async function snapState(page) {
  return page.evaluate(() => {
    const tip      = document.getElementById('tip');
    const outer    = document.getElementById('chart-outer');
    const tipName  = document.getElementById('tip-name');
    const tipRect  = tip.getBoundingClientRect();
    const outerRect = outer.getBoundingClientRect();
    return {
      display:    window.getComputedStyle(tip).display,
      tipRect:    { left: tipRect.left, top: tipRect.top, right: tipRect.right, bottom: tipRect.bottom },
      outerRect:  { left: outerRect.left, top: outerRect.top, right: outerRect.right, bottom: outerRect.bottom },
      scrollTop:  outer.scrollTop,
      scrollLeft: outer.scrollLeft,
      tipName:    (tipName?.textContent ?? '').replace(/^\[\d+,\d+\]\s+/, ''),
      visRow:     window._scrollTipRow ?? -1,
      vw: window.innerWidth, vh: window.innerHeight,
    };
  });
}

async function run() {
  console.log('\nJesusFamilyTree — Page/Click Test Suite');
  console.log('='.repeat(60));
  console.log('URL:', URL, '\n');

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('tlc')?.width > 0);
  await page.evaluate(() => window.setDebug(true));
  await page.waitForTimeout(200);

  const COUNT = await page.evaluate(() => window.getPeople().length);
  console.log(`People: ${COUNT}\n`);

  // ── SUITE P: PageDown / PageUp ─────────────────────────────────────────────
  console.log('SUITE P — PageDown / PageUp keyboard paging');
  console.log('-'.repeat(60));

  let pPass = 0, pFail = 0;
  const pFailures = [];

  // Start at person 0
  await page.evaluate(() => window.gotoIdx(0));
  await page.waitForTimeout(100);

  // Focus the chart-outer so keyboard events go to it
  await page.evaluate(() => document.getElementById('chart-outer').focus());

  let prevRow = -1;
  let prevScrollTop = -1;

  // Press PageDown 8 times, recording results
  for (let press = 0; press < 8; press++) {
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(150);

    const s = await snapState(page);
    const errs = tipOk(s);

    // PageDown should advance the visible row (or stay clamped at end)
    if (s.visRow <= prevRow && s.scrollTop <= prevScrollTop && s.visRow < COUNT - 1)
      errs.push(`row did not advance: visRow=${s.visRow} prevRow=${prevRow}`);

    const ok = errs.length === 0;
    const sym = ok ? '✓' : '✗';
    console.log(`  ${sym} PageDown #${press+1}: row=${s.visRow} scrollTop=${Math.round(s.scrollTop)} tip="${s.tipName}"`);
    if (!ok) errs.forEach(e => console.log(`       ↳ ${e}`));
    if (ok) pPass++; else { pFail++; pFailures.push({ op: `PageDown#${press+1}`, row: s.visRow, errs }); }

    prevRow      = s.visRow;
    prevScrollTop = s.scrollTop;
  }

  // Now PageUp 8 times — should go back toward the start
  prevRow = await page.evaluate(() => window._scrollTipRow ?? 0);
  prevScrollTop = await page.evaluate(() => document.getElementById('chart-outer').scrollTop);

  for (let press = 0; press < 8; press++) {
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(150);

    const s = await snapState(page);
    const errs = tipOk(s);

    if (s.visRow >= prevRow && s.scrollTop >= prevScrollTop && s.visRow > 0)
      errs.push(`row did not retreat: visRow=${s.visRow} prevRow=${prevRow}`);

    const ok = errs.length === 0;
    const sym = ok ? '✓' : '✗';
    console.log(`  ${sym} PageUp   #${press+1}: row=${s.visRow} scrollTop=${Math.round(s.scrollTop)} tip="${s.tipName}"`);
    if (!ok) errs.forEach(e => console.log(`       ↳ ${e}`));
    if (ok) pPass++; else { pFail++; pFailures.push({ op: `PageUp#${press+1}`, row: s.visRow, errs }); }

    prevRow       = s.visRow;
    prevScrollTop = s.scrollTop;
  }

  console.log(`\nSuite P: ${pPass} passed, ${pFail} failed\n`);

  // ── SUITE C: real click on visible bars ────────────────────────────────────
  console.log('SUITE C — Real DOM click on visible bar elements');
  console.log('-'.repeat(60));
  console.log('(Tests 10 evenly spaced people: navigates to each, then clicks the highlighted bar)');
  console.log('');

  let cPass = 0, cFail = 0;
  const cFailures = [];

  // Test 10 evenly-spaced people
  const testIdxs = Array.from({ length: 10 }, (_, i) => Math.floor(i * COUNT / 10));

  for (const idx of testIdxs) {
    // Navigate to the person first (puts bar at known screen position)
    await page.evaluate((i) => window.gotoIdx(i), idx);
    await page.waitForTimeout(80);

    // Get the bar's screen coordinates
    const barCoords = await page.evaluate((i) => {
      const outer = document.getElementById('chart-outer');
      const cvs   = document.getElementById('tlc');
      const outerRect = outer.getBoundingClientRect();
      const p     = window.getPeople()[i];
      const LPAD  = 175, YS = -4100, YE = 130, CVS_W = 5000;
      function yx(yr) { return LPAD + (yr - YS) * (CVS_W - LPAD - 50) / (YE - YS); }
      function getRowY(idx) {
        const sections = [0,10,19,25,34,38,54,65];
        let y = 58;
        for (let j = 0; j < idx; j++) { if (sections.includes(j)) y += 22; y += 35; }
        return y;
      }
      const bxC    = Math.max(yx(p.b), LPAD);
      const ryC    = getRowY(i);
      const zoom   = window.zoom || 1;
      // Screen coords of bar center
      const screenX = outerRect.left + bxC * zoom - outer.scrollLeft + 20;
      const screenY = outerRect.top  + (ryC + 15) * zoom - outer.scrollTop;
      return { screenX, screenY, expectedName: p.n, bxC: Math.round(bxC), ryC: Math.round(ryC) };
    }, idx);

    // Only click if bar is within viewport
    if (barCoords.screenX < 16 || barCoords.screenX > 1264 ||
        barCoords.screenY < 303 || barCoords.screenY > 923) {
      console.log(`  ~ [${String(idx).padStart(2)}] ${barCoords.expectedName.padEnd(24)} bar off-screen (${Math.round(barCoords.screenX)},${Math.round(barCoords.screenY)}) — skip`);
      continue;
    }

    // First close any existing tooltip
    await page.evaluate(() => { document.getElementById('tip').style.display = 'none'; });

    // Click the bar
    await page.mouse.click(barCoords.screenX, barCoords.screenY);
    await page.waitForTimeout(100);

    const s = await snapState(page);
    const errs = tipOk(s);

    // Verify the tip shows the right person
    const expectedFirst = barCoords.expectedName.split(' ')[0];
    if (!s.tipName.includes(expectedFirst))
      errs.push(`tip shows "${s.tipName}", expected "${barCoords.expectedName}"`);

    // Verify tip is positioned below/near the bar
    if (s.tipRect.top < s.outerRect.top - 5)
      errs.push(`tip.top ${Math.round(s.tipRect.top)} is above container top ${Math.round(s.outerRect.top)}`);

    const ok = errs.length === 0;
    const sym = ok ? '✓' : '✗';
    console.log(`  ${sym} [${String(idx).padStart(2)}] ${barCoords.expectedName.padEnd(24)} bar=(${Math.round(barCoords.screenX)},${Math.round(barCoords.screenY)}) tip="${s.tipName}" tip.top=${Math.round(s.tipRect.top)}`);
    if (!ok) errs.forEach(e => console.log(`       ↳ ${e}`));
    if (ok) cPass++; else { cFail++; cFailures.push({ idx, name: barCoords.expectedName, errs }); }
  }

  console.log(`\nSuite C: ${cPass} passed, ${cFail} failed\n`);

  await browser.close();

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('='.repeat(60));
  const totalFail = pFail + cFail;
  if (totalFail === 0) {
    console.log(`ALL PASS — Suite P: ${pPass}/16 page ops  Suite C: ${cPass}/${testIdxs.length} clicks`);
  } else {
    if (pFail) { console.log(`\nSuite P failures:`); pFailures.forEach(f => console.log(`  ${f.op} row=${f.row}: ${f.errs[0]}`)); }
    if (cFail) { console.log(`\nSuite C failures:`); cFailures.forEach(f => console.log(`  [${f.idx}] ${f.name}: ${f.errs[0]}`)); }
  }
  console.log('');
  process.exit(totalFail > 0 ? 1 : 0);
}

run().catch(err => { console.error('Runner error:', err); process.exit(1); });
