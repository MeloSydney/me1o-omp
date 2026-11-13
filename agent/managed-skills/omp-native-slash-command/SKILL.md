---
name: omp-native-slash-command
description: Register a native slash command in omp via ~/.omp/agent/extensions/*.js using pi.registerCommand; use when adding custom /commands to omp or migrating pi prompt-sources commands to omp
---

# omp native slash command

omp has no markdown command directory of its own. Custom typed `/commands` are JS/TS extensions.

## Location

`~/.omp/agent/extensions/<name>.js` (or `.ts`). Auto-discovered at session start. New files are NOT hot-loaded by `/reload-plugins`; start a new omp session.

## API

```js
export default function ompExtension(pi) {
  pi.registerCommand("my-cmd", {
    description: "One-line description",
    argumentHint: "[--flag] <arg>",
    async handler(args, ctx) {
      // args = string after the command name (trim/parse yourself)
      // ctx.ui.notify(message, "info"|"warning"|"error") displays to user
    },
  });
}
```

- `pi` also exposes `pi.on(event, fn)`, `pi.registerTool`, `pi.registerGlobal`, `pi.registerShortcut`, etc. (see existing `herdr-omp-agent-state.ts` / `ai-trace-bridge.js` for patterns).
- For shell work in handler, `execFileSync("sh", [scriptPath, ...args], {encoding:"utf8", stdio:["ignore","pipe","pipe"]})` is simplest.
- Syntax-check before relying on load: `node --input-type=module --check < file.js`; stub-test the default export with a fake `pi = { registerCommand }`.

## Migrating from pi prompt-sources

pi: `~/.pi/agent/prompt-sources/<MMDD_><name>.md` — frontmatter `description` + prompt body injected to model. Filename minus date prefix = command name.

omp equivalent: convert to a JS extension that runs the same script/logic directly in `handler` and reports via `ctx.ui.notify`. No prompt injection — the handler executes and displays.

## Not this

- `~/.claude/commands/*.md` is Claude-Code-compat loading, gated by `commands.enableClaudeUser` (default **false**). Prefer the native extension above if not relying on Claude compat.
- `/reload-plugins` reloads plugins but does not pick up brand-new extension files in an already-running session.

## Related omp facts

- `task.disabledAgents` (array, exact names, no wildcards) disables bundled subagents. 6 bundled: reviewer, scout, seance, security-reviewer, sonic, task.
- Agent Hub panel (subagent viewer, pi `/fleet` equivalent): `Alt+A` keybinding `app.agents.hub`. CLI: `omp ps`.
