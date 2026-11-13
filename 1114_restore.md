# OMP configuration backup and restore

This is a curated, Git-managed backup of **configuration**, not an archive of `~/.omp`. Review changes before committing or sharing. The restore script refuses to overwrite existing paths. No credentials are bundled.

## Contents

- `agent/config.yml`, `agent/models.yml`: OMP settings and Magpie model catalog. The catalog uses a local Magpie endpoint and a non-secret auth setting; it does **not** install or configure the Magpie service.
- `agent/agents/`: six agent definitions.
- `agent/extensions/`: four local extensions. `agent-name.js` resolves its external script under `$SRC_SKILLS_ROOT` (default `~/src-skills`) rather than the original machine's absolute path.
- `agent/managed-skills/`: nineteen installed skill definitions (`SKILL.md` files).
- `profiles/tools-improve/agent/{config.yml,AGENTS.md}` and `profiles/ws/agent/AGENTS.md`: only profile configuration and instructions, no profile state.
- `plugins/{package.json,omp-plugins.lock.json}`: pi-market plugin declaration and enablement. Dependencies are reinstalled separately; no `node_modules` or generated package lock is backed up.

## External dependencies

Set `SRC_SKILLS_ROOT` if your source repositories do not live under `~/src-skills`. Restore requires these existing source trees (obtain them separately; this repository does not vendor them):

| Restored link or command | Required target under `$SRC_SKILLS_ROOT` |
| --- | --- |
| `agent/extensions/agent-message.js` | `src-pi-agentmessage/herdr-agentmessage/agent-message-command.js` |
| `agent/skills/dgf-pipeline` | `src-zsxq/zsxq-quant/dgf` |
| `agent/skills/duoyu-pipeline` | `src-zsxq/zsxq-quant/duoyu` |
| `agent/skills/short-term` | `src-zsxq/zsxq-quant/short-term` |
| `/agent-name` extension | `src-pi-agentname/scripts/sync.sh` |

The shell's `omp-heavy`/`omp-light` wrappers additionally need `magpie`, `omp`, and a separately installed `src-piconfig/magpie-up.sh` script. The local Magpie service and any authentication it requires must be provisioned separately. Other managed skills may describe host-specific Linux workspaces/tools, not included here.

## Restore

1. Install OMP, Magpie if used, and the external repositories above. Supply credentials through your normal private credential store or environment; never put them in this repository.
2. Inspect `agent/models.yml` for the target machine's local Magpie endpoint and adjust **your local restored copy**, not the backup, if needed.
3. From this repository run `./restore.sh`. Set `OMP_HOME` to change the destination (default `~/.omp`), and `SRC_SKILLS_ROOT` to change the external source root. Existing identical regular files and correct links are skipped; any differing path stops restoration without replacing it. A partially restored destination may be rerun after manually resolving conflicts. No deletions occur.
4. If using the plugin, install dependencies in `~/.omp/plugins` using the package manager appropriate to your OMP installation, then verify plugin availability. Do not copy `node_modules` from another machine.
5. Add the following OMP-specific functions to your shell configuration **manually**, if wanted (adjust the Magpie startup path and ensure the function exists):

```sh
magpie-up() { sh "$HOME/src-piconfig/magpie-up.sh"; }
omp-heavy() { magpie-up && magpie omp group/heavy && omp "$@"; }
omp-light() { magpie-up && magpie omp group/light && omp "$@"; }
omp-ti() { command omp --profile=tools-improve "$@"; }
```

The original `.zshrc` also has pi-specific aliases and personal settings; those are deliberately not copied. The source tree contains no custom `~/.omp/rules` or `~/.omp/prompts` files at inventory time. Project-specific OMP configuration outside `~/.omp` and OMP-managed built-in skills are not represented here.

## Deliberately excluded

Sessions, histories, memories, logs, caches, SQLite databases, browser profiles, credentials, tokens, install/remote-host identifiers, runtime locks, downloaded binaries, npm modules, profile state and temporary files. `~/.omp/agent/extensions/agent-message.js` and the three skills are reconstructed as links, never dereferenced into this repository. `~/.omp/agent/last-changelog-version` is runtime state and not restored.
