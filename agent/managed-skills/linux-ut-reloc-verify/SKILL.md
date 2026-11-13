---
name: linux-ut-reloc-verify
description: Verify linux-ut workspaces run from ws.full.tar.zst after repo deployment path change (symlink-relative pilot root)
---

# linux-ut Relocation Verification (10028)

Verify that delivered workspaces run correctly from `ws.full.tar.zst` when the linux-ut repo is deployed at a different root path (symlink-relative configuration).

## When to use
After the repo root is relocated (e.g. `linux-ut-reloc-links-pilot-*`), to confirm archive extraction + compile + test + reports still work at the new path.

## Procedure per workspace (backup → extract → run → restore)

```bash
cd <pilot-root>/parasoft/<workspace>
# 1. Record original pointers
readlink config.json ws reports
# 2. Backup BOTH ws.full and reports.full, drop ws link
mv ws.full ws.full.verify-backup
mv reports.full reports.full.verify-backup
rm -f ws
# 3. Extract from archive
python3 ../../scripts/ws_archive.py auto-unpack .
# NOTE: auto-unpack creates the ws symlink itself. Do NOT create it again.
# 4. Create reports.full dir (run_all.sh requires it to exist as real dir)
mkdir -p reports.full
ln -sfn ws.full ws
ln -sfn reports.full reports
# 5. clk special: rebuild staged tree + split-exec cache
#    ../../linux-ut --project-root .
#    python3 prep_split_cache.py
# 6. Run
LANG=C.UTF-8 LC_ALL=C.UTF-8 ./run_all.sh
# 7. Check: validation.json PASS/acceptance/scope=full, 0 failed/exec_problems/assertion_failures,
#    ticket report_sha256 matches reports.full/report.xml
# 8. Restore
rm -rf ws.full reports.full
mv ws.full.verify-backup ws.full
mv reports.full.verify-backup reports.full
ln -sfn ws.full ws; ln -sfn reports.full reports
```

## Gotchas
- `auto-unpack` creates `ws` symlink → unconditional `os.symlink` after it raises FileExistsError.
- `run_all.sh` in delivery layout requires `reports.full/` as a real directory before running (stage_links verify fails otherwise).
- clk (subsystem workspace): archive does NOT carry `build/` staged tree or `.split-exec/` cache. Must run `../../linux-ut --project-root .` then `prep_split_cache.py` after unpack.
- Concurrency: max 2 parallel `run_all.sh` (Parasoft tolerates it; more may cause Text file busy on shared binary).
- report SHA differs across reruns (embedded timestamps) — compare validation counts + ticket self-consistency, not SHA equality with archive meta.
- Restore BOTH ws.full and reports.full backups; leaving either as verify-backup breaks delivery layout.
- `linux-ut --project-root .` may hit "Text file busy" if another workspace is rebuilding concurrently — retry with sleep.

## Verified 2026-11-13
9/9 driver workspaces passed (bus 20, char 2821, clk 14263, clocksource 146, connector 26, cpuidle 50, devfreq 37, dma 48, dma-buf 220) at `linux-ut-reloc-links-pilot-1113`. Total ~338s with concurrency 2.
