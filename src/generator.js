// ─────────────────────────────────────────────────────────────────────────────
// This module now calls the /ai endpoint on the server for all AI requests.
// The server handles API keys and provider logic securely.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * generator.js — CieloVista AI Website Generator
 *
 * API priority order (configurable in UI):
 *   1. Claude (Anthropic) — best quality
 *   2. OpenAI (GPT-4o / GPT-4o-mini) — fallback when Claude credits run out
 *
 * GitHub Copilot has no public REST API accessible from a browser,
 * so it cannot be called directly here. Use OpenAI as the "Copilot-tier"
 * fallback — same underlying models.
 *
 * Generated HTML includes wb-starter's normalize.css and theme CSS vars
 * inlined so output files carry the CieloVista visual language without
 * needing wb-starter to be served locally.
 */

'use strict';

// ─── wb-starter CSS (inlined — normalize + harmonic theme vars) ───────────────

const WB_NORMALIZE_CSS = `
/* wb-starter: modern-normalize + WB additions */
*,*::before,*::after{box-sizing:border-box}
html{line-height:1.15;-webkit-text-size-adjust:100%;tab-size:4;scrollbar-gutter:stable}
@media(prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
hr{height:0;color:inherit;border-top-width:1px}
b,strong{font-weight:bolder}
code,kbd,samp,pre{font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;font-size:1em}
small{font-size:80%}
img,picture,video,canvas,svg{display:block;max-width:100%}
img{height:auto}
input,button,textarea,select{font:inherit}
ul[role=list],ol[role=list]{list-style:none;padding:0;margin:0}
a{color:inherit;text-decoration-skip-ink:auto}
button{background:transparent;border:none;padding:0;cursor:pointer}
[hidden]{display:none!important}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`;

const WB_THEME_VARS_DARK = `
:root,[data-theme="dark"]{
  --hue-primary:240;
  --primary:hsl(240,70%,50%);--primary-dark:hsl(240,70%,35%);--primary-light:hsl(240,50%,75%);
  --secondary:hsl(60,60%,50%);--accent:hsl(210,60%,50%);
  --bg-color:hsl(220,25%,10%);--bg-primary:hsl(220,25%,15%);--bg-secondary:hsl(220,20%,20%);--bg-tertiary:hsl(220,15%,25%);
  --text-primary:hsl(220,15%,95%);--text-secondary:hsl(220,10%,80%);--text-muted:hsl(220,10%,60%);
  --border-color:hsl(220,15%,25%);--border-subtle:hsl(220,15%,20%);
  --radius-sm:4px;--radius-md:8px;--radius-lg:12px;--radius-xl:16px;
  --info-color:hsl(217,91%,60%);--success-color:hsl(142,71%,45%);--warning-color:hsl(45,93%,47%);--danger-color:hsl(0,84%,60%);
}
`;

const WB_THEME_VARS_LIGHT = `
:root,[data-theme="light"]{
  --primary:hsl(240,70%,50%);--primary-dark:hsl(240,70%,35%);--primary-light:hsl(240,50%,75%);
  --secondary:hsl(60,55%,45%);--accent:hsl(210,60%,45%);
  --bg-color:hsl(0,0%,100%);--bg-primary:hsl(220,20%,97%);--bg-secondary:hsl(220,15%,94%);--bg-tertiary:hsl(220,10%,90%);
  --text-primary:hsl(220,25%,10%);--text-secondary:hsl(220,15%,35%);--text-muted:hsl(220,10%,55%);
  --border-color:hsl(220,15%,85%);--border-subtle:hsl(220,15%,90%);
  --radius-sm:4px;--radius-md:8px;--radius-lg:12px;--radius-xl:16px;
  --info-color:hsl(217,71%,45%);--success-color:hsl(142,60%,35%);--warning-color:hsl(38,92%,40%);--danger-color:hsl(0,72%,50%);
}
`;

// ─── Style themes ─────────────────────────────────────────────────────────────

const THEMES = {
  'dark-tech': {
    dataTheme: 'dark',
    wbVars: WB_THEME_VARS_DARK,
    bg: 'var(--bg-color)', bg2: 'var(--bg-primary)', bg3: 'var(--bg-secondary)',
    border: 'var(--border-color)', text: 'var(--text-primary)', muted: 'var(--text-muted)',
    accent1: '#4a9eff', accent2: '#8b7cf8', accent3: '#f07a5a',
    headingGrad: 'linear-gradient(135deg,#4a9eff 0%,#8b7cf8 50%,#e06090 100%)',
    headerGlow: 'rgba(139,124,248,0.12)',
  },
  'light-clean': {
    dataTheme: 'light',
    wbVars: WB_THEME_VARS_LIGHT,
    bg: 'var(--bg-color)', bg2: 'var(--bg-primary)', bg3: 'var(--bg-secondary)',
    border: 'var(--border-color)', text: 'var(--text-primary)', muted: 'var(--text-muted)',
    accent1: '#185fa5', accent2: '#533ab7', accent3: '#993c1d',
    headingGrad: 'linear-gradient(135deg,#185fa5 0%,#533ab7 100%)',
    headerGlow: 'rgba(24,95,165,0.07)',
  },
  'editorial': {
    dataTheme: 'light',
    wbVars: WB_THEME_VARS_LIGHT,
    bg: '#fafaf8', bg2: '#f2f1ed', bg3: '#e8e7e0',
    border: '#d0cfc8', text: '#1c1c1a', muted: '#6b6b60',
    accent1: '#c0392b', accent2: '#1a1a2e', accent3: '#8e44ad',
    headingGrad: 'linear-gradient(135deg,#1a1a2e 0%,#c0392b 100%)',
    headerGlow: 'rgba(192,57,43,0.06)',
  },
  'interactive': {
    dataTheme: 'dark',
    wbVars: WB_THEME_VARS_DARK,
    bg: '#09090d', bg2: '#111118', bg3: '#18181f',
    border: '#2d2d3a', text: '#e8e8f0', muted: '#6060a0',
    accent1: '#00d4ff', accent2: '#a855f7', accent3: '#22c55e',
    headingGrad: 'linear-gradient(135deg,#00d4ff 0%,#a855f7 100%)',
    headerGlow: 'rgba(0,212,255,0.1)',
  },
  'academic': {
    dataTheme: 'light',
    wbVars: WB_THEME_VARS_LIGHT,
    bg: '#fdfcf8', bg2: '#f5f4ef', bg3: '#eeede6',
    border: '#ccc9be', text: '#1e1c16', muted: '#7a7060',
    accent1: '#1b4f72', accent2: '#7d6608', accent3: '#922b21',
    headingGrad: 'linear-gradient(135deg,#1b4f72 0%,#7d6608 100%)',
    headerGlow: 'rgba(27,79,114,0.06)',
  },
  'minimal': {
    dataTheme: 'light',
    wbVars: WB_THEME_VARS_LIGHT,
    bg: '#ffffff', bg2: '#fafafa', bg3: '#f5f5f5',
    border: '#e5e5e5', text: '#111111', muted: '#888888',
    accent1: '#111111', accent2: '#444444', accent3: '#777777',
    headingGrad: 'linear-gradient(135deg,#111 0%,#555 100%)',
    headerGlow: 'rgba(0,0,0,0.02)',
  },
};

// ─── Audience descriptions ────────────────────────────────────────────────────

const AUDIENCE_DESC = {
  general:   'a curious general audience with no specialist background',
  technical: 'a technical expert audience who appreciates depth and precision',
  students:  'students and beginners who need concepts explained from first principles',
  business:  'a business or professional audience focused on practical implications',
};

// ─── Section descriptions ─────────────────────────────────────────────────────

const SECTION_DESC = {
  overview:  'A rich overview section (3-5 paragraphs of real informative content)',
  concepts:  'Key Concepts: 4-6 named concepts each with a heading and 2-3 sentences',
  timeline:  'A timeline of 5-8 real milestones or key dates for the subject',
  cards:     'A grid of 4-6 detail cards each with a short title and 2-3 sentence description',
  quote:     'One or two compelling quotes related to the subject with attribution',
  faq:       'FAQ: 4-5 questions with detailed 2-4 sentence answers',
};

// ─── Shared prompt builder ────────────────────────────────────────────────────

function buildPrompt({ subject, desc, audience, sections }) {
  const audienceText = AUDIENCE_DESC[audience] || AUDIENCE_DESC.general;
  const sectionList  = sections.map(s => SECTION_DESC[s]).filter(Boolean).join('\n- ');

  return `You are a world-class science and technology writer. Generate website CONTENT about:

SUBJECT: ${subject}
${desc ? `CONTEXT: ${desc}` : ''}
AUDIENCE: ${audienceText}

Sections needed:
- ${sectionList}

Return ONLY a valid JSON object with this exact structure (no markdown fences, no preamble):
{
  "title": "Page title",
  "tagline": "One compelling sentence tagline",
  "introduction": "3-5 paragraph introduction separated by \\n\\n",
  "concepts": [{ "id": "c1", "title": "Name", "body": "2-3 sentences", "color": "blue|purple|coral|amber|teal|green" }],
  "timeline": [{ "year": "1940", "title": "Event", "body": "1-2 sentences" }],
  "cards": [{ "num": "01", "title": "Title", "body": "2-3 sentences", "color": "blue|purple|coral|amber|teal|green|pink" }],
  "quotes": [{ "text": "Quote text", "attribution": "— Person, context" }],
  "faq": [{ "q": "Question?", "a": "2-4 sentence answer" }],
  "footer": "One-sentence closing thought"
}

Rules:
- Write REAL content, not placeholders. This goes directly to a user.
- Use varied colors across concepts and cards.
- For missing sections, set the array to [].
- All strings must be properly JSON-escaped.`;
}

// ─── Claude API ───────────────────────────────────────────────────────────────

async function callClaude(prompt, apiKey) {
    // Reads the Anthropic Claude API key from process.env.CLAUDE
  // Use process.env.CLAUDE for the API key
  const claudeKey = typeof process !== 'undefined' && process.env && process.env.CLAUDE;
  if (!claudeKey) throw new Error('Claude API key not set in environment variable CLAUDE');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const status = res.status;
    // 429 = rate limit / credits exhausted — caller should try OpenAI fallback
    const e = new Error(`Claude API error ${status}: ${err?.error?.message || res.statusText}`);
    e.status = status;
    throw e;
  }

  const data = await res.json();
  return parseJSON(data.content?.[0]?.text || '');
}

// ─── OpenAI API ───────────────────────────────────────────────────────────────

async function callOpenAI(prompt, apiKey, model = 'gpt-4o-mini') {
    // Reads the OpenAI API key from process.env.OPENAI
  // Use process.env.OPENAI for the API key
  const openaiKey = typeof process !== 'undefined' && process.env && process.env.OPENAI;
  if (!openaiKey) throw new Error('OpenAI API key not set in environment variable OPENAI');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [
        {
          role: 'system',
          content: 'You are a world-class writer who generates website content as structured JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI API error ${res.status}: ${err?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return parseJSON(data.choices?.[0]?.message?.content || '');
}

// ─── JSON parser (handles accidental markdown fences) ────────────────────────

function parseJSON(raw) {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not parse AI response as JSON.\nFirst 300 chars: ${clean.slice(0, 300)}`);
  }
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildCSS(theme) {
  const t = theme;
  return `
${WB_NORMALIZE_CSS}
${t.wbVars}
body{background:${t.bg};color:${t.text};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.7}
header{text-align:center;padding:72px 24px 56px;background:radial-gradient(ellipse at 50% 0%,${t.headerGlow} 0%,transparent 70%);border-bottom:1px solid ${t.border}}
.kicker{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:${t.accent2};margin-bottom:16px}
h1{font-size:clamp(2rem,5vw,3.4rem);font-weight:700;background:${t.headingGrad};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.2;margin-bottom:16px}
header>p{max-width:620px;margin:0 auto;color:${t.muted};font-size:1.08rem}
main{max-width:1100px;margin:0 auto;padding:0 24px 80px}
section{margin:64px 0}
section>h2{font-size:1.6rem;font-weight:700;margin-bottom:24px;border-left:3px solid ${t.accent1};padding-left:16px;color:${t.text}}
.intro p{font-size:1.05rem;line-height:1.85;color:${t.text};margin-bottom:18px;max-width:780px}
.concepts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.concept-card{background:${t.bg2};border:1px solid ${t.border};border-radius:var(--radius-lg,12px);padding:24px;transition:border-color .2s,transform .15s}
.concept-card:hover{transform:translateY(-2px)}
.concept-card.c-blue{border-top:3px solid ${t.accent1}}.concept-card.c-blue h3{color:${t.accent1}}
.concept-card.c-purple{border-top:3px solid ${t.accent2}}.concept-card.c-purple h3{color:${t.accent2}}
.concept-card.c-coral{border-top:3px solid ${t.accent3}}.concept-card.c-coral h3{color:${t.accent3}}
.concept-card.c-amber{border-top:3px solid #e8a730}.concept-card.c-amber h3{color:#e8a730}
.concept-card.c-teal{border-top:3px solid #3ecfa8}.concept-card.c-teal h3{color:#3ecfa8}
.concept-card.c-green{border-top:3px solid #5db86b}.concept-card.c-green h3{color:#5db86b}
.concept-card h3{font-size:1rem;font-weight:700;margin-bottom:8px}
.concept-card p{font-size:.88rem;color:${t.muted};line-height:1.65}
.tl-item{display:flex;gap:20px;margin-bottom:28px;padding:16px;border-radius:var(--radius-md,8px);border:1px solid transparent;transition:border-color .2s,background .2s}
.tl-item:hover{border-color:${t.border};background:${t.bg2}}
.tl-year{flex-shrink:0;width:60px;font-size:.82rem;font-weight:700;color:${t.accent2};padding-top:3px;text-align:right}
.tl-connector{flex-shrink:0;display:flex;flex-direction:column;align-items:center}
.tl-dot{width:12px;height:12px;border-radius:50%;background:${t.accent2};margin-top:4px;flex-shrink:0}
.tl-line{width:1px;flex:1;background:${t.border};min-height:20px;margin-top:6px}
.tl-body h4{font-size:.95rem;font-weight:700;margin-bottom:5px;color:${t.text}}
.tl-body p{font-size:.87rem;color:${t.muted};line-height:1.6}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.detail-card{background:${t.bg2};border:1px solid ${t.border};border-radius:var(--radius-lg,12px);padding:24px;position:relative;overflow:hidden;transition:border-color .2s,transform .15s}
.detail-card:hover{border-color:${t.accent2};transform:translateY(-2px)}
.detail-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;opacity:0;transition:opacity .2s}
.detail-card:hover::before{opacity:1}
.dc-blue::before{background:${t.accent1}}.dc-purple::before{background:${t.accent2}}.dc-coral::before{background:${t.accent3}}
.dc-amber::before{background:#e8a730}.dc-teal::before{background:#3ecfa8}.dc-green::before{background:#5db86b}.dc-pink::before{background:#e06090}
.dc-blue .card-num{color:${t.accent1}}.dc-purple .card-num{color:${t.accent2}}.dc-coral .card-num{color:${t.accent3}}
.dc-amber .card-num{color:#e8a730}.dc-teal .card-num{color:#3ecfa8}.dc-green .card-num{color:#5db86b}.dc-pink .card-num{color:#e06090}
.card-num{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;opacity:.8}
.detail-card h3{font-size:1rem;font-weight:700;margin-bottom:8px;color:${t.text}}
.detail-card p{font-size:.88rem;color:${t.muted};line-height:1.6}
.quote-block{padding:32px 40px;border-left:3px solid ${t.accent2};background:${t.bg2};border-radius:0 var(--radius-lg,12px) var(--radius-lg,12px) 0;margin-bottom:20px}
.quote-block blockquote{font-size:1.12rem;font-style:italic;line-height:1.75;margin-bottom:10px;color:${t.text}}
.quote-block cite{font-size:.85rem;color:${t.muted};font-style:normal}
.faq-item{border-bottom:1px solid ${t.border};padding:20px 0}
.faq-item:first-child{border-top:1px solid ${t.border}}
.faq-q{font-size:1rem;font-weight:700;margin-bottom:10px;display:flex;align-items:flex-start;gap:10px;color:${t.text}}
.faq-q::before{content:'Q';font-size:.75rem;font-weight:800;color:${t.accent2};background:${t.bg2};border:1px solid ${t.accent2};border-radius:4px;padding:1px 6px;flex-shrink:0;margin-top:3px}
.faq-a{font-size:.9rem;color:${t.muted};line-height:1.7;padding-left:30px}
footer{text-align:center;padding:40px 24px;border-top:1px solid ${t.border};color:${t.muted};font-size:.88rem}
footer strong{color:${t.accent1}}
`;
}

function buildHTML(content, style) {
  const theme = THEMES[style] || THEMES['dark-tech'];
  const css   = buildCSS(theme);

  const esc = s => String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const introHTML = (content.introduction || '')
    .split('\n\n').filter(Boolean)
    .map(p => `<p>${esc(p)}</p>`).join('\n        ');

  const conceptsHTML = (content.concepts || []).map(c =>
    `<div class="concept-card c-${esc(c.color||'blue')}">
      <h3>${esc(c.title)}</h3><p>${esc(c.body)}</p>
    </div>`).join('');

  const timelineHTML = (content.timeline || []).map((item, i, arr) =>
    `<div class="tl-item">
      <div class="tl-year">${esc(item.year)}</div>
      <div class="tl-connector"><div class="tl-dot"></div>${i < arr.length - 1 ? '<div class="tl-line"></div>' : ''}</div>
      <div class="tl-body"><h4>${esc(item.title)}</h4><p>${esc(item.body)}</p></div>
    </div>`).join('');

  const cardsHTML = (content.cards || []).map(c =>
    `<div class="detail-card dc-${esc(c.color||'blue')}">
      <div class="card-num">${esc(c.num||'')}</div>
      <h3>${esc(c.title)}</h3><p>${esc(c.body)}</p>
    </div>`).join('');

  const quotesHTML = (content.quotes || []).map(q =>
    `<div class="quote-block">
      <blockquote>"${esc(q.text)}"</blockquote>
      <cite>${esc(q.attribution)}</cite>
    </div>`).join('');

  const faqHTML = (content.faq || []).map(f =>
    `<div class="faq-item">
      <div class="faq-q">${esc(f.q)}</div>
      <div class="faq-a">${esc(f.a)}</div>
    </div>`).join('');

  const sections = [];
  if (introHTML)   sections.push(`<section class="intro"><h2>Overview</h2>${introHTML}</section>`);
  if (conceptsHTML)sections.push(`<section><h2>Key Concepts</h2><div class="concepts-grid">${conceptsHTML}</div></section>`);
  if (cardsHTML)   sections.push(`<section><h2>Explore Further</h2><div class="cards-grid">${cardsHTML}</div></section>`);
  if (timelineHTML)sections.push(`<section><h2>Timeline</h2>${timelineHTML}</section>`);
  if (quotesHTML)  sections.push(`<section><h2>In Their Own Words</h2>${quotesHTML}</section>`);
  if (faqHTML)     sections.push(`<section><h2>Frequently Asked Questions</h2>${faqHTML}</section>`);

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme.dataTheme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(content.title||'Generated Website')}</title>
  <style>${css}</style>
</head>
<body>
<header>
  <div class="kicker">Generated by CieloVista AI</div>
  <h1>${esc(content.title||'')}</h1>
  <p>${esc(content.tagline||'')}</p>
</header>
<main>${sections.map(s => '\n  ' + s).join('\n')}</main>
<footer>
  <p>${esc(content.footer||'')}</p>
  <p style="margin-top:8px;font-size:.75rem;opacity:.4">CieloVista AI Website Generator · wb-starter design system</p>
</footer>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * generateWebsite(options) → Promise<string>
 *
 * options:
 *   subject      {string}   Topic
 *   desc         {string}   Optional extra context
 *   audience     {string}   general | technical | students | business
 *   style        {string}   dark-tech | light-clean | editorial | interactive | academic | minimal
 *   sections     {string[]} overview | concepts | timeline | cards | quote | faq
 *   provider     {string}   'claude' | 'openai' | 'auto'
 *   claudeKey    {string}   Anthropic API key
 *   openaiKey    {string}   OpenAI API key
 *   openaiModel  {string}   gpt-4o | gpt-4o-mini (default: gpt-4o-mini)
 *   onStatus     {fn}       Optional callback(text, detail, pct)
 */
async function callAIProxy(prompt, provider, openaiModel) {
  const timeoutMs = getRequestTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch('/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider, openaiModel }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error(`${provider} request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `${provider} API error`);
  }

  return parseJSON(data.content || '');
}

function getRequestTimeoutMs() {
  if (typeof window !== 'undefined') {
    const injected = Number(window.__CV_REQUEST_TIMEOUT_MS);
    if (Number.isFinite(injected) && injected > 0) return injected;
  }
  return 45000;
}

async function generateWebsite(options) {
  const {
    subject,
    desc = '',
    audience = 'general',
    style = 'dark-tech',
    sections = ['overview', 'concepts', 'cards'],
    provider = 'auto',
    openaiModel = 'gpt-4o-mini',
    onStatus = () => {},
  } = options || {};

  if (!subject || !subject.trim()) throw new Error('Subject is required');

  const prompt = buildPrompt({
    subject: subject.trim(),
    desc: desc.trim(),
    audience,
    sections,
  });

  let content;

  if (provider === 'claude') {
    onStatus('Claude is writing your website...', 'Calling Anthropic', 25);
    content = await callAIProxy(prompt, 'claude', openaiModel);
  } else if (provider === 'openai') {
    onStatus('OpenAI is writing your website...', `Model: ${openaiModel}`, 25);
    content = await callAIProxy(prompt, 'openai', openaiModel);
  } else {
    onStatus('Generating with Auto mode...', 'Trying Claude first', 20);
    try {
      content = await callAIProxy(prompt, 'claude', openaiModel);
    } catch {
      onStatus('Claude unavailable, switching...', `Trying OpenAI (${openaiModel})`, 35);
      content = await callAIProxy(prompt, 'openai', openaiModel);
    }
  }

  onStatus('Building website HTML...', 'Applying selected style and sections', 65);
  const html = buildHTML(content, style);

  onStatus('Saving generated site...', 'Writing generated/YOURWEBSITENAME/index.html', 85);
  const saveController = new AbortController();
  const saveTimeout = setTimeout(() => saveController.abort(), getRequestTimeoutMs());
  let saveRes;
  try {
    saveRes = await fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: subject.trim(), html }),
      signal: saveController.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('Saving generated website timed out');
    }
    throw err;
  } finally {
    clearTimeout(saveTimeout);
  }

  const saved = await saveRes.json().catch(() => ({}));
  if (!saveRes.ok || !saved?.ok) {
    throw new Error(saved.error || 'Failed to save generated website');
  }

  onStatus('Complete', 'Website generated and saved', 100);
  return { html, saved };
}

async function listWebsites() {
  const res = await fetch('/list');
  if (!res.ok) throw new Error('Failed to fetch generated websites');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

if (typeof window !== 'undefined') {
  window.generateWebsite = generateWebsite;
  window.listWebsites = listWebsites;
}

if (typeof module !== 'undefined') {
  module.exports = { generateWebsite, listWebsites, buildPrompt, buildHTML, parseJSON };
}
