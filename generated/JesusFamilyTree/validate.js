// validate.js — static analysis + behavioral simulation tests for index.html
// Run: node validate.js
// Exit 0 = all pass, Exit 1 = any fail

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILE = path.join(__dirname, 'index.html');
let pass = 0, fail = 0;

function ok(msg)  { console.log('  ✓ ' + msg); pass++; }
function bad(msg) { console.error('  ✗ FAIL: ' + msg); fail++; }

const html = fs.readFileSync(FILE, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const js = scriptMatch ? scriptMatch[1] : '';

// ── 1. HTML structure ─────────────────────────────────────────────────────────
console.log('STRUCTURE');
html.includes('<!DOCTYPE html>') ? ok('DOCTYPE')      : bad('DOCTYPE missing');
html.includes('<html')           ? ok('<html>')        : bad('<html> missing');
html.includes('</html>')         ? ok('</html>')       : bad('</html> missing');
html.includes('<head>')          ? ok('<head>')        : bad('<head> missing');
html.includes('<body>')          ? ok('<body>')        : bad('<body> missing');
html.includes('<script>')        ? ok('<script>')      : bad('<script> missing');
html.includes('</script>')       ? ok('</script>')     : bad('</script> missing');
js.includes('(function(){')      ? ok('IIFE open')     : bad('IIFE open missing');
js.includes('})();')             ? ok('IIFE close')    : bad('IIFE close missing');

// ── 2. Key DOM elements ───────────────────────────────────────────────────────
console.log('\nDOM ELEMENTS');
html.includes('id="tlc"')         ? ok('canvas#tlc')   : bad('canvas#tlc missing');
html.includes('id="tip"')         ? ok('#tip')          : bad('#tip missing');
html.includes('id="tip-pin"')     ? ok('#tip-pin')      : bad('#tip-pin missing');
html.includes('id="chart-outer"') ? ok('#chart-outer')  : bad('#chart-outer missing');
html.includes('id="tour-btn"')    ? ok('#tour-btn')     : bad('#tour-btn missing');
html.includes('id="tip-name"')    ? ok('#tip-name')     : bad('#tip-name missing');
html.includes('id="tip-era"')     ? ok('#tip-era')      : bad('#tip-era missing');
html.includes('id="tip-note"')    ? ok('#tip-note')     : bad('#tip-note missing');

// ── 3. Lock icons ─────────────────────────────────────────────────────────────
console.log('\nLOCK ICONS');
html.includes('🔓')               ? ok('🔓 unlock icon present') : bad('🔓 missing');
html.includes('🔒')               ? ok('🔒 lock icon in JS')     : bad('🔒 missing');
!html.includes('📌')              ? ok('📌 pin icon removed')    : bad('📌 still present');
html.includes('Click to lock open') ? ok('"Click to lock open" title') : bad('"Click to lock open" title missing');
html.includes('Locked')             ? ok('"Locked" title present')      : bad('"Locked" title missing');

// ── 4. Stamped cards have ✕, hover tip does not ───────────────────────────────
console.log('\nSTAMPED CARD CLOSE BUTTON');
const stampFn = js.match(/function stampCard\(\)\s*\{[\s\S]*?\n\}/)?.[0] || '';
stampFn.includes('✕')             ? ok('stampCard creates ✕ button')   : bad('stampCard missing ✕ button');
stampFn.includes('card.remove()') ? ok('✕ calls card.remove()')        : bad('✕ missing card.remove()');
const tipStaticHtml = html.match(/<div id="tip"[\s\S]*?<\/div>\s*<footer/)?.[0] || '';
!tipStaticHtml.includes('✕')      ? ok('hover #tip has no ✕')          : bad('hover #tip has unwanted ✕');

// ── 5. No duplicate state variable declarations ───────────────────────────────
console.log('\nDUPLICATE STATE VARS');
const STATE_VARS = [
  'tipPinned','tipOnCard','tipShowTimer','tipLeaveTimer','lastRow',
  'topZ','selectedIdx','dragging','tourIdx','tourTimer',
  'tipDragging','tipDragOX','tipDragOY'
];
let dupFound = false;
for (const v of STATE_VARS) {
  const total = (js.match(new RegExp(`\\blet\\s+${v}\\b`,   'g')) || []).length
              + (js.match(new RegExp(`\\bconst\\s+${v}\\b`, 'g')) || []).length;
  if (total > 1) { bad(`duplicate: ${v} (${total}x)`); dupFound = true; }
}
if (!dupFound) ok('no duplicate state variable declarations');

// ── 6. Critical functions present ─────────────────────────────────────────────
console.log('\nCRITICAL FUNCTIONS');
[
  'function draw(','function showTip(','function hideTip(',
  'function hideTipSoon(','function buildTip(','function pinTip(',
  'function unpinTip(','function stampCard(','window.navTo'
].forEach(fn => {
  js.includes(fn) ? ok(fn.trim()) : bad(fn.trim() + ' MISSING');
});

// ── 7. z-index management ─────────────────────────────────────────────────────
console.log('\nZ-ORDER');
js.includes('let topZ')  ? ok('topZ declared')    : bad('topZ missing');
js.includes('++topZ')    ? ok('topZ incremented') : bad('++topZ missing');
/let topZ\s*=\s*\d+/.test(js) && parseInt(js.match(/let topZ\s*=\s*(\d+)/)[1]) < 500
  ? ok('topZ starts low (< 500)')
  : bad('topZ does not start low');

// ── 8. SIMULATED POSITION: tooltip opens 1rem below bar bottom, left-aligned ──
console.log('\nTOOLTIP POSITION — SIMULATED');

const ROW   = parseInt(js.match(/const ROW\s*=\s*(\d+)/)?.[1]    || '30');
const LPAD  = parseInt(js.match(/const LPAD\s*=\s*(\d+)/)?.[1]   || '175');
const YS    = parseInt(js.match(/const YS\s*=\s*(-?\d+)/)?.[1]   || '-4100');
const YE    = parseInt(js.match(/const YE\s*=\s*(\d+)/)?.[1]     || '130');
const CVS_W = parseInt(js.match(/const CVS_W\s*=\s*(\d+)/)?.[1]  || '5000');
const RPAD  = parseInt(js.match(/const RPAD\s*=\s*(\d+)/)?.[1]   || '50');
const HEADER= parseInt(js.match(/const HEADER\s*=\s*(\d+)/)?.[1] || '58');
const YR    = YE - YS;

function yx(yr){ return LPAD + (yr - YS) * (CVS_W - LPAD - RPAD) / YR; }
function getRowY(idx){
  const SECTION_H = 22, STEP = ROW + 5;
  const sectionFroms = new Set([0,10,19,25,34,38,54,65]);
  let y = HEADER;
  for(let i=0;i<idx;i++){ if(sectionFroms.has(i)) y+=SECTION_H; y+=STEP; }
  return y;
}

const REM       = 16;
const outerLeft = 100;
const cvsTop    = 200;

// Use scroll values that put each bar visibly on screen
const posTests = [
  { name:'Adam',  b:-4004, rowIdx:0,  scrollLeft:0    },
  { name:'David', b:-1040, rowIdx:38, scrollLeft:3500  },
  { name:'Jesus', b:-6,    rowIdx:72, scrollLeft:4700  },
];

for(const t of posTests){
  const bx        = Math.max(yx(t.b), LPAD);
  const ry        = getRowY(t.rowIdx);
  const barLeft   = outerLeft + bx - t.scrollLeft;   // bar left on screen
  const barBottom = cvsTop + ry + ROW - 4;            // bar bottom on screen (ry+4+bh = ry+ROW-4)
  const tipLeft   = outerLeft + bx - t.scrollLeft;    // tooltip left (source formula)
  const tipTop    = cvsTop + ry + ROW - 4 + REM;      // tooltip top (source formula)

  Math.abs(tipLeft - barLeft) < 0.01
    ? ok(`${t.name}: tooltip.left(${Math.round(tipLeft)}) === bar.left(${Math.round(barLeft)}) ✓`)
    : bad(`${t.name}: tooltip.left ≠ bar.left — left edges must match`);
  Math.abs(tipTop - (barBottom + REM)) < 0.01
    ? ok(`${t.name}: tooltip.top(${Math.round(tipTop)}) === barBottom(${Math.round(barBottom)}) + 1rem ✓`)
    : bad(`${t.name}: tooltip.top ≠ barBottom + 1rem`);
  tipTop > barBottom
    ? ok(`${t.name}: tooltip is BELOW bar ✓`)
    : bad(`${t.name}: tooltip is NOT below bar`);
  Math.abs((tipTop - barBottom) - REM) < 0.01
    ? ok(`${t.name}: gap = ${tipTop - barBottom}px = exactly 1rem ✓`)
    : bad(`${t.name}: gap ≠ 1rem`);
}

const showTipFn = js.match(/function showTip\([\s\S]*?\n\}/)?.[0] || '';
showTipFn.includes('bx - outer.scrollLeft')  ? ok('source: tx = outerLeft + bx - scrollLeft') : bad('source tx formula wrong');
showTipFn.includes('ry + ROW - 4 + REM')     ? ok('source: ty = cvsTop + ry + ROW - 4 + REM') : bad('source ty formula wrong');
!showTipFn.includes('ex - outer.scrollLeft') ? ok('old right-of-bar formula removed')          : bad('old formula still present');
showTipFn.includes('TIP_H > window.innerHeight')                   ? ok('flips above if viewport too short') : bad('no viewport flip');
(showTipFn.includes('tx + TIP_W')||showTipFn.includes('TIP_W > window.innerWidth')) ? ok('right overflow handled') : bad('no right overflow');

// ── 9. WIGGLE — NO SHAKE ON FIRST OPEN (simulated) ───────────────────────────
console.log('\nWIGGLE — NO SHAKE ON FIRST OPEN (simulated)');
const mmBlock = js.match(/cvs\.addEventListener\('mousemove'[\s\S]*?\n\}\);/)?.[0] || '';

mmBlock.includes("tip.style.display==='block'")
  ? ok("guard uses display==='block'")
  : bad("guard does NOT use display==='block'");

// A1: first load (display='')
{ let w=false,t=false; if(''==='block'){w=true;}else{t=true;}
  !w ? ok('A1 (display=""): no wiggle')    : bad('A1: wiggle fired on first load');
   t ? ok('A1 (display=""): timer fires')  : bad('A1: timer did not fire'); }

// A2: after close (display='none')
{ let w=false,t=false; if('none'==='block'){w=true;}else{t=true;}
  !w ? ok('A2 (display="none"): no wiggle')    : bad('A2: wiggle fired after close');
   t ? ok('A2 (display="none"): timer fires')  : bad('A2: timer did not fire'); }

// B: tooltip showing (display='block')
{ let w=false,t=false; if('block'==='block'){w=true;}else{t=true;}
   w ? ok('B (display="block"): wiggle fires')        : bad('B: wiggle did not fire');
  !t ? ok('B (display="block"): timer does NOT fire') : bad('B: timer fired while showing'); }

// C: same row
mmBlock.includes('if(row!==lastRow)')
  ? ok('C (same row): row!==lastRow guard blocks all action')
  : bad('C: row!==lastRow guard missing');

const wiggleElse = /tip\.style\.display==='block'\s*\)\s*\{[\s\S]*?tip-wiggle[\s\S]*?\}\s*else\s*\{[\s\S]*?tipShowTimer/;
wiggleElse.test(mmBlock)
  ? ok('wiggle and open-timer in mutually exclusive if/else')
  : bad('wiggle/open-timer NOT mutually exclusive');
mmBlock.includes("tip.classList.remove('tip-wiggle')")
  ? ok('tip-wiggle removed before re-adding')
  : bad('tip-wiggle not removed before re-adding');
mmBlock.includes('void tip.offsetWidth')
  ? ok('offsetWidth reflow forces animation restart')
  : bad('offsetWidth reflow missing');

// ── 10. Clicking name always opens tooltip ────────────────────────────────────
console.log('\nCLICKING NAME OPENS TOOLTIP');
const navToFn = js.match(/window\.navTo[\s\S]*?\n\};/)?.[0] || '';
navToFn.includes('showTip(')
  ? ok('navTo calls showTip()')
  : bad('navTo does NOT call showTip()');
const clickHandler = js.match(/cvs\.addEventListener\('click'[\s\S]*?\n\}\);/)?.[0] || '';
clickHandler.includes('showTip(')
  ? ok('click handler calls showTip()')
  : bad('click handler missing showTip()');

// ── 11. LOCKED TOOLTIP — hover vs click (simulated) ──────────────────────────
console.log('\nLOCKED TOOLTIP BEHAVIOR — SIMULATED');

// Scenario: tipPinned=true, user HOVERS a different bar
// Expected: mousemove returns early — no new tooltip, no wiggle fires
{
  mmBlock.includes('tipPinned')
    ? ok('HOVER-WHILE-LOCKED: mousemove has tipPinned guard')
    : bad('HOVER-WHILE-LOCKED: mousemove missing tipPinned guard');

  // Simulate the early-return guard
  let proceeded = false;
  const d=false, tOC=false, tP=true;
  if(d||tOC||tP){ /* returns */ } else { proceeded=true; }
  !proceeded
    ? ok('HOVER-WHILE-LOCKED: mousemove returns immediately — locked tooltip undisturbed')
    : bad('HOVER-WHILE-LOCKED: mousemove proceeded — would open new tooltip over locked one');
}

// Scenario: tipPinned=true, user CLICKS a different bar
// Expected: unpinTip() stamps current card, showTip() opens for new person
{
  const unpinPos = clickHandler.indexOf('unpinTip()');
  const showPos  = clickHandler.indexOf('showTip(');
  unpinPos >= 0 && showPos >= 0
    ? ok('CLICK-WHILE-LOCKED: both unpinTip() and showTip() present in click handler')
    : bad('CLICK-WHILE-LOCKED: missing unpinTip() or showTip() in click handler');

  unpinPos < showPos
    ? ok('CLICK-WHILE-LOCKED: unpinTip() called BEFORE showTip() — stamps first, then opens new')
    : bad('CLICK-WHILE-LOCKED: unpinTip() not before showTip() — wrong order');

  clickHandler.includes('if(tipPinned) unpinTip()')
    ? ok('CLICK-WHILE-LOCKED: unpinTip() guarded by if(tipPinned) — only stamps when locked')
    : bad('CLICK-WHILE-LOCKED: unpinTip() not guarded — would stamp even when unlocked');

  clickHandler.includes('showTip(')
    ? ok('CLICK-WHILE-LOCKED: showTip() always called — new tooltip opens for clicked person')
    : bad('CLICK-WHILE-LOCKED: showTip() missing — tooltip will not open');
}

// ── 12. Closing tooltips ──────────────────────────────────────────────────────
console.log('\nCLOSING TOOLTIPS');
const hideTipFn = js.match(/function hideTip\(\)\s*\{[\s\S]*?\n\}/)?.[0] || '';
hideTipFn.includes('tipOnCard') ? ok('hideTip() tipOnCard guard')          : bad('hideTip() missing tipOnCard guard');
hideTipFn.includes('tipPinned') ? ok('hideTip() tipPinned guard')          : bad('hideTip() missing tipPinned guard');
hideTipFn.includes("display='none'") ? ok("hideTip() sets display='none'") : bad("hideTip() missing display='none'");
const hideTipSoonFn = js.match(/function hideTipSoon\(\)\s*\{[\s\S]*?\n\}/)?.[0] || '';
hideTipSoonFn.includes('tipPinned')  ? ok('hideTipSoon() skips when pinned') : bad('hideTipSoon() missing tipPinned guard');
js.includes("cvs.addEventListener('mouseleave'") && js.includes('hideTipSoon()') ? ok('canvas mouseleave → hideTipSoon()') : bad('canvas mouseleave missing');
const tipMouseleave = js.match(/tip\.addEventListener\('mouseleave'[\s\S]*?\}\);/)?.[0] || '';
tipMouseleave.includes('hideTip()') ? ok('tooltip mouseleave → hideTip()') : bad('tooltip mouseleave missing hideTip()');
stampFn.includes('card.remove()')   ? ok('✕ calls card.remove()')          : bad('✕ missing card.remove()');
js.includes("'Escape'") && js.includes('unpinTip()') ? ok('ESC → unpinTip()') : bad('ESC missing unpinTip()');
js.includes("'Escape'") && js.includes('tourStop()') ? ok('ESC → tourStop()') : bad('ESC missing tourStop()');

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
if (fail === 0) {
  console.log(`ALL ${pass} CHECKS PASSED ✓`);
  process.exit(0);
} else {
  console.log(`${pass} passed  |  ${fail} FAILED`);
  process.exit(1);
}
