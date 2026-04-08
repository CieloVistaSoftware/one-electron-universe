/**
 * server.js — CieloVista Website Generator local server
 *
 * Serves the generator UI and saves generated HTML files to:
 *   generated/{subject-slug}/index.html
 *
 * Run:  node server.js
 * Open: http://localhost:3000
 */



import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { callClaude, callOpenAI } from './ai-handler.js';
import { exec, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT     = 3000;

function getLastTerminalCommand() {
  const home = os.homedir();
  const candidates = process.platform === 'win32'
    ? [
        path.join(home, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'PowerShell', 'PSReadLine', 'ConsoleHost_history.txt'),
      ]
    : [
        path.join(home, '.zsh_history'),
        path.join(home, '.bash_history'),
        path.join(home, '.history'),
      ];

  for (const historyPath of candidates) {
    try {
      if (!fs.existsSync(historyPath)) continue;
      const lines = fs.readFileSync(historyPath, 'utf8')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
      if (!lines.length) continue;

      let cmd = lines[lines.length - 1];
      const zshMatch = cmd.match(/^:\s+\d+:\d+;(.*)$/);
      if (zshMatch) cmd = zshMatch[1].trim();
      if (cmd) return cmd;
    } catch {
      // Ignore unreadable history files and continue.
    }
  }

  return null;
}

function openInBrowser(url) {
  // Allow disabling auto-open for CI/tests or headless runs.
  if (process.env.NO_OPEN_BROWSER === '1' || process.env.NODE_ENV === 'test') {
    return;
  }

  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      console.warn(`Could not auto-open browser: ${err.message}`);
    }
  });
}

// Helper to kill process on port (Windows & Unix)
async function killPort(port) {
  const isWin = process.platform === 'win32';
  try {
    if (isWin) {
      // Find PID using port
      const output = execSync(`netstat -ano | findstr :${port}`);
      const lines = output.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== process.pid.toString()) {
          execSync(`taskkill /PID ${pid} /F`);
        }
      }
    } else {
      // Unix: lsof/kill
      const output = execSync(`lsof -ti tcp:${port}`);
      const pids = output.toString().split('\n').filter(Boolean);
      for (const pid of pids) {
        if (pid && pid !== process.pid.toString()) {
          execSync(`kill -9 ${pid}`);
        }
      }
    }
  } catch (e) {
    // Ignore if nothing to kill
  }
}
const ROOT_DIR = __dirname;
const GEN_DIR  = path.join(ROOT_DIR, 'generated');

// Ensure generated folder exists
if (!fs.existsSync(GEN_DIR)) { fs.mkdirSync(GEN_DIR, { recursive: true }); }

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ── Read body helper ──────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end',  () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ── Slugify ───────────────────────────────────────────────────────────────────
function slugify(subject) {
  return subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'website';
}

// ── Request handler ───────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // POST /ai — handle AI requests (Claude/OpenAI) server-side
  if (req.method === 'POST' && req.url === '/ai') {
    try {
      const body = await readBody(req);
      const { prompt, provider, openaiModel } = JSON.parse(body);
      let result;
      if (provider === 'claude') {
        result = await callClaude(prompt);
      } else if (provider === 'openai') {
        result = await callOpenAI(prompt, openaiModel || 'gpt-4o-mini');
      } else if (provider === 'auto') {
        // Try Claude, fallback to OpenAI if Claude fails
        try {
          result = await callClaude(prompt);
        } catch (err) {
          result = await callOpenAI(prompt, openaiModel || 'gpt-4o-mini');
        }
      } else {
        throw new Error('Unknown provider');
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, content: result.content }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /save — receive generated HTML, write to generated/{slug}/index.html
  if (req.method === 'POST' && req.url === '/save') {
    try {
      const body    = await readBody(req);
      const payload = JSON.parse(body);
      const { subject, html } = payload;

      if (!subject || !html) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'subject and html are required' }));
      }

      const slug    = slugify(subject);
      const siteDir = path.join(GEN_DIR, slug);
      const outFile = path.join(siteDir, 'index.html');

      // If slug already exists, append a number
      let finalDir = siteDir;
      let counter  = 1;
      while (fs.existsSync(path.join(finalDir, 'index.html'))) {
        finalDir = `${siteDir}-${counter++}`;
      }
      fs.mkdirSync(finalDir, { recursive: true });
      const finalFile = path.join(finalDir, 'index.html');
      fs.writeFileSync(finalFile, html, 'utf8');

      const relativePath = path.relative(ROOT_DIR, finalFile).replace(/\\/g, '/');
      console.log(`[saved] ${relativePath}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok:   true,
        path: relativePath,
        url:  `http://localhost:${PORT}/${relativePath}`,
        slug: path.basename(finalDir),
      }));

    } catch (err) {
      console.error('[save error]', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /list — return all generated sites
  if (req.method === 'GET' && req.url === '/list') {
    try {
      const sites = fs.readdirSync(GEN_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => {
          const indexFile = path.join(GEN_DIR, e.name, 'index.html');
          const exists    = fs.existsSync(indexFile);
          const stat      = exists ? fs.statSync(indexFile) : null;
          return {
            slug:    e.name,
            url:     `http://localhost:${PORT}/generated/${e.name}/index.html`,
            size:    stat ? stat.size : 0,
            created: stat ? stat.birthtime.toISOString() : null,
          };
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

  // GET /tools/last-command — best-effort read from shell history
  if (req.method === 'GET' && req.url === '/tools/last-command') {
    const command = getLastTerminalCommand();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: !!command,
      command,
      message: command ? 'Found last command from shell history.' : 'No terminal history command found.',
    }));
  }

  // GET static files
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') { urlPath = '/index.html'; }

  const filePath = path.join(ROOT_DIR, urlPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end(`Not found: ${urlPath}`);
  }

  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
});


// Try to start server, kill port if needed
function startServer() {
  server.listen(PORT, () => {
    const appUrl = `http://localhost:${PORT}/`;
    console.log(`\n  CieloVista Website Generator`);
    console.log(`  ─────────────────────────────`);
    console.log(`  Open: ${appUrl}`);
    console.log(`  Generated sites → createWebsite/generated/YOURWEBSITENAME/index.html\n`);
    openInBrowser(appUrl);
  });
}

server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`Port ${PORT} in use, killing process and retrying...`);
    await killPort(PORT);
    setTimeout(() => startServer(), 1000); // Wait a moment for port to free
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

startServer();
