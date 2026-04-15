// test-server.js — tests the /ai endpoint on the running server
import http from 'http';

const body = JSON.stringify({
  prompt: 'Reply with only the word PONG.',
  provider: 'claude',
});

console.log('=== Testing /ai endpoint on localhost:3000 ===');
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('');

const t0 = Date.now();

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/ai',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const elapsed = Date.now() - t0;
    console.log(`HTTP status : ${res.statusCode} (${elapsed}ms)`);
    try {
      const json = JSON.parse(data);
      if (json.error) {
        console.error(`FAIL: ${json.error}`);
        process.exit(1);
      }
      console.log(`Response    : "${json.content?.slice(0, 100)}"`);
      console.log('');
      console.log('PASS: Server /ai endpoint is working with new code.');
    } catch {
      console.error(`FAIL: Could not parse response: ${data}`);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`FAIL: Could not connect to server — ${e.message}`);
  console.error('Is the server running? Run: npm start');
  process.exit(1);
});

req.setTimeout(35000, () => {
  console.error(`FAIL: Server did not respond within 35s`);
  req.destroy();
  process.exit(1);
});

req.write(body);
req.end();
