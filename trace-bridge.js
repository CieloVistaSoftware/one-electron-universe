import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const traceEnabled = process.env.CVT_TRACE === '1';
const generatedDir = process.env.GENERATED_DIR || path.join(process.cwd(), 'generated');
const siteSlug = process.env.CV_SITE_SLUG || '_shared';
const traceFilePath = process.env.CVT_TRACE_FILE || path.join(generatedDir, siteSlug, 'artifacts', 'traces', 'trace.json');
const traceSessionStart = Date.now();

let traceEntryId = 0;

const traceSession = {
  startedAt: new Date(traceSessionStart).toISOString(),
  entries: [],
};

function safeClone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { _traceError: 'Packet could not be serialized' };
  }
}

function flushTraceFile() {
  if (!traceEnabled) return;
  try {
    mkdirSync(path.dirname(traceFilePath), { recursive: true });
    writeFileSync(traceFilePath, JSON.stringify(traceSession, null, 2), 'utf-8');
  } catch (error) {
    console.error('[trace] failed to write trace file:', error?.message || error);
  }
}

export function traceInit() {
  flushTraceFile();
  if (traceEnabled) {
    console.log(`[trace] enabled -> ${traceFilePath}`);
  }
}

export function tracePacket(direction, type, packet, startedAt, extras = {}) {
  if (!traceEnabled) return;

  const now = Date.now();
  const durationMs = typeof startedAt === 'number' ? Math.max(0, now - startedAt) : null;

  traceSession.entries.push({
    id: ++traceEntryId,
    direction,
    type,
    time: new Date(now).toISOString(),
    elapsedMs: Math.max(0, now - traceSessionStart),
    durationMs,
    statusCode: extras.statusCode ?? null,
    error: extras.error ?? null,
    model: extras.model ?? null,
    messageCount: extras.messageCount ?? null,
    contextChars: extras.contextChars ?? null,
    usage: extras.usage ?? null,
    cost: extras.cost ?? null,
    rateLimits: extras.rateLimits ?? null,
    packet: safeClone(packet),
  });

  flushTraceFile();
}
