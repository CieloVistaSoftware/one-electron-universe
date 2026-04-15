// ai-handler.js
// Handles all AI API calls — Claude streaming, OpenAI chat, fal.ai FLUX image generation
// Uses Node 18+ native fetch — no node-fetch dependency required.

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname     = path.dirname(fileURLToPath(import.meta.url));
const generatedDir  = process.env.GENERATED_DIR || path.join(__dirname, 'generated');
const siteSlug      = process.env.CV_SITE_SLUG || '_shared';
const traceLogFile  = path.join(generatedDir, siteSlug, 'artifacts', 'logs', 'ai-trace.log');

function writeTraceLine(level, message) {
  try {
    fs.mkdirSync(path.dirname(traceLogFile), { recursive: true });
    fs.appendFileSync(traceLogFile, `[${new Date().toISOString()}] [${level}] ${message}\n`, 'utf8');
  } catch { /* best-effort */ }
}

// ── Streaming Claude call ─────────────────────────────────────────────────────
export async function callClaudeStreaming(prompt, onChunk) {
  const apiKey = process.env.CLAUDE;
  if (!apiKey) {
    writeTraceLine('error', 'CLAUDE env var not set');
    throw new Error('CLAUDE API key not set in environment variable CLAUDE');
  }

  const model     = 'claude-sonnet-4-6';
  const startedAt = Date.now();
  writeTraceLine('request', `→ Claude STREAM | model=${model} | prompt_len=${prompt.length} | preview: ${prompt.slice(0, 100)}…`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        stream:     true,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = `Claude ${res.status}: ${err?.error?.message || res.statusText}`;
      writeTraceLine('error', `✗ HTTP ${res.status} | ${msg}`);
      throw new Error(msg);
    }

    let accumulated = '';
    let usage       = null;
    let stopReason  = null;
    let buffer      = '';

    for await (const chunk of res.body) {
      buffer += Buffer.from(chunk).toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) { continue; }
        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]')   { continue; }

        let event;
        try { event = JSON.parse(raw); } catch { continue; }

        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const text = event.delta.text || '';
          accumulated += text;
          if (onChunk) { onChunk(text, accumulated.length); }
        }

        if (event.type === 'message_delta') {
          stopReason = event.delta?.stop_reason ?? stopReason;
          if (event.usage) { usage = event.usage; }
        }
      }
    }

    const elapsedMs = Date.now() - startedAt;
    writeTraceLine('reply',
      `← Claude STREAM OK | ${elapsedMs}ms | ${accumulated.length} chars | stop=${stopReason} | in=${usage?.input_tokens} out=${usage?.output_tokens}`
    );

    return { content: accumulated, usage, stopReason };

  } catch (err) {
    const elapsedMs = Date.now() - startedAt;
    if (err.name === 'AbortError') {
      const msg = `Claude streaming timed out after ${elapsedMs}ms`;
      writeTraceLine('error', `✗ ${msg}`);
      throw new Error(msg);
    }
    writeTraceLine('error', `✗ ${elapsedMs}ms | ${err.message}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Non-streaming OpenAI chat call ────────────────────────────────────────────
export async function callOpenAI(prompt, model = 'gpt-4o-mini') {
  const apiKey = process.env.OPENAI;
  if (!apiKey) {
    writeTraceLine('error', 'OPENAI env var not set');
    throw new Error('OPENAI API key not set in environment variable OPENAI');
  }

  const startedAt = Date.now();
  writeTraceLine('request', `→ OpenAI | model=${model} | prompt_len=${prompt.length}`);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: 'Generate website content as structured JSON.' },
          { role: 'user',   content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    const elapsedMs = Date.now() - startedAt;

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = `OpenAI ${res.status}: ${err?.error?.message || res.statusText}`;
      writeTraceLine('error', `✗ HTTP ${res.status} | ${elapsedMs}ms | ${msg}`);
      throw new Error(msg);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    writeTraceLine('reply', `← OpenAI OK | ${Date.now() - startedAt}ms | ${text.length} chars`);

    return { content: text };

  } catch (err) {
    writeTraceLine('error', `✗ ${Date.now() - startedAt}ms | ${err.message}`);
    throw err;
  }
}

// ── fal.ai FLUX image generation ──────────────────────────────────────────────
// Uses FLUX models — better quality than DALL-E 3 at a fraction of the cost.
//
// Model selection:
//   standard → fal-ai/flux/schnell  (~$0.003/img, very fast, good quality)
//   hd       → fal-ai/flux-pro/v1.1 (~$0.05/img,  slower,  excellent quality)
//
// size param maps to fal.ai image_size presets:
//   'landscape_16_9' → hero images  (1344×768)
//   'square_hd'      → card images  (1024×1024)
//
// Returns raw base64-encoded JPEG/PNG string (no data: prefix — caller adds it).

export async function callFalAI(prompt, { size = 'landscape_16_9', quality = 'standard' } = {}) {
  const apiKey = process.env.FALAI;
  if (!apiKey) {
    writeTraceLine('error', 'FALAI env var not set — cannot generate images');
    throw new Error('FALAI API key not set. Add FALAI=... to your Windows environment variables to enable image generation.');
  }

  const model     = quality === 'hd' ? 'fal-ai/flux-pro/v1.1' : 'fal-ai/flux/schnell';
  const startedAt = Date.now();
  writeTraceLine('request', `→ fal.ai ${model} | size=${size} quality=${quality} | prompt: ${prompt.slice(0, 80)}…`);

  try {
    const body = {
      prompt,
      image_size:   size,
      num_images:   1,
      enable_safety_checker: true,
    };

    // schnell uses num_inference_steps, pro does not
    if (model === 'fal-ai/flux/schnell') {
      body.num_inference_steps = 4;
    }

    const res = await fetch(`https://fal.run/${model}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const elapsedMs = Date.now() - startedAt;

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = `fal.ai ${res.status}: ${err?.detail || err?.message || res.statusText}`;
      writeTraceLine('error', `✗ HTTP ${res.status} | ${elapsedMs}ms | ${msg}`);
      throw new Error(msg);
    }

    const data     = await res.json();
    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error(`fal.ai returned no image URL. Response: ${JSON.stringify(data).slice(0, 200)}`);
    }

    // Fetch the image and convert to base64 so the generated HTML stays self-contained
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) { throw new Error(`Could not fetch fal.ai image from URL: ${imgRes.status}`); }

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const b64       = imgBuffer.toString('base64');
    const mime      = data.images[0].content_type || 'image/jpeg';

    writeTraceLine('reply', `← fal.ai OK | ${elapsedMs}ms | ${model} | ${(b64.length / 1024).toFixed(0)} KB b64 | ${imageUrl.slice(0, 60)}…`);

    return { b64, mime }; // b64 is raw base64, mime is e.g. 'image/jpeg'

  } catch (err) {
    writeTraceLine('error', `✗ fal.ai ${Date.now() - startedAt}ms | ${err.message}`);
    throw err;
  }
}

// Keep callClaude as a non-streaming alias for backward compatibility
export async function callClaude(prompt) {
  const result = await callClaudeStreaming(prompt, null);
  return { content: result.content };
}
