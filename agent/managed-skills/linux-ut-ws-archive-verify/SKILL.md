---
name: linux-ut-ws-archive-verify
description: Verify ws.full.tar.zst archives extract and run correctly for all linux-ut Parasoft workspaces on 10028
---

# linux-ut ws.full.tar.zst Archive Verification (10028)

Verify that every workspace in `parasoft/__full-workspace.md` (37 names) can extract from `ws.full.tar.zst` and run `./run_all.sh` to produce passing reports — without using existing `ws/` or `ws.full/`.

## When to use
After bulk fake_kernel_headers cleanup, shared-tool changes, or deployment-path relocation, to confirm archive extraction alone produces a runnable workspace.

## Procedure per workspace

```bash
cd /home/melo.sf/LFD_MX_CodeBase_QEMU/linux-ut/parasoft/<workspace>

# 1. Record original pointer state for restoration
ORIG_CONFIG=$(readlink config.json)
ORIG_WS=$(readlink ws)
ORIG_REPORTS=$(readlink reports)

# 2. Back up the authoritative report before it is rewritten
cp -a reports.full reports.full.archive-check-backup

# 3. Backup existing ws.full (move, not copy)
[ -d ws.full ] && [ ! -L ws.full ] && mv ws.full ws.full.verify-backup
rm -f ws

# 4. Use the archive's own provenance stage link before rerunning
STAGE_LINK=$(python3 -c 'import json;print(json.load(open("ws.full.verify-backup/.provenance.json"))["stage_link"])')
ln -sfn "$STAGE_LINK" config.json

# 5. Extract from archive only
python3 ../../scripts/ws_archive.py auto-unpack .
test -d ws.full || FAIL "extraction"

# 6. CRITICAL: Recreate delivery-layout symlinks before verify
#    stage_links.py verify requires ws->ws.full AND reports->reports.full
#    to detect delivery layout; without them it falls to stage layout and errors.
ln -sfn ws.full ws
ln -sfn reports.full reports
python3 ../../scripts/stage_links.py verify .

# 7. Subsystem workspaces (clk): rebuild split-exec cache first
[ -f prep_split_cache.py ] && python3 prep_split_cache.py

# 8. Run
LANG=C.UTF-8 LC_ALL=C.UTF-8 ./run_all.sh

# 9. Check results
python3 -c "import json; v=json.load(open('reports.full/validation.json')); c=v['case_counts']; print(v['status'], v['acceptance'], v['scope'], c, v.get('coverage_gate_failures'))"

# 10. Verify ticket matches fresh report
python3 -c "
import hashlib,re
ticket=open('ws.full/.stage-gate-pass').read()
m=re.search(r'report_sha256=([0-9a-f]{64})',ticket)
actual=hashlib.sha256(open('reports.full/report.xml','rb').read()).hexdigest()
print('ticket match:',m.group(1)==actual)
"

# 11. Restore original state
rm -rf ws.full
[ -d ws.full.verify-backup ] && mv ws.full.verify-backup ws.full
rm -rf reports.full
mv reports.full.archive-check-backup reports.full
ln -sfn "$ORIG_CONFIG" config.json
ln -sfn "$ORIG_WS" ws
ln -sfn "$ORIG_REPORTS" reports
```

## Parallelization
Split workspaces into batches (~3 each), spawn `good`-flavor task workers. Each worker processes its batch sequentially (5-20 min per workspace). Keep ≤2 concurrent `run_all.sh` across all workers.

## Known results
- 2026-11-12 (post fake_kernel_headers cleanup): 34/36 PASS; kernel-arch-arm64 FAIL (ptep_get_and_clear conflicting types); kernel-block PASS after root binary fix; kernel-drivers-acpi NO ARCHIVE (needed delivery packaging first).
- 2026-11-13 (relocation pilot, 9 workspaces under linux-ut-reloc-links-pilot-1113): 9/9 PASS. All validation.json PASS/acceptance=true/scope=full, 0 failed, gate_failures=[]. Archives freshly packed at pilot root.

## Gotchas
- `ws.full.tar.zst` packs ONLY `ws.full/` — not `.split-exec/`, not scripts (`run_all_subsystem.sh`, `prep_split_cache.py`). Subsystem workspaces must rebuild split-exec cache after extraction.
- Local aggregate/patch scripts that glob `ws.N` will fail on delivery-layout rerun (ws.N deleted by finalize_delivery). Patch them to resolve via `ws→ws.full` readlink.
- Always restore original workspace state after verification — backup → test → restore.
- A rerun report SHA differs from the archived report SHA because of embedded timestamps; verify PASS/acceptance/scope, case counts, empty gate failures, and that `.stage-gate-pass` matches the freshly generated report.
- `.stage-gate-pass` is plain text (`<epoch> stage=N report_sha256=<hex> config_sha256=<hex>`), not JSON — parse via regex.
- **Delivery-layout symlink requirement**: after `rm -f ws` (step 3), `stage_links.py verify` fails unless `ws -> ws.full` and `reports -> reports.full` are recreated (step 6). Without both symlinks, verify falls to stage-layout detection and errors "expected ws -> ws.N".
- If a regression agent hits `Repetitive tool calls detected` (InternalError.Algo.InvalidParameter), switching it to vibe mode resets context and breaks the loop.
