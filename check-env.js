// check-env.js
// Ensures required API keys are set and runs startup audits before server launch.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recursively collect script files from this workspace.
// We keep this intentionally simple and synchronous because this script runs
// during prestart and should fail fast before the server boots.
//
// Why recurse manually instead of using a glob package:
// 1) no extra dependency needed
// 2) predictable behavior in CI and local runs
// 3) easier to exclude directories like node_modules/.git
function collectScriptFiles(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      collectScriptFiles(fullPath, out);
      continue;
    }
    if (/\.(mjs|cjs|js)$/i.test(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
}

// Convert a character index back into a 1-based line number.
// We use this to print actionable audit errors in "file:line" format.
function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function maskCommentsKeepLayout(source) {
  // Preserve length/newlines so match indices map back to original source lines.
  //
  // Problem this solves:
  // Our regex scans for import specifiers. If examples in comments contain
  // strings like "C:/...", they would be false positives unless we ignore
  // comments first.
  //
  // Important detail:
  // We replace comment characters with spaces (not delete them) so every
  // index still points to the same line/column position in the original text.
  const withoutBlock = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  return withoutBlock.replace(/(^|[^:\\])\/\/.*$/gm, (m, p1) => `${p1}${m.slice(p1.length).replace(/[^\n]/g, ' ')}`);
}

// Audit for a Windows-specific ESM footgun:
// importing absolute Windows paths directly (e.g., "C:\\x\\y\\z.js")
// throws ERR_UNSUPPORTED_ESM_URL_SCHEME in Node's ESM loader.
//
// Safe alternatives include:
// - relative imports
// - package imports
// - dynamic import with file URL: import(pathToFileURL(absPath).href)
function auditUnsupportedWindowsEsmImports(rootDir) {
  const files = collectScriptFiles(rootDir);
  const issues = [];

  const patterns = [
    // import x from 'C:/...'
    /import\s+[\s\S]*?\s+from\s*['"]([A-Za-z]:[\\/][^'"]+)['"]/g,
    // import 'C:/...'
    /import\s*['"]([A-Za-z]:[\\/][^'"]+)['"]/g,
    // import('C:/...')
    /import\s*\(\s*['"]([A-Za-z]:[\\/][^'"]+)['"]\s*\)/g,
  ];

  // Scan each script file for any absolute-drive import specifiers.
  // We reset pattern.lastIndex on each file so global regex state does not
  // leak between files.
  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');
    const auditSource = maskCommentsKeepLayout(source);

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(auditSource)) !== null) {
        const absoluteSpecifier = match[1];
        const line = lineNumberAt(source, match.index);
        issues.push({
          file: path.relative(rootDir, filePath).replace(/\\/g, '/'),
          line,
          specifier: absoluteSpecifier,
        });
      }
    }
  }

  // Fail the prestart step so this never reaches runtime.
  // This makes the problem visible in CI and local development immediately.
  if (issues.length) {
    console.error('\nERROR: ESM audit failed: Windows absolute-path import(s) detected.');
    console.error('Use file URLs for dynamic imports: import(pathToFileURL(absPath).href).');
    for (const issue of issues) {
      console.error(` - ${issue.file}:${issue.line} -> ${issue.specifier}`);
    }
    process.exit(1);
  }
}

// Run audits first so invalid code is blocked before we check environment keys.
auditUnsupportedWindowsEsmImports(__dirname);

// Existing startup requirement: at least one AI provider key must be present.
const hasClaude = !!process.env.CLAUDE;
const hasOpenAI = !!process.env.OPENAI;
if (!hasClaude && !hasOpenAI) {
  console.error(
    `\nERROR: At least one AI API key is required (CLAUDE or OPENAI).\n` +
    `Example (Windows):\n  set CLAUDE=sk-ant-...\n  set OPENAI=sk-...\n` +
    `Example (Linux/macOS):\n  export CLAUDE=sk-ant-...\n  export OPENAI=sk-...\n`
  );
  process.exit(1);
}