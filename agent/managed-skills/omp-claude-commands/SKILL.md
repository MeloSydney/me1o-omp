---
name: omp-claude-commands
description: "When migrating pi prompt-sources slash commands to omp, or creating new omp /slash commands from markdown"
---

# omp Markdown Slash Commands

omp loads markdown slash commands via Claude-Code compatibility (not pi's prompt-sources).

## Directories
- **User-global**: `~/.claude/commands/*.md` (setting `commands.enableClaudeUser`, default on)
- **Project**: `.claude/commands/*.md` (setting `commands.enableClaudeProject`, default on)

Command name = filename stem. **No `MMDD_` date prefix** — the AGENTS.md date-prefix rule is for generated reports/docs, not command definitions; a prefix would rename the command.

## File format
```markdown
---
description: One-line description shown in command list
argument-hint: [--dry-run]
allowed-tools: bash
---
Prompt body injected when the command runs.
Use $ARGUMENTS for the raw arg string, $1 $2 … for positional.
```

## Migration from pi
pi's `~/.pi/agent/prompt-sources/<MMDD>_name.md` → omp's `~/.claude/commands/name.md`.
- Strip the `MMDD_` date prefix from the filename.
- Keep frontmatter `description`; add `argument-hint`/`allowed-tools` as needed.
- Replace hardcoded dry-run/apply branching with `$ARGUMENTS` checks where useful.
- Script paths referenced in the body stay absolute and unchanged.

## Reload
Commands load at session start. In a running session, `/reload-plugins` reloads them.

## Richer commands (TS/JS extension)
For logic beyond prompt injection, write an extension in `~/.omp/agent/extensions/` and register:
```ts
export default function (pi) {
  pi.registerCommand("name", {
    description: "...",
    getArgumentCompletions(input) { /* return [{label,value,description}] or null */ },
    async handler(args, ctx) { /* ctx.ui.notify(...) */ },
  });
}
```

## Reference commands
- `~/.claude/commands/agent-name.md` — syncs Herdr agent names from pane labels via `sh /Users/melo/src-skills/src-pi-agentname/scripts/sync.sh`.
