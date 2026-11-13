---
name: linux-ut-ws-archive-verify-rerun
description: "Re-run linux-ut workspaces on 10028 from ws.full.tar.zst extraction to verify the archive mechanism, including provenance pointer handling, subsystem cache rebuild, and concurrency rules"
---

# linux-ut ws.full.tar.zst archive re-run verification (10028)

When the user asks to verify that linux-ut Parasoft workspaces run correctly from their `ws.full.tar.zst` archives (not existing ws/ws.full dirs).

## Preconditions
- Workspace delivered: `reports.full/validation.json` status=PASS acceptance=true scope=full, `ws.full.tar.zst`+`.sha256`+`.meta` present, `.stage-gate-pass` ticket.
- Verify `sha256sum -c ws.full.tar.zst.sha256` from workspace root (sidecar paths are relative).

## Procedure per workspace (in-place: backup → extract → run → restore)
1. Record original pointers: `readlink config.json ws reports`.
2. `mv ws.full ws.full.verify-backup && rm -f ws`
3. `python3 ../../scripts/ws_archive.py auto-unpack .` (refuses to overwrite existing ws.full — hence step 2). **Note: auto-unpack creates the `ws` symlink itself; do NOT re-create it or you get FileExistsError.**
4. Provenance wrinkle: delivered ws.full/.provenance.json may record stageN while config.json points at config.json.full → PROVENANCE_MISMATCH on re-run. Temporarily set `config.json -> config.json.stageN` matching archived provenance; restore ALL original pointers afterwards.
5. **`mkdir -p reports.full`** — in delivery layout, `stage_links.py verify` requires `reports.full` to be a real directory (not just a symlink). Create it before run_all.sh, then `ln -s reports.full reports`.
6. Subsystem workspaces (e.g. kernel-drivers-clk): run `../../linux-ut --project-root .` AFTER auto-unpack to rebuild `build/parasoft/kbuild/drivers/clk` staged tree (archive doesn't carry it), THEN `prep_split_cache.py`. The crash-recovery recipe (`utflow_qemu_aarch64_clk_recovery.recipe`) lives in the external Parasoft install and embeds absolute paths — not migratable from workspace side.
7. `LANG=C.UTF-8 LC_ALL=C.UTF-8 ./run_all.sh` (timeout ≥600s; clk ~600s, gpu ~150s, typical 25-73s).
8. Check: validation.json PASS/acceptance/scope=full, 0 failed/execution_problems/assertion_failures, coverage_gate_failures empty. report.xml SHA differs from archive meta across reruns due to embedded timestamps — EXPECTED; compare validation counts and .stage-gate-pass self-consistency instead.
9. Restore: `rm -rf ws.full && mv ws.full.verify-backup ws.full`, re-create original symlinks, confirm no `*verify-backup*` leftovers.

## Parallelization
3 batches (~12 workspaces each) via concurrent workers ran fine on 10028; Parasoft tolerated concurrent cpptestcli runs. 2026-11-12 result: 34/36 with archives passed. 2026-11-13 result: 37/37 with archives passed (all workspaces, symlink-relative paths).

## Known workspace-specific issues (2026-11-13)
- kernel-block: `.cpptest/kbuild/file-data` caches retain original-root staged-header paths; auto-unpack rebase doesn't cover this path. Fresh setup regenerates TestSuites with dangling includes and discards authored suites — restore from archive + rebase before running. Also requires workspace-local validated-autostub restore hook (arm64 pattern) for `free_percpu` ABI.
- kernel-crypto: workspace-local `run_all.sh` regular file (Oct 29) must be replaced with shared symlink.
- kernel-crypto-asymmetric_keys: workspace-local overlay `local_fake_headers/linux/asn1_decoder.h` needed for fresh variable stubs.
- kernel-drivers-acpi: aggregate-contracts/stage93.c may need root-rebase after relocation.
- kernel-drivers-input: parallel `make -j` can duplicate `CC drivers/input/serio/serio.o` (kernel Makefile + tool target list); use `taskset -c 0` for serial build if reproducible.
- kernel-drivers-gpio/i2c: workspace `patch_generated_stubs_1108.py` must run before cpptestcli to restore `of_property_read_u32` fixture delegation lost by regenerated auto stubs.
- kernel-drivers-clk: `Text file busy` (ETXTBSY) on `../../linux-ut --project-root .` when concurrent runs overlap — retry with 10s sleep up to 5 times.

## Concurrency conflict rule
Before declaring a workspace exclusive: `ps -eo pid,etimes,args` on 10028 for run_all/cpptestcli. Agent pause/stop messages do NOT halt in-flight subprocesses — after the pause ack, kill PIDs directly via SSH. File mtime changes on shared fake_kernel_headers reveal concurrent modification. Stale log watchers (tail/grep on old logs) are non-owning and can be ignored.

## Failure escalation
- Fake-header syntax corruption mid-bullet list in shared tree → tools-improve repairs (workspace agents must not edit shared fake_kernel_headers).
- New stub type conflicts after fixes → collect full first-cause log (/tmp/*.log + reports report.xml Error.val), send evidence to tools-improve before retrying.
- Binary/source identity drift between original and copied roots → sync before resuming batch runs; fail-closed identity checks will block.
