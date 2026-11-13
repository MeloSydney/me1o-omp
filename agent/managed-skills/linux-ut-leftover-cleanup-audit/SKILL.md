---
name: linux-ut-leftover-cleanup-audit
description: Audit whether backup/migration/leftover dirs and files under remote 10028 linux-ut root or parasoft/ are safe to delete after workspace deliveries
---

# linux-ut leftover cleanup audit (10028)

When the user asks whether leftovers in `/home/melo.sf/LFD_MX_CodeBase_QEMU/linux-ut` (root or `parasoft/`) can be deleted, run this evidence checklist before answering; never delete without explicit user confirmation.

## Live tree (never delete)
- `parasoft/<ws>/` for every ws listed in `parasoft/__full-workspace.md` (37 names, one line each; the merged list replaced `__full-workspace2.md` on 2026-11-12) + their delivery artifacts reports.full / ws.full / ws.full.tar.zst*
- `scripts/`, `linux-ut` (active binary), `fake_kernel_headers/`, `USER_GUIDE_AI_ONLY.md`, `src/`, `target/`, `parasoft/__full-workspace.md`

## Known-safe-after-delivery patterns (verified 2026-11-12)
- Root: `linux-ut.before-*`, `linux-ut.bak-*` (deploy-history binaries); `USER_GUIDE_AI_ONLY.md.bak-*`/`.before-*`
- Root migration leftovers: `parasoft2/`, `parasoft2-mig-evidence.tar`, `parasoft-mig-1110*`, `parasoft-scripts/` (stale script copies; compare sha256 vs scripts/), `fake_kernel_headers.bak-*` (older mtime than live), `mig-verify-1110/`, `archive/`, `backups/` (multi-GB intermediate tars/pre-reset snapshots)
- Under parasoft/: anything NOT in `__full-workspace.md` — gpu backup dirs (`1109_gpu_cleanup_backup`, `1109_gpu_delivery_pathfix_backup`, `1109_gpu_migration_backup`, `gpu_stage34_orphan_skeleton_backup_*`), stage-snapshot archives (`kernel-crypto-archives/<stage>-<ts>/`, no config.json), migration-era workspace copies (`kernel-drivers-block.mig-1110`, self-contained symlinks + its own stale PASS report)

## Backup file naming: dual separator patterns

Backup suffixes use BOTH hyphen AND underscore separators inconsistently across the tree. A find pass with only hyphen patterns misses underscore-variant files.

**Complete find pattern for backup file cleanup:**
```
find <dir>/ -type f \( \
  -name "*.bak-*" -o -name "*.bak_*" \
  -o -name "*.before-*" -o -name "*.before_*" \
  -o -name "*.pre-*" -o -name "*.pre_*" \
  -o -name "*.old" -o -name "*.orig" \
\) -delete
```

Verified 2026-11-12 in `fake_kernel_headers/`: first pass (hyphen only) found 181 files; second pass (underscore) found 38 more. Same dual pattern in `scripts/` (`.bak_reports_` vs `.bak-before-*`).

## Audit steps
1. Enumerate candidates: `ls -d */ | sort` vs `grep -v '^$' __full-workspace.md | sort` (comm -23); `du -sh` each.
2. Reference scan: `grep -rn <name> scripts/*.py scripts/*.sh USER_GUIDE_AI_ONLY.md`; also `parasoft/*/*.md`, `reports-sync/`, `docs/`. `find parasoft -maxdepth 4 -type l` and resolve targets (internal self-links inside a candidate are fine). `ps -eo args | grep <name>`.
3. Path-embedding scan in live trees: grep candidate path in live `compile_commands.json`, `config.json`, `.provenance.json`, `ws.full/.cpptest/`.
4. Staleness proof: mtime/sha256 backup vs live counterpart; for workspace copies compare `reports.full/report.xml` mtime+SHA (newer live wins; a different PASS sha in the copy is only a historical snapshot).
5. Delivery proof for anything whose only value is rollback: each affected live workspace has `reports.full/validation.json` (status=PASS, acceptance=true, scope=full), `ws.full.tar.zst` with `sha256sum -c` run FROM INSIDE the workspace dir (sidecar paths are relative), and `ws.full/.stage-gate-pass` sha matching measured report/config sha.
6. Report table: item, size, content, verdict evidence; name retained-value losses explicitly — e.g. gpu `DELIVERY.md` cites `../1109_gpu_delivery_pathfix_backup/` as log-archive location (paths dangle after delete, but DELIVERY.md inlines all key SHAs/coverage), intermediate-report rollback, investigation notes. Ask user to confirm before `rm`.

## Workspace-level cleanup (post-delivery)

After a workspace passes full acceptance (validation.json PASS + ticket + sha256 OK), these are safe to delete within that workspace dir:
- `.linux-ut-setup-rollback-*/` (setup rollback snapshots)
- `reports.N.*-backup/`, `reports.N.bak-*`, `reports.N.round*` (intermediate stage report backups)
- `.bak-*/` (pre-change snapshots of compile_commands/stubs/etc)
- `backups/` (TestSuite/script .bak files)
- `*.bak-*`, `*.before-*`, `*.pre-*`, `*.bak_*` (properties/script backups — check both separators)
- `build/`, `logs/`, `__pycache__/`
- `.split-exec/` (rebuildable via `python3 prep_split_cache.py` from ws.full/kbuild + config.json.stageN; NOT inside ws.full.tar.zst)
- `run_all.prefix-fix.sh`, `run_all_subsystem.sh.disabled-*`, `run_all_subsystem.sh.bak-*`

Must retain: `reports.full/`, `ws.full/`, `ws.full.tar.zst`+`.sha256`+`.meta`, `config.json.stage*`/`.full`, three symlinks (config.json/ws/reports), active scripts (run_all.sh/clean_all.sh symlinks, run_all_subsystem.sh, run_ut.sh, run_single_project.sh, prep_split_cache.py, patch_cpptest_runner.py), `User_Run_Unit_Tests.properties`, `local.properties`, `cpptest_license.properties`, `fake_kernel_headers` symlink, `.tools/`, `.stage-lock`, `stubs/`, `tests/`, `per_project_stubs/`, `local_fake_headers/`, `parasoft_aarch64_gcc_wrapper.sh`, `stage*.json` (if user wants to keep), `compile_commands` variants (if user wants to keep).
