/**
 * server.js — CieloVista Website Generator local server
 *
 * wb-starter asset resolution order:
 *   1. WB_STARTER_DIR env var  (set by VS Code extension or developer override)
 *   2. Hardcoded local dev path (C:\Users\jwpmi\Downloads\AI\wb-starter)
 *   3. bundled/wb/ in the same directory as this file  (ships with extension)
 *
 * This means the extension always has a working fallback, and local dev
 * always picks up the latest from wb-starter automatically.
 *
 * GENERATED_DIR env var — set by the VS Code extension to redirect saved sites
 * to the user's Documents folder instead of the extension install directory.
 * Defaults to ./generated relative to this file when running standalone.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { callClaudeStreaming, callOpenAI, callFalAI } from './ai-handler.js';
import { exec, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PORT       = Number(process.env.PORT) || 3000;
const ROOT_DIR   = __dirname;
const GEN_DIR    = process.env.GENERATED_DIR || path.join(ROOT_DIR, 'generated');

if (!fs.existsSync(GEN_DIR)) { fs.mkdirSync(GEN_DIR, { recursive: true }); }

// ── wb-starter asset resolution ───────────────────────────────────────────────

function resolveWbFile(relativeFromStarter, relativeFromBundled) {
  // 1. Env var override (VS Code extension passes WB_STARTER_DIR)
  if (process.env.WB_STARTER_DIR) {
    const p = path.join(process.env.WB_STARTER_DIR, relativeFromStarter);
    if (fs.existsSync(p)) { return p; }
  }
  // 2. Hardcoded local dev path
  const devPath = path.join('C:\\Users\\jwpmi\\Downloads\\AI\\wb-starter', relativeFromStarter);
  if (fs.existsSync(devPath)) { return devPath; }
  // 3. Bundled fallback (extension ships this)
  const bundled = path.join(ROOT_DIR, 'bundled', 'wb', relativeFromBundled);
  if (fs.existsSync(bundled)) { return bundled; }
  // 4. wb/ sibling directory (used when running from inside bundled/)
  const wbSibling = path.join(ROOT_DIR, 'wb', relativeFromBundled);
  if (fs.existsSync(wbSibling)) { return wbSibling; }
  return null;
}

function loadWbAssets() {
  const assets = { themecontrolJs: '', themesCss: '' };

  const tcPath = resolveWbFile(
    path.join('src', 'behaviors', 'themecontrol.js'),
    'themecontrol.js'
  );
  if (tcPath) {
    try {
      const raw = fs.readFileSync(tcPath, 'utf8');
      assets.themecontrolJs = raw
        .replace(/^export\s+function\s+themecontrol/m, 'function themecontrol')
        .replace(/^export\s+\{[^}]*\};\s*$/m, '')
        .replace(/^export\s+default\s+themecontrol;\s*$/m, '')
        .trimEnd();
      const src = tcPath.includes('bundled') ? 'bundled' : 'wb-starter';
      console.log('  WB:     ✓ themecontrol.js (' + Math.round(assets.themecontrolJs.length / 1024) + ' KB from ' + src + ')');
    } catch (e) { console.warn('  WB:     ✗ themecontrol.js read error —', e.message); }
  } else {
    console.warn('  WB:     ✗ themecontrol.js not found (wb-starter missing and no bundled fallback)');
  }

  const cssPath = resolveWbFile(
    path.join('src', 'styles', 'themes.css'),
    'themes.css'
  );
  if (cssPath) {
    try {
      assets.themesCss = fs.readFileSync(cssPath, 'utf8');
      const src = cssPath.includes('bundled') ? 'bundled' : 'wb-starter';
      console.log('  WB:     ✓ themes.css (' + Math.round(assets.themesCss.length / 1024) + ' KB from ' + src + ')');
    } catch (e) { console.warn('  WB:     ✗ themes.css read error —', e.message); }
  } else {
    console.warn('  WB:     ✗ themes.css not found (wb-starter missing and no bundled fallback)');
  }

  return assets;
}

const WB_ASSETS = loadWbAssets();

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end',  () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'website';
}

function getLastTerminalCommand() {
  const home = os.homedir();
  const candidates = process.platform === 'win32'
    ? [path.join(home, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'PowerShell', 'PSReadLine', 'ConsoleHost_history.txt')]
    : [path.join(home, '.zsh_history'), path.join(home, '.bash_history'), path.join(home, '.history')];
  for (const f of candidates) {
    try {
      if (!fs.existsSync(f)) continue;
      const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      let cmd = lines[lines.length - 1];
      const m = cmd.match(/^:\s+\d+:\d+;(.*)$/);
      if (m) cmd = m[1].trim();
      if (cmd) return cmd;
    } catch {}
  }
  return null;
}

function openInBrowser(url) {
  if (process.env.NO_OPEN_BROWSER === '1' || process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'extension') return;
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

async function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`).toString();
      for (const line of out.split('\n').filter(Boolean)) {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && pid !== String(process.pid)) execSync(`taskkill /PID ${pid} /F`);
      }
    } else {
      const out = execSync(`lsof -ti tcp:${port}`).toString();
      for (const pid of out.split('\n').filter(Boolean)) {
        if (pid !== String(process.pid)) execSync(`kill -9 ${pid}`);
      }
    }
  } catch {}
}

function rmrf(dir) {
  if (!fs.existsSync(dir)) { return; }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { rmrf(full); }
    else                     { fs.unlinkSync(full); }
  }
  fs.rmdirSync(dir);
}

function buildPortfolioIndex(sites, version, baseUrl) {
  const LAYOUTS = { classic:'Classic', magazine:'Magazine', landing:'Landing', academic:'Academic', showcase:'Showcase' };
  const STYLES  = { 'dark-tech':'🌌 Dark Tech','light-clean':'☀️ Light','editorial':'📰 Editorial','interactive':'⚡ Interactive','academic':'🎓 Academic','minimal':'◻️ Minimal' };
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); } catch { return ''; } };
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const cards = sites.map(s => {
    const meta    = s.meta || {};
    const content = meta.content || {};
    const title   = esc(content.title || meta.subject || s.slug);
    const kicker  = esc(meta.autoKicker || '');
    const layout  = esc(LAYOUTS[meta.layout] || meta.layout || 'Classic');
    const style   = esc(STYLES[meta.style] || meta.style || '');
    const date    = fmtDate(s.created || s.publishedAt);
    const url     = baseUrl + s.slug + '/';
    return `<a class="site-card" href="${url}" target="_blank" rel="noopener">
  <div class="site-card-accent"></div>
  <div class="site-card-body">
    <div class="site-meta">${layout}${style ? ' · ' + style : ''}${date ? ' · ' + date : ''}</div>
    <h2>${title}</h2>
    ${kicker ? `<div class="site-kicker">${kicker}</div>` : ''}
  </div>
</a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>CieloVista · Published Sites</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polygon points='50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35' fill='%233b82f6'/></svg>">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0d0f14;--bg2:#13161e;--bg3:#1a1e2a;--border:#2a2e3d;--text:#d4d6e0;--muted:#6b7080;--purple:#8b7cf8;--blue:#4a9eff;--coral:#f07a5a;--teal:#3ecfa8}
body{background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,'Segoe UI',sans-serif;min-height:100vh;padding:0 0 80px}
header{text-align:center;padding:56px 24px 40px;background:radial-gradient(ellipse at 50% 0%,rgba(139,124,248,.1) 0%,transparent 65%);border-bottom:1px solid var(--border);margin-bottom:48px}
.kicker{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--purple);margin-bottom:14px}
h1{font-size:clamp(1.6rem,4vw,2.6rem);font-weight:700;background:linear-gradient(135deg,var(--blue),var(--purple),var(--coral));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:12px}
.release{display:inline-block;font-size:.75rem;font-weight:700;color:var(--purple);background:rgba(139,124,248,.12);border:1px solid rgba(139,124,248,.3);padding:3px 12px;border-radius:20px;letter-spacing:.06em}
.grid{max-width:1000px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.site-card{display:block;background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;transition:border-color .2s,transform .15s}
.site-card:hover{border-color:var(--purple);transform:translateY(-3px)}
.site-card-accent{height:3px;background:linear-gradient(90deg,var(--blue),var(--purple))}
.site-card-body{padding:22px}
.site-meta{font-size:.73rem;color:var(--muted);margin-bottom:10px}
.site-card h2{font-size:1rem;font-weight:700;color:var(--text);line-height:1.4;margin-bottom:8px}
.site-kicker{font-size:.76rem;color:var(--purple);font-weight:600}
footer{text-align:center;margin-top:56px;font-size:.78rem;color:var(--muted)}
</style>
</head>
<body>
<header>
  <div class="kicker">CieloVista Software</div>
  <h1>Published Sites</h1>
  <div class="release">r${version.release} &nbsp;·&nbsp; ${version.lastPublished}</div>
</header>
<div class="grid">
${cards}
</div>
<footer>Generated by CieloVista AI Website Generator · wb-starter design system</footer>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {

  if (req.method === 'GET' && req.url === '/wb/themecontrol.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'max-age=300' });
    res.end(WB_ASSETS.themecontrolJs);
    return;
  }

  if (req.method === 'GET' && req.url === '/wb/themes.css') {
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'max-age=300' });
    res.end(WB_ASSETS.themesCss);
    return;
  }

  if (req.method === 'GET' && req.url === '/trace-viewer') {
    const tvPath = path.join(ROOT_DIR, 'trace-viewer.html');
    try { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(tvPath, 'utf8')); }
    catch (e) { res.writeHead(500); res.end('trace-viewer.html not found: ' + e.message); }
    return;
  }

  if (req.method === 'GET' && req.url === '/trace-log-raw') {
    const logPath = path.join(ROOT_DIR, 'logs', 'ai-trace.log');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '');
    return;
  }

  if (req.method === 'GET' && req.url === '/trace-log-clear') {
    try { fs.writeFileSync(path.join(ROOT_DIR, 'logs', 'ai-trace.log'), '', 'utf8'); } catch {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Returns the configured output directory path so the UI can display it
  if (req.method === 'GET' && req.url === '/generated-dir') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ path: GEN_DIR }));
    return;
  }

  if (req.method === 'POST' && req.url === '/ai') {
    let body;
    try { body = await readBody(req); }
    catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Could not read body' })); return; }
    let prompt, provider, openaiModel;
    try { ({ prompt, provider, openaiModel } = JSON.parse(body)); }
    catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid JSON' })); return; }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    const send = (data) => res.write('data: ' + JSON.stringify(data) + '\n\n');
    try {
      if (provider === 'openai') {
        const result = await callOpenAI(prompt, openaiModel || 'gpt-4o-mini');
        send({ done: true, content: result.content });
      } else {
        const result = await callClaudeStreaming(prompt, (text, total) => send({ text, total }));
        send({ done: true, content: result.content });
      }
    } catch (claudeErr) {
      if (provider === 'auto') {
        const msg = (claudeErr.message || '').toLowerCase();
        const isCredits = msg.includes('429') || msg.includes('credit') || msg.includes('rate') || msg.includes('quota');
        if (isCredits && process.env.OPENAI) {
          try { const result = await callOpenAI(prompt, openaiModel || 'gpt-4o-mini'); send({ done: true, content: result.content }); res.end(); return; }
          catch (oaiErr) { send({ error: oaiErr.message }); res.end(); return; }
        }
      }
      send({ error: claudeErr.message });
    }
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/image') {
    let body;
    try { body = await readBody(req); }
    catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Could not read body' })); return; }
    let prompt, size, quality;
    try { ({ prompt, size, quality } = JSON.parse(body)); }
    catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid JSON' })); return; }
    if (!prompt) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'prompt is required' })); return; }
    if (!process.env.FALAI) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Image generation not configured. Set FALAI env var or cieloVista.falaiApiKey in VS Code settings.' }));
      return;
    }
    try {
      const { b64, mime } = await callFalAI(prompt, { size: size || 'landscape_16_9', quality: quality || 'standard' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, b64, mime }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/save') {
    try {
      const body = await readBody(req);
      const { subject, html, meta } = JSON.parse(body);
      if (!subject || !html) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'subject and html are required' })); }
      const slug = slugify(subject);
      let finalDir = path.join(GEN_DIR, slug);
      let n = 1;
      while (fs.existsSync(path.join(finalDir, 'index.html'))) { finalDir = path.join(GEN_DIR, slug + '-' + n++); }
      fs.mkdirSync(finalDir, { recursive: true });
      fs.writeFileSync(path.join(finalDir, 'index.html'), html, 'utf8');
      if (meta && typeof meta === 'object') {
        meta.stubCount = (html.match(/data-gen-prompt="/g) || []).length
                       + (html.match(/-img-stub shimmer/g) || []).length;
        fs.writeFileSync(path.join(finalDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
      }
      // Return path relative to GEN_DIR so URL stays correct regardless of where GEN_DIR is
      const rel = path.join(slug, 'index.html').replace(/\\/g, '/');
      console.log('[saved]', path.join(finalDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, path: rel, url: 'http://localhost:' + PORT + '/generated/' + rel, slug: path.basename(finalDir), dir: finalDir }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/list') {
    try {
      const sites = fs.readdirSync(GEN_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => {
          const f    = path.join(GEN_DIR, e.name, 'index.html');
          const mf   = path.join(GEN_DIR, e.name, 'meta.json');
          const s    = fs.existsSync(f) ? fs.statSync(f) : null;
          let   meta = null;
          try { if (fs.existsSync(mf)) meta = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch {}
          // Always scan HTML for stubs — accuracy is more important than skipping reads
          if (s) {
            try {
              const html = fs.readFileSync(f, 'utf8');
              const sc   = (html.match(/data-gen-prompt="/g) || []).length
                         + (html.match(/<div class="[^"]*-img-stub shimmer"/g) || []).length;
              if (!meta) meta = {};
              if (meta.stubCount !== sc) {
                meta.stubCount = sc;
                fs.writeFileSync(mf, JSON.stringify(meta, null, 2), 'utf8');
              }
            } catch {}
          }
          return { slug: e.name, url: 'http://localhost:' + PORT + '/generated/' + e.name + '/index.html', size: s ? s.size : 0, created: s ? s.birthtime.toISOString() : null, meta };
        })
        .filter(s => s.size > 0)
        .sort((a, b) => (b.created || '').localeCompare(a.created || ''));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(sites));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'DELETE' && req.url.startsWith('/delete/')) {
    const slug = req.url.slice('/delete/'.length).split('?')[0];
    if (!slug || slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid slug' }));
      return;
    }
    const targetDir = path.join(GEN_DIR, slug);
    if (!targetDir.startsWith(GEN_DIR)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    try {
      if (!fs.existsSync(targetDir)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Site not found: ' + slug }));
        return;
      }
      rmrf(targetDir);
      console.log('[deleted]', slug);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, slug }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/tools/last-command') {
    const command = getLastTerminalCommand();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: !!command, command, message: command ? 'Found last command.' : 'No history found.' }));
  }

  // ── Release number ────────────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/release') {
    const vf = path.join(ROOT_DIR, 'generated', 'release.json');
    const v = fs.existsSync(vf) ? JSON.parse(fs.readFileSync(vf, 'utf8')) : { release: 0 };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(v));
  }

  // ── Publish a site to GitHub Pages via git commit + push ──────────────────
  if (req.method === 'POST' && req.url.startsWith('/publish/')) {
    const slug = decodeURIComponent(req.url.slice('/publish/'.length).split('?')[0]);
    if (!slug || slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid slug' }));
    }
    const siteDir  = path.join(GEN_DIR, slug);
    const htmlFile = path.join(siteDir, 'index.html');
    if (!fs.existsSync(htmlFile)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Site not found: ' + slug }));
    }
    try {
      // Get page title from meta.json
      let title = slug;
      try { title = JSON.parse(fs.readFileSync(path.join(siteDir, 'meta.json'), 'utf8')).subject || slug; } catch {}

      // Derive GitHub Pages URL from git remote
      let pagesUrl = '';
      try {
        const remote = execSync('git -C "' + ROOT_DIR + '" remote get-url origin', { encoding: 'utf8' }).trim();
        // https://github.com/ORG/REPO.git  →  https://ORG.github.io/REPO/SLUG/
        const m = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
        if (m) pagesUrl = 'https://' + m[1].toLowerCase() + '.github.io/' + m[2] + '/' + slug + '/';
      } catch {}

      // ── Copy site into repo if GEN_DIR is outside the repo ──────────────────
      // When running via VS Code extension, GEN_DIR is in Documents —
      // we need the files inside the git repo to commit them.
      const repoGenDir  = path.join(ROOT_DIR, 'generated');
      const repoSiteDir = path.join(repoGenDir, slug);

      if (siteDir !== repoSiteDir) {
        // Copy index.html (and meta.json if present) into the repo
        fs.mkdirSync(repoSiteDir, { recursive: true });
        fs.copyFileSync(htmlFile, path.join(repoSiteDir, 'index.html'));
        const metaSrc = path.join(siteDir, 'meta.json');
        if (fs.existsSync(metaSrc)) {
          fs.copyFileSync(metaSrc, path.join(repoSiteDir, 'meta.json'));
        }
      }

      const repoHtmlFile = path.join(repoSiteDir, 'index.html');

      // ── Strip server-only stubs before publishing ──────────────────────────
      // The published page is static — no FLUX server available to fill these.
      // Remove img stubs (failed FLUX generations), shimmer divs, and empty wrappers.
      let html = fs.readFileSync(repoHtmlFile, 'utf8');
      const stubsBefore = (html.match(/data-gen-prompt="/g) || []).length
                        + (html.match(/-img-stub shimmer/g)  || []).length;

      if (stubsBefore > 0) {
        html = html.replace(/<img[^>]*data-gen-prompt="[^"]*"[^>]*>/g, '');
        html = html.replace(/<div class="[^"]*-img-stub shimmer"><\/div>/g, '');
        html = html.replace(/<div class="alt-card-media"><div class="[^"]*-img-stub shimmer"><\/div><\/div>/g, '<div class="alt-card-media" style="display:none"></div>');
        html = html.replace(/<div class="hero-img-wrap">\s*<\/div>/g, '');
        fs.writeFileSync(repoHtmlFile, html, 'utf8');
        console.log('[publish] stripped ' + stubsBefore + ' incomplete image stub(s) from', slug);
      }

      // Path of the generated folder relative to repo root
      const relDir = path.relative(ROOT_DIR, repoSiteDir).replace(/\\/g, '/');

      execSync('git -C "' + ROOT_DIR + '" add "' + relDir + '"', { stdio: 'pipe', encoding: 'utf8' });

      // ── Increment release + update manifest + rebuild portfolio index ─────
      const versionFile  = path.join(ROOT_DIR, 'generated', 'release.json');
      const manifestFile = path.join(ROOT_DIR, 'generated', 'published.json');

      let version = { release: 0 };
      try { version = JSON.parse(fs.readFileSync(versionFile, 'utf8')); } catch {}
      version.release = (version.release || 0) + 1;
      version.lastPublished = new Date().toISOString().split('T')[0];
      fs.writeFileSync(versionFile, JSON.stringify(version, null, 2), 'utf8');

      // Load or create manifest of all published sites
      let manifest = [];
      try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch {}

      // Upsert this site in the manifest
      const existing = manifest.findIndex(s => s.slug === slug);
      const entry = { slug, meta: Object.assign({}, version), publishedAt: new Date().toISOString() };
      // Get real meta from the copied site
      try { entry.meta = JSON.parse(fs.readFileSync(path.join(repoSiteDir, 'meta.json'), 'utf8')); } catch {}
      entry.publishedAt = new Date().toISOString();
      if (existing >= 0) manifest[existing] = entry; else manifest.push(entry);
      manifest.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
      fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

      // Build portfolio index from manifest
      const indexUrl  = pagesUrl.replace(slug + '/', '');
      const indexHtml = buildPortfolioIndex(manifest, version, indexUrl);
      fs.writeFileSync(path.join(repoGenDir, 'index.html'), indexHtml, 'utf8');

      execSync('git -C "' + ROOT_DIR + '" add generated/release.json generated/published.json generated/index.html', { stdio: 'pipe', encoding: 'utf8' });

      // Check if there is anything to commit
      let status = '';
      try { status = execSync('git -C "' + ROOT_DIR + '" status --porcelain "' + relDir + '"', { encoding: 'utf8' }); } catch {}
      if (!status.trim()) {
        // Nothing new to commit — already up to date, just return the URL
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, url: pagesUrl, alreadyPublished: true }));
      }

      execSync('git -C "' + ROOT_DIR + '" commit -m "Publish: ' + title.replace(/"/g, '\\"') + '"', { stdio: 'pipe', encoding: 'utf8' });
      execSync('git -C "' + ROOT_DIR + '" push origin main', { stdio: 'pipe', encoding: 'utf8' });

      // ── Delete the local HTML copy — it's now in git and on Pages ─────────
      // The manifest (published.json) remembers this site for future index rebuilds.
      // The meta.json stays so we can re-publish or update later.
      try { fs.unlinkSync(repoHtmlFile); } catch {}

      // ── Write publishedUrl back to source meta.json (demos) ──────────────
      // My Sites is the source of truth — the link lives in meta.json.
      try {
        const srcMeta = path.join(siteDir, 'meta.json');
        let m = {};
        try { m = JSON.parse(fs.readFileSync(srcMeta, 'utf8')); } catch {}
        m.publishedUrl = pagesUrl;
        fs.writeFileSync(srcMeta, JSON.stringify(m, null, 2), 'utf8');
      } catch {}

      console.log('[publish] pushed', slug, '→', pagesUrl);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, url: pagesUrl }));
    } catch (err) {
      const msg = (err.stderr || err.stdout || err.message || 'git error').toString().slice(0, 300);
      console.error('[publish] error:', msg);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: msg }));
    }
    return;
  }

  // Static files — served from ROOT_DIR (bundled/ when running as extension)
  // Note: generated sites are served via their actual path on disk, not via ROOT_DIR,
  // since GEN_DIR may be outside ROOT_DIR when GENERATED_DIR is set.
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // Serve generated sites from GEN_DIR when URL starts with /generated/
  if (urlPath.startsWith('/generated/')) {
    const rel      = urlPath.slice('/generated/'.length);
    const filePath = path.join(GEN_DIR, rel);
    if (filePath.startsWith(GEN_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const mime = MIME[path.extname(filePath)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + urlPath);
    }
    return;
  }

  const filePath = path.join(ROOT_DIR, urlPath);
  if (!filePath.startsWith(ROOT_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found: ' + urlPath);
  }
  const mime = MIME[path.extname(filePath)] || 'application/octet-stream';
  const headers = { 'Content-Type': mime };
  if (mime.startsWith('text/html')) headers['Cache-Control'] = 'no-store';
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
});

function startServer() {
  const hasFalAI = !!process.env.FALAI;
  const hasWb    = !!WB_ASSETS.themecontrolJs;
  server.listen(PORT, () => {
    const url = 'http://localhost:' + PORT + '/';
    console.log('\n  CieloVista Website Generator');
    console.log('  ─────────────────────────────');
    console.log('  Open:     ', url);
    console.log('  Saving:   ', GEN_DIR);
    console.log('  Images:   ', hasFalAI ? '✓ fal.ai FLUX ready' : '✗ image generation off (set FALAI env var or VS Code setting)');
    console.log('  Themes:   ', hasWb    ? '✓ 23 wb-starter themes ready' : '✗ wb-starter not found — using CSS var fallback');
    console.log('  Mode:     ', process.env.NODE_ENV === 'extension' ? 'VS Code extension' : 'standalone');
    if (process.env.NODE_ENV !== 'extension') {
      console.log('  Trace:    ', 'http://localhost:' + PORT + '/trace-viewer');
    }
    console.log();
    openInBrowser(url);
  });
}

server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn('Port', PORT, 'in use, killing and retrying...');
    await killPort(PORT);
    setTimeout(startServer, 1000);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

startServer();
