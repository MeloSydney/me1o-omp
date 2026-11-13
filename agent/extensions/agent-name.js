// agent-name — native omp slash command (no Claude/OpenCode compat dirs).
// Syncs Herdr agent names from pane labels via sync.sh. Mirrors pi's
// ~/.pi/agent/prompt-sources/agent-name.md but lives entirely under OMP.
// Usage: /agent-name          → dry-run preview, then apply, then report.
//        /agent-name --dry-run → preview only.
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const SYNC_SCRIPT = join(process.env.SRC_SKILLS_ROOT || join(homedir(), "src-skills"), "src-pi-agentname/scripts/sync.sh");

function fmt(lines) {
  if (!lines.length) return "(no output)";
  const rows = lines.map((line) => {
    const m = line.match(
      /^(ok|renamed|would rename|skip-[\w-]+)\s+(\S+)\s+(?:=|->|:)?\s*(.*)$/
    );
    if (!m) return `| ${line} |  |  |`;
    let [, action, pane, rest] = m;
    if (action === "would rename") action = "would-rename";
    return `| ${pane} | ${action} | ${rest.trim()} |`;
  });
  return `| pane | action | value |\n| --- | --- | --- |\n${rows.join("\n")}`;
}

function runSh(arg) {
  try {
    const out = execFileSync("sh", arg ? [SYNC_SCRIPT, arg] : [SYNC_SCRIPT], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, out: out.trim() };
  } catch (err) {
    const out = [err.stdout, err.stderr].filter(Boolean).join("\n").trim();
    return { ok: false, out: out || String(err.message || err) };
  }
}

export default function ompExtension(pi) {
  pi.registerCommand("agent-name", {
    description: "Sync Herdr agent names from pane labels",
    argumentHint: "[--dry-run]",
    async handler(args, ctx) {
      const dryOnly = (args || "").trim() === "--dry-run";
      const dry = runSh("--dry-run");
      if (!dry.ok) {
        ctx.ui.notify("agent-name dry-run failed: " + dry.out, "error");
        return;
      }
      if (dryOnly) {
        ctx.ui.notify("agent-name dry-run\n" + fmt(dry.out.split("\n")), "info");
        return;
      }
      const apply = runSh("");
      if (!apply.ok) {
        ctx.ui.notify("agent-name apply failed: " + apply.out, "error");
        return;
      }
      ctx.ui.notify("agent-name\n" + fmt(apply.out.split("\n")), "info");
    },
  });
}
