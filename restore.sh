#!/bin/sh
# Restore curated OMP configuration without replacing an existing user file.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ome_home=${OMP_HOME:-"$HOME/.omp"}
sources=${SRC_SKILLS_ROOT:-"$HOME/src-skills"}

restore_file() {
  relative=$1
  source=$repo/$relative
  target=$ome_home/$relative
  if [ -e "$target" ] || [ -L "$target" ]; then
    if [ -f "$target" ] && cmp -s "$source" "$target"; then return; fi
    printf 'Refusing to overwrite %s\n' "$target" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$target")"
  cp -p "$source" "$target"
  printf 'Restored %s\n' "$relative"
}

for relative in agent/config.yml agent/models.yml \
  plugins/package.json plugins/omp-plugins.lock.json \
  profiles/tools-improve/agent/config.yml \
  profiles/tools-improve/agent/AGENTS.md profiles/ws/agent/AGENTS.md; do
  restore_file "$relative"
done
for directory in agent/agents agent/extensions agent/managed-skills; do
  find "$repo/$directory" -type f | while IFS= read -r source; do
    restore_file "${source#"$repo/"}"
  done
done

link_external() {
  relative=$1
  source=$2
  target=$ome_home/agent/$relative
  if [ ! -e "$source" ]; then
    printf 'Missing external dependency: %s\n' "$source" >&2
    exit 1
  fi
  if [ -L "$target" ] && [ "$(readlink "$target")" = "$source" ]; then return; fi
  if [ -e "$target" ] || [ -L "$target" ]; then
    printf 'Refusing to overwrite %s\n' "$target" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$target")"
  ln -s "$source" "$target"
  printf 'Linked %s\n' "$relative"
}

link_external extensions/agent-message.js "$sources/src-pi-agentmessage/herdr-agentmessage/agent-message-command.js"
link_external skills/dgf-pipeline "$sources/src-zsxq/zsxq-quant/dgf"
link_external skills/duoyu-pipeline "$sources/src-zsxq/zsxq-quant/duoyu"
link_external skills/short-term "$sources/src-zsxq/zsxq-quant/short-term"
