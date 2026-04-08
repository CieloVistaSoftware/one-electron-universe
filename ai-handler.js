// ai-handler.js
// Handles all AI API calls for Claude and OpenAI
// Used by server.js for backend-only AI logic

import fetch from 'node-fetch';

export async function callClaude(prompt) {
  // Read Claude API key from environment variable
  const apiKey = process.env.CLAUDE;
  if (!apiKey) throw new Error('CLAUDE API key not set in environment variable CLAUDE');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude ${res.status}: ${err?.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return { content: data.content?.[0]?.text || '' };
}

export async function callOpenAI(prompt, model = 'gpt-4o-mini') {
  // Read OpenAI API key from environment variable
  const apiKey = process.env.OPENAI;
  if (!apiKey) throw new Error('OPENAI API key not set in environment variable OPENAI');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: 'Generate website content as structured JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI ${res.status}: ${err?.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content || '' };
}
