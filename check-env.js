// check-env.js
// Ensures required API keys are set in environment before starting the server

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