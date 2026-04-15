// test-claude.mjs — standalone Claude API connection test
// Run: node test-claude.mjs
// Does NOT require the server to be running.

import fetch from 'node-fetch';

const apiKey = process.env.CLAUDE;

console.log('=== Claude API Connection Test ===');
console.log(`Timestamp : ${new Date().toISOString()}`);
console.log(`Key set   : ${!!apiKey}`);
console.log(`Key prefix: ${apiKey ? apiKey.slice(0, 20) + '...' : 'MISSING'}`);
console.log('');

if (!apiKey) {
  console.error('FAIL: CLAUDE env var is not set.');
  console.error('Fix: set CLAUDE=sk-ant-... in this terminal then re-run.');
  process.exit(1);
}

const model   = 'claude-sonnet-4-6';
const payload = {
  model,
  max_tokens: 32,
  messages: [{ role: 'user', content: 'Reply with only the word PONG.' }],
};

console.log(`Model     : ${model}`);
console.log(`Sending   : "${payload.messages[0].content}"`);
console.log('');

const t0 = Date.now();

const controller = new AbortController();
const timer = setTimeout(() => {
  console.error(`TIMEOUT: no response after 30s`);
  controller.abort();
}, 30000);

try {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });

  const elapsed = Date.now() - t0;
  console.log(`HTTP status : ${res.status} (${elapsed}ms)`);

  const data = await res.json();

  if (!res.ok) {
    console.error(`FAIL: ${data?.error?.type} — ${data?.error?.message}`);
    process.exit(1);
  }

  const reply = data.content?.[0]?.text ?? '(empty)';
  console.log(`Response    : "${reply}"`);
  console.log(`Stop reason : ${data.stop_reason}`);
  console.log(`Input tokens: ${data.usage?.input_tokens}`);
  console.log(`Output tokens: ${data.usage?.output_tokens}`);
  console.log('');
  console.log('PASS: Claude API is working.');

} catch (err) {
  if (err.name === 'AbortError') {
    console.error('FAIL: Request aborted — connection timed out after 30s.');
    console.error('Possible causes: firewall blocking outbound HTTPS, proxy, or VPN.');
  } else {
    console.error(`FAIL: ${err.message}`);
  }
  process.exit(1);
} finally {
  clearTimeout(timer);
}
