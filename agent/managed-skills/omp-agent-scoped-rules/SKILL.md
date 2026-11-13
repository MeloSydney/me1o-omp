---
name: omp-agent-scoped-rules
description: Choose per-agent OMP Markdown rules for task agents versus independent main sessions
---

When answering OMP agent-specific rule configuration:
1. Identify whether agents are task subagents or independent top-level sessions.
2. Task agents: use `.omp/rules/<name>.md` frontmatter `agents: <agent-definition-name>` and `alwaysApply: true` for immediate injection; `description` without alwaysApply only lists the rule for on-demand reading. `agents` supports list/glob.
3. Independent top-level sessions all have rule-agent name `main`; `modelRoles` chooses model, not rule identity. Use separate `omp --profile <profile>` native rule directories, or per-invocation `--append-system-prompt <file>` for simpler per-session guidance.
4. Check https://github.com/can1357/oh-my-pi/blob/main/docs/rulebook-matching-pipeline.md and installed OMP version before asserting current behavior.
