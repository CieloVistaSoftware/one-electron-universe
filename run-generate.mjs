import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Patch fetch to resolve relative URLs against localhost:3000
const BASE = 'http://localhost:3000';
const origFetch = globalThis.fetch;
globalThis.fetch = (url, opts) => origFetch(url.startsWith('/') ? BASE + url : url, opts);

const gen = require('./src/generator.js');
const generateWebsite = gen.generateWebsite;

console.log('Starting Guitar Theory generation...\n');

try {
  const result = await generateWebsite({
    subject: 'Guitar Theory',
    desc: 'Diatonic chords, modes, major and minor chord spellings, 7th chord spellings, intervals, harmonic minor scale, chord progressions',
    audience: 'general',
    style: 'auto',
    sections: ['overview', 'concepts', 'cards', 'timeline', 'faq'],
    provider: 'claude',
    generateImages: false,
    onStatus: (msg, detail, pct) => {
      process.stdout.write(`[${String(pct).padStart(3)}%] ${msg} — ${detail}\n`);
    },
  });
  console.log('\nDone! Saved:', JSON.stringify(result.saved));
} catch (err) {
  console.error('\nERROR:', err.message);
  process.exit(1);
}
