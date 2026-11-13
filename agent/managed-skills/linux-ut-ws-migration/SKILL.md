---
name: linux-ut-ws-migration
description: Relocate/migrate a delivered linux-ut parasoft workspace (ws.full.tar.zst deployment) to a new root on remote 10028 without triggering a failing Parasoft setup
---

# linux-ut workspace migration (remote 10028)

Goal: move a delivered workspace (reports.full + ws.full + ws.full.tar.zst) to a new directory root and keep it runnable WITHOUT a Parasoft re-setup (setup regenerates suites and fails on this kernel).

## Sequence (order matters)

1. `cd <new-ws> && python3 ../../scripts/ws_archive.py unpack . --allow-root-mismatch`
2. `rm -rf ws.full/.cpptest && cp -a <orig>/ws.full/.cpptest ws.full/.cpptest`
   - rm first: copying over an existing .cpptest nests `.cpptest/.cpptest`.
   - before relocate: relocate rewrites text paths; copying after leaves old-root paths in testsuites.xml.
3. `python3 ../../scripts/relocate_ws_paths.py --from <orig> --to <new> --apply`
4. Rebuild compile DB: `../../linux-ut --project-root .` then apply the workspace pswalk post-process (python json round-trip `json.dumps(data, indent=2)+"\n"`). Raw rebuild is newline-nondeterministic; post-processed bytes are byte-stable (verify with sha256sum across two rebuilds).
5. Fix scope fingerprint: run `../../linux-ut --project-root . check-scope`; parse current hashes from the error (`compile_commands_changed: OLD -> NEW`, `recorded X, current Y`) and rewrite `ws.full/.linux-ut-scope.json`: `stub_inputs_fingerprint`=Y, `stub_input_fingerprints["compile_commands.json"]=NEW`, `["parasoft_aarch64_gcc_wrapper.sh"]=wrapper hash from same message. Re-run check-scope until only WARN lines remain.
6. Make pre-run fault patch advisory: in run_ut.sh change `python3 "$PROJECT_ROOT/patch_arm64_fault_harness_1111.py" "$PROJECT_ROOT"` to append `|| true` (harness generated at run time; wrapper patches at compile time). Backup run_ut.sh first; `bash -n` after.
7. Config completeness: copy any missing `config.json.stageN` from orig and re-run relocate (stage configs embed paths); gate aborts otherwise with "config.json.stageN is required for the regression gate".
8. Ensure `reports.full` is a REAL directory (`mkdir -p reports.full`); failed run_all.sh cleanup deletes it and stage_links then refuses.
9. Restore validated stubs: `python3 restore_arm64_validated_stubs_1111.py .` twice (idempotent).
10. Run: `LANG=C.UTF-8 LC_ALL=C.UTF-8 ./run_all.sh`.

## Acceptance evidence

- check-scope: no "scope differs"; full registry check N suites present; Registered M cases.
- run log: Executed M/M, 0 failed/execution problems/assertion failures; reports.full/validation.json status PASS acceptance=true scope=full; ws.full/.stage-gate-pass written.

## Pitfalls

- Never run setup on this kernel: Generate Test Suites fails with GENERATION_ANALYSIS_FAILURE (92 parse errors); the delivered registry is the only working one.
- Host saturation: load ~20 / MemAvailable <200MB OOM-kills precompile (run_ut exit 137). Check `uptime` + `free -h` before launching; retry when load eases.
- D-state `find /` zombies from other agents inflate load; not killable, not yours.
- After any failed run, re-check reports.full exists and ws.full/.cpptest intact before retrying.
