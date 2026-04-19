/**
 * click-tooltip-test.cjs — Suite C
 *
 * Tests showTipInPlace(idx) — the function called by real bar clicks.
 * Verifies:
 *   - tooltip.top == barBottomScreen + 1rem  (or clamped to fit viewport)
 *   - NO scroll change during tip display
 *   - correct person shown
 *   - tip is within viewport
 *
 * Strategy:
 *   1. gotoIdx(idx)  — bar at top of container, scroll settled
 *   2. setSuppressScroll(true) THEN decrease scrollTop 120px THEN wait 200ms
 *      (scroll event fires and is suppressed so gotoIdx for wrong person is blocked)
 *   3. setSuppressScroll(false)
 *   4. Snapshot bar's screen position (now 120px lower = in middle of view)
 *   5. Call showTipInPlace(idx) directly
 *   6. Verify requirements above
 */
const PW_PATH = 'C:\\Users\\jwpmi\\Downloads\\VSCode\\projects\\cielovista-tools\\node_modules\\playwright';
const { chromium } = require(PW_PATH);
const path = require('path');
const URL = process.argv.includes('--live')
  ? 'https://cielovistasoftware.github.io/one-electron-universe/JesusFamilyTree/'
  : 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const TOL = 5;

async function run(){
  console.log('\nJesusFamilyTree — Suite C: showTipInPlace position test');
  console.log('='.repeat(60));
  console.log('Requirement: tip.top == barBottomScreen + 1rem (or clamped), NO scroll change');
  console.log('URL:', URL, '\n');

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('tlc')?.width > 0);
  await page.evaluate(() => window.setDebug(true));
  await page.waitForTimeout(200);

  const COUNT = await page.evaluate(() => window.getPeople().length);
  // Test every 7th person
  const testIdxs = Array.from({ length: COUNT }, (_, i) => i).filter(i => i % 7 === 0);
  console.log(`Testing ${testIdxs.length} people (every 7th of ${COUNT})\n`);

  let pass = 0, fail = 0;
  const failures = [];

  for(const idx of testIdxs){
    // Step 1: gotoIdx → bar is at outerTop + REM on screen
    await page.evaluate((i) => window.gotoIdx(i), idx);
    await page.waitForTimeout(80);

    // Step 2: suppress scroll listener THEN shift scrollTop down 120px THEN wait
    // This puts the bar 120px lower on screen (middle of container)
    await page.evaluate(() => window.setSuppressScroll(true));
    await page.evaluate(() => {
      const o = document.getElementById('chart-outer');
      o.scrollTop = Math.max(0, o.scrollTop - 120);
    });
    await page.waitForTimeout(200);  // scroll event fires and is suppressed here
    await page.evaluate(() => window.setSuppressScroll(false));
    await page.waitForTimeout(50);

    // Step 3: snapshot bar screen position using live scroll (no changes made yet)
    const before = await page.evaluate((i) => {
      const o  = document.getElementById('chart-outer');
      const or = o.getBoundingClientRect();
      const p  = window.getPeople()[i];
      const z  = window.zoom || 1;
      const r  = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const ROW = 30, LPAD = 175, YS = -4100, YE = 130, CVS_W = 5000;
      function yx(yr){ return LPAD + (yr-YS)*(CVS_W-LPAD-50)/(YE-YS); }
      function rowY(n){
        const ss = new Set([0,10,19,25,34,38,54,65]);
        let y = 58;
        for(let j=0;j<n;j++){ if(ss.has(j)) y+=22; y+=35; }
        return y;
      }
      const bxC = Math.max(yx(p.b), LPAD);
      const ryC = rowY(i);
      const st  = o.scrollTop, sl = o.scrollLeft;
      const barTop    = or.top  + ryC * z - st;
      const barBottom = barTop + ROW * z;
      return { st, sl, barTop, barBottom, rem:r, ROW, z,
               outerTop:or.top, outerBottom:or.bottom,
               vh:window.innerHeight, vw:window.innerWidth, name:p.n };
    }, idx);

    // Step 4: call showTipInPlace directly (this is what a bar click calls)
    await page.evaluate((i) => window.showTipInPlace(i), idx);
    await page.waitForTimeout(60);

    // Step 5: read tip state
    const after = await page.evaluate(() => {
      const t  = document.getElementById('tip');
      const o  = document.getElementById('chart-outer');
      const tn = document.getElementById('tip-name');
      const tr = t.getBoundingClientRect();
      return {
        display:  window.getComputedStyle(t).display,
        tipTop:   tr.top, tipBottom:tr.bottom,
        tipLeft:  tr.left, tipRight: tr.right,
        tipH:     t.offsetHeight,
        st: o.scrollTop, sl: o.scrollLeft,
        tipName: (tn?.textContent ?? '').replace(/^\[\d+,\d+\]\s+/,''),
        vh: window.innerHeight, vw: window.innerWidth,
      };
    });

    const errs = [];
    const { rem, ROW, z, barBottom } = before;
    const first = before.name.split(' ')[0];

    // a. Visible
    if(after.display === 'none')
      errs.push('tip hidden');

    // b. Correct person
    if(after.display !== 'none' && !after.tipName.includes(first))
      errs.push(`tip shows "${after.tipName}", expected "${before.name}"`);

    // c. No scroll change
    if(Math.abs(after.st - before.st) > 2)
      errs.push(`scrollTop changed ${Math.round(before.st)}→${Math.round(after.st)} (delta ${Math.round(after.st-before.st)}px)`);
    if(Math.abs(after.sl - before.sl) > 2)
      errs.push(`scrollLeft changed ${Math.round(before.sl)}→${Math.round(after.sl)}`);

    // d. tip.top = barBottom + 1rem (clamped)
    if(after.display !== 'none'){
      const ideal   = barBottom + rem;
      const clamped = Math.max(rem, Math.min(ideal, after.vh - after.tipH - rem));
      if(Math.abs(after.tipTop - clamped) > TOL)
        errs.push(`tip.top ${Math.round(after.tipTop)} ≠ ~${Math.round(clamped)} (barBottom=${Math.round(barBottom)} +1rem=${Math.round(ideal)}, tipH=${after.tipH})`);
    }

    // e. Within viewport
    if(after.display !== 'none'){
      if(after.tipTop    < 0)                errs.push(`tip.top ${Math.round(after.tipTop)} < 0`);
      if(after.tipBottom > after.vh + TOL)    errs.push(`tip.bottom ${Math.round(after.tipBottom)} > vh`);
      if(after.tipRight  > after.vw + TOL)    errs.push(`tip.right ${Math.round(after.tipRight)} > vw`);
    }

    const ok  = errs.length === 0;
    const det = after.display === 'none' ? 'HIDDEN'
      : `tip.top=${Math.round(after.tipTop)} barBottom=${Math.round(barBottom)} +1rem=~${Math.round(barBottom+rem)} (tipH=${after.tipH})`;
    console.log(`  ${ok?'✓':'✗'} [${String(idx).padStart(2)}] ${before.name.padEnd(24)} ${det}`);
    if(!ok) errs.forEach(e => console.log(`       ↳ FAIL: ${e}`));

    if(ok) pass++; else { fail++; failures.push({ idx, name:before.name, errs }); }
  }

  await browser.close();
  console.log('\n' + '='.repeat(60));
  console.log(`${pass} passed  |  ${fail} failed  |  ${testIdxs.length} tested`);
  if(fail === 0)
    console.log('ALL PASS — showTipInPlace places tooltip 1rem below bar, no scroll change.');
  else {
    console.log('\nFailures:');
    failures.forEach(f => { console.log(`  [${f.idx}] ${f.name}`); f.errs.forEach(e => console.log(`    ${e}`)); });
  }
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(err => { console.error('Runner error:', err); process.exit(1); });
