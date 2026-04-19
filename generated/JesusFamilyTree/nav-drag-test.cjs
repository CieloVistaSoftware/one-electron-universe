/**
 * nav-drag-test.cjs — Suite P (prev/next all 77) + Suite D (horizontal drag)
 *
 * Suite P: For every person 0..76, after gotoIdx(i):
 *   - Verify correct person shown, tip at canonical position
 *   - Click → button: person i+1 shown, SAME position (within TOL)
 *   - Click ← button: person i-1 shown, SAME position (within TOL)
 *   (boundaries: no prev for Adam, no next for Jude)
 *
 * Suite D: Drag the canvas right 400px after gotoIdx(16).
 *   - Tooltip position must NOT change (repositionTip uses fixed formula).
 *   - scrollLeft must be non-zero (drag actually moved).
 *   - scrollTop must NOT change (no vertical scroll during horizontal drag).
 *
 * Canonical tip position (after gotoIdx):
 *   ty = outerTop + clientH/2 + ROW*zoom/2 + REM  (clamped to vh)
 *   tx = outerLeft + REM
 */
const PW_PATH = 'C:\\Users\\jwpmi\\Downloads\\VSCode\\projects\\cielovista-tools\\node_modules\\playwright';
const { chromium } = require(PW_PATH);
const path = require('path');

const URL = process.argv.includes('--live')
  ? 'https://cielovistasoftware.github.io/one-electron-universe/JesusFamilyTree/'
  : 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const TOL = 6;

async function tipState(page){ 
  return page.evaluate(()=>{
    const t  = document.getElementById('tip');
    const tn = document.getElementById('tip-name');
    const tr = t.getBoundingClientRect();
    const o  = document.getElementById('chart-outer');
    return {
      display:   window.getComputedStyle(t).display,
      tipTop:    tr.top, tipBottom: tr.bottom, tipLeft: tr.left, tipRight: tr.right,
      tipH:      t.offsetHeight,
      tipName:   (tn?.textContent??'').replace(/^\[\d+,\d+\]\s+/,'').trim(),
      scrollTop: o.scrollTop, scrollLeft: o.scrollLeft,
      vh: window.innerHeight, vw: window.innerWidth,
      outerTop: o.getBoundingClientRect().top,
      clientH:  o.clientHeight,
      rem:      parseFloat(getComputedStyle(document.documentElement).fontSize)||16,
    };
  });
}

function canonicalTipTop(s){
  const ROW=30, zoom=1;
  const ideal = s.outerTop + s.clientH/2 + ROW*zoom/2 + s.rem;
  return Math.max(s.rem, Math.min(ideal, s.vh - s.tipH - s.rem));
}

async function run(){
  console.log('\nJesusFamilyTree — Suite P (prev/next) + Suite D (drag)');
  console.log('='.repeat(60));
  console.log('URL:', URL, '\n');

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('tlc')?.width > 0);
  await page.waitForTimeout(200);

  const COUNT = await page.evaluate(() => window.getPeople().length);
  const people = await page.evaluate(() => window.getPeople().map(p=>p.n));

  // ────────────────────────────────────────────────────────────────────────────
  // SUITE P — Prev / Next button navigation for all 77 people
  // ────────────────────────────────────────────────────────────────────────────
  console.log(`SUITE P — Prev/Next buttons for all ${COUNT} people`);
  console.log('-'.repeat(60));

  let pPass=0, pFail=0;
  const pFails=[];

  for(let i=0;i<COUNT;i++){
    // Open person i
    await page.evaluate((idx)=>window.gotoIdx(idx), i);
    await page.waitForTimeout(60);
    const base = await tipState(page);

    const errs=[];
    const expName = people[i];

    // Check base state
    if(base.display === 'none') errs.push('tip hidden after gotoIdx');
    if(!base.tipName.includes(expName.split(' ')[0])) errs.push(`tip shows "${base.tipName}" expected "${expName}"`);
    if(base.scrollLeft !== 0) errs.push(`scrollLeft=${base.scrollLeft} != 0 after gotoIdx`);
    const expTipTop = canonicalTipTop(base);
    if(Math.abs(base.tipTop - expTipTop) > TOL) errs.push(`gotoIdx tipTop ${Math.round(base.tipTop)} != ~${Math.round(expTipTop)}`);

    // Test → (next) button
    if(i < COUNT-1){
      await page.click('#tip-next');
      await page.waitForTimeout(60);
      const nxt = await tipState(page);
      const expN = people[i+1];
      if(nxt.display === 'none') errs.push('tip hidden after →');
      else if(!nxt.tipName.includes(expN.split(' ')[0])) errs.push(`→ shows "${nxt.tipName}" expected "${expN}"`);
      // Position must stay at canonical location
      const expNxtTop = canonicalTipTop(nxt);
      if(nxt.display !== 'none' && Math.abs(nxt.tipTop - expNxtTop) > TOL)
        errs.push(`→ tipTop ${Math.round(nxt.tipTop)} != ~${Math.round(expNxtTop)} (canonical)`);
      if(nxt.scrollLeft !== 0) errs.push(`→ scrollLeft=${nxt.scrollLeft} != 0`);
    }

    // Go back to person i, then test ← (prev) button
    await page.evaluate((idx)=>window.gotoIdx(idx), i);
    await page.waitForTimeout(60);

    if(i > 0){
      await page.click('#tip-prev');
      await page.waitForTimeout(60);
      const prv = await tipState(page);
      const expP = people[i-1];
      if(prv.display === 'none') errs.push('tip hidden after ←');
      else if(!prv.tipName.includes(expP.split(' ')[0])) errs.push(`← shows "${prv.tipName}" expected "${expP}"`);
      const expPrvTop = canonicalTipTop(prv);
      if(prv.display !== 'none' && Math.abs(prv.tipTop - expPrvTop) > TOL)
        errs.push(`← tipTop ${Math.round(prv.tipTop)} != ~${Math.round(expPrvTop)} (canonical)`);
      if(prv.scrollLeft !== 0) errs.push(`← scrollLeft=${prv.scrollLeft} != 0`);
    }

    const ok = errs.length === 0;
    // Only print every 5th + any failures
    if(i%10===0 || !ok){
      const prevStr = i>0 ? ` ←${people[i-1].split(' ')[0]}` : '';
      const nextStr = i<COUNT-1 ? ` →${people[i+1].split(' ')[0]}` : '';
      console.log(`  ${ok?'✓':'✗'} [${String(i).padStart(2)}] ${people[i].padEnd(22)}${prevStr}${nextStr} tipTop=~${Math.round(expTipTop)}`);
      if(!ok) errs.forEach(e=>console.log(`       ↳ FAIL: ${e}`));
    }

    if(ok) pPass++; else { pFail++; pFails.push({i, name:people[i], errs}); }
  }
  console.log(`\nSuite P: ${pPass} passed, ${pFail} failed\n`);

  // ────────────────────────────────────────────────────────────────────────────
  // SUITE D — Drag left/right, tooltip position must stay fixed
  // ────────────────────────────────────────────────────────────────────────────
  console.log('SUITE D — Horizontal drag does NOT reset tooltip position');
  console.log('-'.repeat(60));

  let dPass=0, dFail=0;

  // Test a few different people to get good coverage
  const dragTestIdxs = [0, 16, 38, 70]; // Adam, Serug, David, Mary

  for(const idx of dragTestIdxs){
    await page.evaluate((i)=>window.gotoIdx(i), idx);
    await page.waitForTimeout(80);

    const before = await tipState(page);

    // Simulate horizontal drag by directly changing scrollLeft (what a real drag does)
    // and verify the tooltip stays at the canonical fixed position
    await page.evaluate(()=>{
      const o = document.getElementById('chart-outer');
      // Simulate what a drag does: set scrollLeft, fire scroll event
      o.scrollLeft = 400;
    });
    await page.waitForTimeout(150);

    const after = await tipState(page);
    const errs=[];

    // Tooltip must still be visible and show same person
    if(after.display === 'none') errs.push('tip hidden after drag');
    if(after.display !== 'none' && !after.tipName.includes(people[idx].split(' ')[0]))
      errs.push(`tip shows "${after.tipName}" expected "${people[idx]}"`);

    // scrollLeft must have changed (drag actually happened)
    if(after.scrollLeft <= before.scrollLeft)
      errs.push(`scrollLeft did not increase: ${before.scrollLeft} → ${after.scrollLeft} (drag ineffective)`);

    // scrollTop must not change
    if(Math.abs(after.scrollTop - before.scrollTop) > 2)
      errs.push(`scrollTop changed during horizontal drag: ${Math.round(before.scrollTop)} → ${Math.round(after.scrollTop)}`);

    // Tooltip Y position must stay at canonical position (repositionTip restores it)
    if(after.display !== 'none'){
      const expTop = canonicalTipTop(after);
      if(Math.abs(after.tipTop - expTop) > TOL)
        errs.push(`tip.top drifted after drag: ${Math.round(after.tipTop)} != ~${Math.round(expTop)} (canonical)`);
    }

    const ok = errs.length === 0;
    const slStr = `scrollLeft: ${before.scrollLeft} → ${after.scrollLeft}`;
    console.log(`  ${ok?'✓':'✗'} [${String(idx).padStart(2)}] ${people[idx].padEnd(22)} ${slStr}  tipTop: ${Math.round(before.tipTop)} → ${Math.round(after.tipTop)}`);
    if(!ok) errs.forEach(e => console.log(`       ↳ FAIL: ${e}`));
    if(ok) dPass++; else { dFail++; }
  }
  console.log(`\nSuite D: ${dPass} passed, ${dFail} failed`);

  await browser.close();
  const allOk = pFail===0 && dFail===0;
  console.log('\n' + '='.repeat(60));

  // Print full report of Suite P failures
  if(pFail>0){
    console.log('\nSuite P FULL FAILURE REPORT:');
    pFails.forEach(f=>{
      console.log(`  [${f.i}] ${f.name}`);
      f.errs.forEach(e=>console.log(`    ${e}`));
    });
  }
  console.log(`\n${allOk?'ALL PASS':'FAILURES FOUND'} — Suite P: ${pPass}/${COUNT}  Suite D: ${dPass}/${dragTestIdxs.length}`);
  process.exit(allOk?0:1);
}

run().catch(err=>{ console.error(err); process.exit(1); });
