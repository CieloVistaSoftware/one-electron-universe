/**
 * tooltip-alignment-test.cjs — Suite A + Suite B (updated for centered bar positioning)
 *
 * gotoIdx now centers the bar vertically in the container:
 *   scrollTop = ryC*zoom - clientHeight/2 + ROW*zoom/2
 *   tipTop = outerTop + clientHeight/2 + ROW*zoom/2 + REM  (or clamped)
 *   scrollLeft = 0 always
 *   tipLeft = outerLeft + REM
 */
const PW_PATH = 'C:\\Users\\jwpmi\\Downloads\\VSCode\\projects\\cielovista-tools\\node_modules\\playwright';
const { chromium } = require(PW_PATH);
const path = require('path');

const URL = process.argv.includes('--live')
  ? 'https://cielovistasoftware.github.io/one-electron-universe/JesusFamilyTree/'
  : 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

const TOL = 5;

// ── helpers ──────────────────────────────────────────────────────────────────
function rowY(idx){
  const ss = new Set([0,10,19,25,34,38,54,65]);
  let y = 58;
  for(let j=0;j<idx;j++){ if(ss.has(j)) y+=22; y+=35; }
  return y;
}
function yx_fn(yr){ return 175 + (yr-(-4100))*(5000-175-50)/(130-(-4100)); }

async function run(){
  console.log('\nJesusFamilyTree — Suite A (alignment) + Suite B (name links)');
  console.log('='.repeat(60));
  console.log('URL:', URL, '\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('tlc')?.width > 0);
  await page.waitForTimeout(200);

  const meta = await page.evaluate(() => {
    const o = document.getElementById('chart-outer');
    const or = o.getBoundingClientRect();
    return {
      outerTop: or.top, outerLeft: or.left, outerBottom: or.bottom,
      clientH: o.clientHeight, clientW: o.clientWidth,
      vh: window.innerHeight, vw: window.innerWidth,
      rem: parseFloat(getComputedStyle(document.documentElement).fontSize)||16
    };
  });
  const COUNT = await page.evaluate(() => window.getPeople().length);
  console.log(`People: ${COUNT}  Viewport: ${meta.vw}x${meta.vh}`);
  console.log(`chart-outer: left=${meta.outerLeft} top=${meta.outerTop} right=${meta.outerLeft+meta.clientW} bottom=${meta.outerTop+meta.clientH}`);
  console.log();

  // ── SUITE A ────────────────────────────────────────────────────────────────
  console.log('SUITE A — gotoIdx: scroll, name visibility, tooltip position');
  console.log('-'.repeat(60));

  const SAMPLE_A = [0,10,20,30,40,50,60,70,76];
  let aPass=0, aFail=0;
  const aFails=[];

  // Run all 77 but only print sampled lines
  for(let i=0;i<COUNT;i++){
    await page.evaluate((idx) => window.gotoIdx(idx), i);
    await page.waitForTimeout(50);

    const s = await page.evaluate((i) => {
      const o = document.getElementById('chart-outer');
      const t = document.getElementById('tip');
      const tr = t.getBoundingClientRect();
      const or = o.getBoundingClientRect();
      const ROW=30;
      const zoom = window.zoom||1;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)||16;
      const sectionSet = new Set([0,10,19,25,34,38,54,65]);
      function rowY(n){ let y=58; for(let j=0;j<n;j++){if(sectionSet.has(j))y+=22;y+=35;} return y; }
      const ryC = rowY(i);
      const centeredTop = ryC*zoom - o.clientHeight/2 + ROW*zoom/2;
      const expST = Math.max(0, Math.min(centeredTop, o.scrollHeight - o.clientHeight));
      const barScreenBottom = or.top + o.clientHeight/2 + ROW*zoom/2;
      const expTipTopIdeal = barScreenBottom + rem;
      const actualH = t.offsetHeight||460;
      const expTipTop = Math.max(rem, Math.min(expTipTopIdeal, window.innerHeight - actualH - rem));
      const expTipLeft = or.left + rem;
      return {
        scrollTop: o.scrollTop, scrollLeft: o.scrollLeft,
        expST, expST_delta: Math.abs(o.scrollTop - expST),
        display: window.getComputedStyle(t).display,
        tipTop: tr.top, tipLeft: tr.left, tipBottom: tr.bottom,
        expTipTop, expTipLeft, tipH: actualH,
        tipTop_delta: Math.abs(tr.top - expTipTop),
        tipLeft_delta: Math.abs(tr.left - expTipLeft),
        vh: window.innerHeight, vw: window.innerWidth
      };
    }, i);

    const errs = [];
    if(s.scrollLeft !== 0) errs.push(`scrollLeft=${s.scrollLeft} != 0`);
    if(s.expST_delta > TOL) errs.push(`scrollTop ${Math.round(s.scrollTop)} != ~${Math.round(s.expST)} (delta ${Math.round(s.expST_delta)})`);
    if(s.display === 'none') errs.push('tip hidden');
    if(s.tipTop_delta > TOL && s.display !== 'none') errs.push(`tip.top ${Math.round(s.tipTop)} != ~${Math.round(s.expTipTop)} (delta ${Math.round(s.tipTop_delta)})`);
    if(s.tipLeft_delta > TOL && s.display !== 'none') errs.push(`tip.left ${Math.round(s.tipLeft)} != ~${Math.round(s.expTipLeft)}`);
    if(s.display !== 'none' && s.tipBottom > s.vh + TOL) errs.push(`tip bottom ${Math.round(s.tipBottom)} > vh ${s.vh}`);

    const ok = errs.length === 0;
    if(SAMPLE_A.includes(i)){
      console.log(`  ${ok?'✓':'✗'} [${String(i).padStart(2)}] tipTop=${Math.round(s.tipTop)} expTop=~${Math.round(s.expTipTop)} scrollTop=${Math.round(s.scrollTop)}`);
      if(!ok) errs.forEach(e=>console.log(`       ↳ ${e}`));
    }
    if(ok) aPass++; else { aFail++; aFails.push({i, errs}); }
  }
  console.log(`\nSuite A: ${aPass} passed, ${aFail} failed`);
  if(aFail>0){ aFails.forEach(f=>{ console.log(`  [${f.i}]`); f.errs.forEach(e=>console.log(`    ${e}`)); }); }

  // ── SUITE B ────────────────────────────────────────────────────────────────
  console.log('\nSUITE B — Name links (span.np) in every tooltip');
  console.log('-'.repeat(60));
  const SAMPLE_B = [0,15,30,45,60,75];
  let bPass=0, bFail=0;
  const bFails=[];

  for(let i=0;i<COUNT;i++){
    await page.evaluate((idx)=>window.gotoIdx(idx), i);
    await page.waitForTimeout(30);
    const npLinks = await page.evaluate((selfIdx)=>{
      const spans = document.querySelectorAll('#tip-note span.np');
      return Array.from(spans).map(sp=>{
        const cb = sp.getAttribute('onclick')||'';
        const m = cb.match(/navTo\((\d+)\)/);
        return { text:sp.textContent, targetIdx: m ? parseInt(m[1]) : -1 };
      });
    }, i);

    let pass=true;
    const errs=[];
    for(const lk of npLinks){
      if(lk.targetIdx < 0 || lk.targetIdx >= COUNT){
        errs.push(`"${lk.text}" → invalid idx ${lk.targetIdx}`); pass=false; continue;
      }
      if(lk.targetIdx === i){
        errs.push(`"${lk.text}" links to self (idx=${i})`); pass=false;
      }
      await page.evaluate((idx)=>window.navTo(idx), lk.targetIdx);
      await page.waitForTimeout(30);
      const dest = await page.evaluate(()=>{
        const tn=document.getElementById('tip-name');
        return {name:(tn?.textContent??'').trim()};
      });
      const expectedFirst = dest.name.split(' ')[0];
      await page.evaluate((idx)=>window.gotoIdx(idx), i);
      await page.waitForTimeout(20);
    }
    if(SAMPLE_B.includes(i)){
      console.log(`  ${pass?'✓':'✗'} [${String(i).padStart(2)}] ${(await page.evaluate(j=>window.getPeople()[j].n,i)).padEnd(20)} — ${npLinks.length} link(s) ok`);
    }
    if(pass) bPass+=npLinks.length; else { bFail+=npLinks.length; bFails.push({i,errs}); }
  }
  const totalNP = bPass+bFail;
  console.log(`\nSuite B: ${bPass} passed, ${bFail} failed, ${totalNP} total name links`);

  await browser.close();
  console.log('\n' + '='.repeat(60));
  const allOk = aFail===0 && bFail===0;
  console.log(`${allOk?'ALL PASS':'FAILURES FOUND'} — Suite A: ${aPass}/${COUNT}  Suite B: ${bPass}/${totalNP} name links`);
  process.exit(allOk?0:1);
}
run().catch(err=>{ console.error(err); process.exit(1); });
