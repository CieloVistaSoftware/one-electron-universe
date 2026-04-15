/**
 * chord-diagram.js — Guitar chord diagram SVG generator
 * CieloVista Software
 *
 * Usage:
 *   import { drawChord, CHORDS } from './chord-diagram.js';
 *   const svg = drawChord(CHORDS.G7);
 *   const svg = drawChord({ name:'D', fingers:[...] });
 *
 * Chord definition:
 *   name      — display name e.g. 'G7'
 *   type      — 'major'|'minor'|'dom7'|'maj7'|'min7'|'dim'|'aug'|etc
 *   fret      — starting fret (0 = open position, nut shown)
 *   fingers   — [{s: string 1-6, f: fret offset 1-4, degree: '1'|'3'|'5'|'7'|'b3'|'b7'...}]
 *   barre     — {fret: offset, from: string, to: string} (optional)
 *   open      — string numbers that are open (o marker)
 *   muted     — string numbers that are muted (x marker)
 *   showDegrees — true to annotate dots with scale degrees (auto-true for 7th chords)
 */

// ── Degree colour palette (works in light + dark) ──────────────────────────
const DEGREE_COLORS = {
  '1':  { fill: '#1D9E75', text: '#ffffff' }, // teal   — root
  '3':  { fill: '#BA7517', text: '#ffffff' }, // amber  — major 3rd
  'b3': { fill: '#BA7517', text: '#ffffff' }, // amber  — minor 3rd
  '5':  { fill: '#378ADD', text: '#ffffff' }, // blue   — 5th
  'b5': { fill: '#378ADD', text: '#ffffff' }, // blue   — flat 5th
  '7':  { fill: '#D85A30', text: '#ffffff' }, // coral  — minor 7th
  'b7': { fill: '#D85A30', text: '#ffffff' }, // coral  — (alias)
  'maj7':{ fill: '#7F77DD', text: '#ffffff'}, // purple — major 7th
  '9':  { fill: '#D4537E', text: '#ffffff' }, // pink   — 9th extension
  '11': { fill: '#888780', text: '#ffffff' }, // gray   — 11th
  '13': { fill: '#639922', text: '#ffffff' }, // green  — 13th
};
const DEFAULT_DOT = { fill: '#1a1a18', text: '#ffffff' };
const DEFAULT_DOT_DARK = { fill: '#d4d2c8', text: '#1a1a18' };

const STRINGS = 6;
const FRETS   = 4;

/**
 * drawChord(chord, opts) → SVG string
 *
 * opts:
 *   width       — SVG width in px (default 100)
 *   height      — SVG height in px (default 130)
 *   dark        — force dark mode colours
 *   showDegrees — override degree display; undefined = auto
 */
export function drawChord(chord, opts = {}) {
  const W  = opts.width  || 100;
  const H  = opts.height || 130;
  // Grid layout
  const marginLeft  = 14;
  const marginTop   = 26;
  const gridW       = W - marginLeft - 14;
  const gridH       = H - marginTop  - 24;
  const xStep = gridW  / (STRINGS - 1);
  const yStep = gridH  / FRETS;

  const dark = opts.dark ?? (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme:dark)').matches);
  const ink  = dark ? '#c2c0b6' : '#2a2a28';
  const defDot = dark ? DEFAULT_DOT_DARK : DEFAULT_DOT;

  // Auto-show degrees for 7th / extended chords
  const auto7th = /7|9|11|13|dim|aug|sus/.test(chord.type || '');
  const showDeg = opts.showDegrees ?? chord.showDegrees ?? auto7th;

  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

  // ── Fret position label ────────────────────────────────────────────────
  if (chord.fret > 0) {
    s += `<text x="${marginLeft + gridW + 5}" y="${marginTop + yStep / 2 + 3}" `
       + `font-size="9" font-family="sans-serif" fill="${ink}" dominant-baseline="central">`
       + `${chord.fret}fr</text>`;
  }

  // ── Nut or top fret line ────────────────────────────────────────────────
  if (chord.fret === 0) {
    s += `<rect x="${marginLeft}" y="${marginTop - 3}" width="${gridW}" height="5" rx="1.5" fill="${ink}"/>`;
  } else {
    s += `<line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft + gridW}" y2="${marginTop}" `
       + `stroke="${ink}" stroke-width="1.5"/>`;
  }

  // ── Fret lines ─────────────────────────────────────────────────────────
  for (let f = 1; f <= FRETS; f++) {
    const y = marginTop + f * yStep;
    s += `<line x1="${marginLeft}" y1="${y}" x2="${marginLeft + gridW}" y2="${y}" `
       + `stroke="${ink}" stroke-width="0.5" opacity="0.4"/>`;
  }

  // ── String lines ───────────────────────────────────────────────────────
  for (let i = 0; i < STRINGS; i++) {
    const x = marginLeft + i * xStep;
    s += `<line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop + gridH}" `
       + `stroke="${ink}" stroke-width="0.7" opacity="0.5"/>`;
  }

  // ── Barre ──────────────────────────────────────────────────────────────
  if (chord.barre) {
    const b  = chord.barre;
    const x1 = marginLeft + (STRINGS - b.from) * xStep;
    const x2 = marginLeft + (STRINGS - b.to)   * xStep;
    const cy = marginTop  + (b.fret - 0.5) * yStep;
    const col = dark ? 'rgba(210,208,200,0.88)' : 'rgba(28,28,26,0.88)';
    s += `<rect x="${x1}" y="${cy - 7}" width="${x2 - x1}" height="14" rx="7" fill="${col}"/>`;
    // Barre degree label (always root = 1 on the barre)
    if (showDeg && chord.barre.degree) {
      const { fill, text } = DEGREE_COLORS[chord.barre.degree] || defDot;
      const cx = (x1 + x2) / 2;
      s += dot(cx, cy, 7, fill, text, chord.barre.degree);
    }
  }

  // ── Finger dots ────────────────────────────────────────────────────────
  (chord.fingers || []).forEach(d => {
    const x  = marginLeft + (STRINGS - d.s) * xStep;
    const cy = marginTop  + (d.f - 0.5) * yStep;
    if (showDeg && d.degree) {
      const col = DEGREE_COLORS[d.degree] || defDot;
      s += dot(x, cy, 7, col.fill, col.text, d.degree);
    } else {
      s += dot(x, cy, 7, defDot.fill, defDot.text, null);
    }
  });

  // ── Open / muted markers ────────────────────────────────────────────────
  const barreStrings = chord.barre
    ? new Set(range(chord.barre.to, chord.barre.from))
    : new Set();

  for (let i = 6; i >= 1; i--) {
    const x = marginLeft + (STRINGS - i) * xStep;
    const y = marginTop - 12;
    const hasFingerOnString = (chord.fingers || []).some(f => f.s === i);
    const inBarre = barreStrings.has(i);

    if ((chord.muted || []).includes(i)) {
      s += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" `
         + `font-family="sans-serif" fill="${ink}">×</text>`;
    } else if (!hasFingerOnString && !inBarre) {
      if ((chord.open || []).includes(i)) {
        s += `<circle cx="${x}" cy="${y}" r="4.5" fill="none" stroke="${ink}" stroke-width="1.2"/>`;
      } else if (i > (chord.lowestMuted || 0)) {
        // open by default if not explicitly marked
        s += `<circle cx="${x}" cy="${y}" r="4.5" fill="none" stroke="${ink}" stroke-width="1.2"/>`;
      }
    }
  }

  s += '</svg>';
  return s;
}

// ── Helper: filled dot with optional degree label ──────────────────────────
function dot(cx, cy, r, fill, textColor, label) {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
  if (label) {
    const display = label === 'maj7' ? 'M7' : label === 'b3' ? '♭3' : label === 'b5' ? '♭5' : label === 'b7' ? '♭7' : label;
    s += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" `
       + `font-size="7" font-weight="600" font-family="sans-serif" fill="${textColor}">${display}</text>`;
  }
  return s;
}

function range(from, to) {
  const r = [];
  for (let i = from; i <= to; i++) r.push(i);
  return r;
}

// ── Chord library ──────────────────────────────────────────────────────────
//  Strings numbered 1 (high e) to 6 (low E)
//  Degrees: '1' root, '3' maj3, 'b3' min3, '5' fifth, 'b5' dim5, '7' min7, 'maj7' maj7

export const CHORDS = {

  // ── Open Major ────────────────────────────────────────────────────────
  E: {
    name:'E', type:'major', fret:0,
    muted:[], open:[1],
    fingers:[{s:5,f:2,degree:'5'},{s:4,f:2,degree:'1'},{s:3,f:1,degree:'3'}],
  },
  A: {
    name:'A', type:'major', fret:0,
    muted:[6], open:[1],
    fingers:[{s:4,f:2,degree:'5'},{s:3,f:2,degree:'1'},{s:2,f:2,degree:'3'}],
  },
  D: {
    name:'D', type:'major', fret:0,
    muted:[6,5], open:[],
    fingers:[{s:3,f:2,degree:'1'},{s:2,f:3,degree:'3'},{s:1,f:2,degree:'5'}],
  },
  G: {
    name:'G', type:'major', fret:0,
    muted:[], open:[],
    fingers:[{s:6,f:3,degree:'1'},{s:5,f:2,degree:'3'},{s:1,f:3,degree:'1'}],
    lowestMuted:0,
  },
  C: {
    name:'C', type:'major', fret:0,
    muted:[6], open:[],
    fingers:[{s:5,f:3,degree:'1'},{s:4,f:2,degree:'5'},{s:2,f:1,degree:'3'}],
  },
  F: {
    name:'F', type:'major', fret:1,
    muted:[], open:[],
    barre:{fret:1,from:6,to:1,degree:'1'},
    fingers:[{s:5,f:3,degree:'5'},{s:4,f:3,degree:'1'},{s:3,f:2,degree:'3'}],
  },

  // ── Open Minor ────────────────────────────────────────────────────────
  Em: {
    name:'Em', type:'minor', fret:0,
    muted:[], open:[1],
    fingers:[{s:5,f:2,degree:'5'},{s:4,f:2,degree:'1'}],
  },
  Am: {
    name:'Am', type:'minor', fret:0,
    muted:[6], open:[1],
    fingers:[{s:4,f:2,degree:'5'},{s:3,f:2,degree:'1'},{s:2,f:1,degree:'b3'}],
  },
  Dm: {
    name:'Dm', type:'minor', fret:0,
    muted:[6,5], open:[],
    fingers:[{s:3,f:2,degree:'1'},{s:2,f:3,degree:'b3'},{s:1,f:1,degree:'5'}],
  },
  Bm: {
    name:'Bm', type:'minor', fret:2,
    muted:[6], open:[],
    barre:{fret:2,from:5,to:1,degree:'1'},
    fingers:[{s:4,f:4,degree:'5'},{s:3,f:4,degree:'1'},{s:2,f:3,degree:'b3'}],
  },

  // ── Dominant 7th ─────────────────────────────────────────────────────
  G7: {
    name:'G7', type:'dom7', fret:0,
    muted:[], open:[],
    showDegrees: true,
    fingers:[{s:6,f:3,degree:'1'},{s:5,f:2,degree:'3'},{s:1,f:1,degree:'b7'}],
  },
  E7: {
    name:'E7', type:'dom7', fret:0,
    muted:[], open:[1],
    showDegrees: true,
    fingers:[{s:5,f:2,degree:'5'},{s:3,f:1,degree:'b7'}],
  },
  A7: {
    name:'A7', type:'dom7', fret:0,
    muted:[6], open:[1],
    showDegrees: true,
    fingers:[{s:4,f:2,degree:'5'},{s:2,f:2,degree:'3'}],
    // string 3 is open = b7
  },
  D7: {
    name:'D7', type:'dom7', fret:0,
    muted:[6,5], open:[],
    showDegrees: true,
    fingers:[{s:3,f:2,degree:'1'},{s:1,f:2,degree:'5'},{s:2,f:1,degree:'3'},{s:4,f:1,degree:'b7'}],
  },
  B7: {
    name:'B7', type:'dom7', fret:0,
    muted:[6], open:[],
    showDegrees: true,
    fingers:[{s:5,f:2,degree:'1'},{s:3,f:2,degree:'5'},{s:1,f:2,degree:'b7'},{s:4,f:1,degree:'b7'},{s:2,f:3,degree:'3'}],
  },
  C7: {
    name:'C7', type:'dom7', fret:0,
    muted:[6], open:[],
    showDegrees: true,
    fingers:[{s:5,f:3,degree:'1'},{s:4,f:2,degree:'5'},{s:2,f:1,degree:'3'},{s:3,f:3,degree:'b7'}],
  },

  // ── Major 7th ─────────────────────────────────────────────────────────
  Cmaj7: {
    name:'Cmaj7', type:'maj7', fret:0,
    muted:[6], open:[],
    showDegrees: true,
    fingers:[{s:5,f:3,degree:'1'},{s:4,f:2,degree:'5'},{s:2,f:1,degree:'3'}],
    // string 1 open = maj7
  },
  Amaj7: {
    name:'Amaj7', type:'maj7', fret:0,
    muted:[6], open:[1],
    showDegrees: true,
    fingers:[{s:4,f:2,degree:'5'},{s:3,f:2,degree:'1'},{s:2,f:1,degree:'3'}],
    // string 1 open = maj7
  },
  Emaj7: {
    name:'Emaj7', type:'maj7', fret:0,
    muted:[], open:[1],
    showDegrees: true,
    fingers:[{s:5,f:2,degree:'5'},{s:4,f:1,degree:'maj7'},{s:3,f:1,degree:'3'}],
  },
  Gmaj7: {
    name:'Gmaj7', type:'maj7', fret:0,
    muted:[], open:[],
    showDegrees: true,
    fingers:[{s:6,f:3,degree:'1'},{s:5,f:2,degree:'3'},{s:1,f:2,degree:'maj7'}],
  },

  // ── Minor 7th ─────────────────────────────────────────────────────────
  Am7: {
    name:'Am7', type:'min7', fret:0,
    muted:[6], open:[1],
    showDegrees: true,
    fingers:[{s:4,f:2,degree:'5'},{s:2,f:1,degree:'b3'}],
    // strings 3,1 open = b7, 1
  },
  Em7: {
    name:'Em7', type:'min7', fret:0,
    muted:[], open:[1],
    showDegrees: true,
    fingers:[{s:5,f:2,degree:'5'},{s:4,f:2,degree:'1'},{s:2,f:3,degree:'b7'}],
  },
  Dm7: {
    name:'Dm7', type:'min7', fret:0,
    muted:[6,5], open:[],
    showDegrees: true,
    fingers:[{s:3,f:2,degree:'1'},{s:2,f:1,degree:'b3'},{s:1,f:1,degree:'5'},{s:4,f:1,degree:'b7'}],
  },
  Bm7: {
    name:'Bm7', type:'min7', fret:2,
    muted:[6], open:[],
    showDegrees: true,
    barre:{fret:2,from:5,to:1,degree:'1'},
    fingers:[{s:4,f:4,degree:'5'},{s:3,f:4,degree:'b7'},{s:2,f:3,degree:'b3'}],
  },

  // ── Diminished ────────────────────────────────────────────────────────
  Bdim: {
    name:'Bdim', type:'dim', fret:0,
    muted:[6], open:[],
    showDegrees: true,
    fingers:[{s:5,f:2,degree:'1'},{s:4,f:3,degree:'b3'},{s:3,f:2,degree:'b5'},{s:2,f:3,degree:'1'}],
  },
};

/**
 * drawChordSet(chordNames, opts) → Array of {name, svg}
 * Convenience wrapper for rendering a set of chords.
 */
export function drawChordSet(chordNames, opts = {}) {
  return chordNames.map(name => ({
    name,
    chord: CHORDS[name],
    svg: CHORDS[name] ? drawChord(CHORDS[name], opts) : null,
  }));
}

/**
 * chordGridHTML(chordNames, opts) → full HTML string for embedding
 * Returns a self-contained <div> with chord diagrams laid out in a grid.
 */
export function chordGridHTML(chordNames, opts = {}) {
  const cols = opts.cols || 4;
  const diagrams = chordNames.map(name => {
    const chord = CHORDS[name];
    if (!chord) return '';
    const svg = drawChord(chord, opts);
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
      ${svg}
      <div style="font-size:13px;font-weight:600;color:inherit">${chord.name}</div>
      <div style="font-size:11px;opacity:.6">${chord.type}</div>
    </div>`;
  }).join('');
  return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px;padding:8px 0">${diagrams}</div>`;
}
