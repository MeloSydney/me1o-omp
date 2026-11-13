// fleet — native omp slash command to view the subagent fleet.
// Mirrors pi's /fleet: shows available (bundled) agents and, when reachable,
// live running/finished subagents in the current session.
// Usage: /fleet [--all]   (--all = also list disabled agents)
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const AGENTS_DIR = process.env.PI_CODING_AGENT_DIR
  ? join(process.env.PI_CODING_AGENT_DIR, "agents")
  : join(process.env.HOME || "/tmp", ".omp/agent/agents");

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

function listAvailableAgents() {
  if (!existsSync(AGENTS_DIR)) return [];
  const agents = [];
  for (const f of readdirSync(AGENTS_DIR)) {
    if (!f.endsWith(".md")) continue;
    const fm = parseFrontmatter(readFileSync(join(AGENTS_DIR, f), "utf8"));
    if (fm.name) agents.push({ name: fm.name, description: fm.description || "" });
  }
  agents.sort((a, b) => a.name.localeCompare(b.name));
  return agents;
}

function readDisabledAgents() {
  const cfgPath = process.env.PI_CODING_AGENT_DIR
    ? join(process.env.PI_CODING_AGENT_DIR, "config.yml")
    : join(process.env.HOME || "/tmp", ".omp/agent/config.yml");
  if (!existsSync(cfgPath)) return [];
  const text = readFileSync(cfgPath, "utf8");
  const m = text.match(/disabledAgents:\s*\[([^\]]*)\]/);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

// Best-effort: probe several likely accessors on the handler ctx for the live
// subagent list (the Agent Hub uses a private manager; these are public guesses).
function getLiveSubagents(ctx) {
  const candidates = [
    () => ctx?.getSubagents?.(),
    () => ctx?.session?.getSubagents?.(),
    () => ctx?.sessionManager?.getSubagents?.(),
    () => ctx?.session?.subagents,
    () => ctx?.subagents,
  ];
  for (const fn of candidates) {
    try {
      const v = fn();
      if (Array.isArray(v) && v.length && v[0] && typeof v[0] === "object" && "agent" in v[0]) {
        return v;
      }
    } catch {
      /* accessor unavailable — try next */
    }
  }
  return null;
}

function fmtLive(list) {
  if (!list.length) return "(no subagents in this session)";
  return list
    .map((s) => {
      const status = s.status || "?";
      const desc = s.description ? ` — ${String(s.description).slice(0, 40)}` : "";
      const task = s.task ? ` [${String(s.task).slice(0, 30)}]` : "";
      return `• ${s.agent || "?"} (${status})${task}${desc}`;
    })
    .join("\n");
}

export default function ompExtension(pi) {
  pi.registerCommand("fleet", {
    description: "View the subagent fleet (available agents + live subagents)",
    argumentHint: "[--all]",
    async handler(args, ctx) {
      const showAll = (args || "").trim().includes("--all");
      const disabled = readDisabledAgents();
      let available = listAvailableAgents();
      if (!showAll && disabled.length) {
        available = available.filter((a) => !disabled.includes(a.name));
      }

      const lines = [];
      lines.push(`Fleet — ${available.length} available agent${available.length === 1 ? "" : "s"}${disabled.length && !showAll ? ` (${disabled.length} disabled, use --all)` : ""}`);
      lines.push("");
      for (const a of available) {
        const flag = disabled.includes(a.name) ? " [disabled]" : "";
        lines.push(`• ${a.name}${flag}: ${a.description}`);
      }

      const live = getLiveSubagents(ctx);
      if (live) {
        lines.push("");
        lines.push(`Live subagents — ${live.length}`);
        lines.push(fmtLive(live));
      } else {
        lines.push("");
        lines.push("Live subagents: not reachable from command context — open Agent Hub (Alt+A) or run `omp ps` for the live view.");
      }

      ctx.ui.notify(lines.join("\n"), "info");
    },
  });
}
