/** @managed-by ai-coding-trace */
// ai-coding-trace-omp-extension-marker v1
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CLIENT_PATH = path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.r2c', 'scripts', 'hook-plugin-client.js');
const TOOLS = new Set(['edit', 'write', 'ast_edit', 'bash', 'eval', 'python', 'notebook']);
const MAX_TEXT_BYTES = 5 * 1024 * 1024;
let clientPromise;

function boundedEvent(event) {
  let bytes = 0;
  let entries = 0;
  function visit(value, depth = 0) {
    if (depth > 16 || ++entries > 10_000) return false;
    if (typeof value === 'string') {
      if (value.length > MAX_TEXT_BYTES - bytes) return false;
      bytes += Buffer.byteLength(value);
      return bytes <= MAX_TEXT_BYTES;
    }
    if (!value || typeof value !== 'object') return true;
    if (Array.isArray(value) && value.length > 10_000 - entries) return false;
    for (const key in value) {
      if (Object.hasOwn(value, key) && (!visit(key, depth + 1) || !visit(value[key], depth + 1))) return false;
    }
    return true;
  }
  try { return visit(event); } catch { return false; }
}

export default function ompExtension(pi) {
  const sessionCwd = process.cwd();
  for (const eventName of ['tool_call', 'tool_result']) {
    pi.on(eventName, async (event, ctx) => {
      const deadline = Number(process.hrtime.bigint() / 1_000_000n) + 4_000;
      if (!TOOLS.has(event?.toolName)) return;
      let sessionId;
      try { sessionId = ctx?.sessionManager?.getSessionId?.(); } catch { return; }
      if (typeof sessionId !== 'string' || !sessionId.trim() || !event.toolCallId) return;
      const input = { toolName: event.toolName, toolCallId: event.toolCallId, input: event.input, details: event.details, isError: event.isError };
      if (!boundedEvent(input)) return;
      let timer;
      try {
        clientPromise ??= import(pathToFileURL(CLIENT_PATH).href).then((module) => module.createHookPluginClient()).catch(() => {
          clientPromise = undefined;
          return undefined;
        });
        const client = await Promise.race([clientPromise, new Promise((resolve) => {
          timer = setTimeout(resolve, Math.max(1, deadline - Number(process.hrtime.bigint() / 1_000_000n)));
        })]);
        await client?.run('omp', { eventName, event: input, cwd: ctx.cwd || sessionCwd, sessionId }, deadline);
      } catch {} finally { clearTimeout(timer); }
    });
  }
}
