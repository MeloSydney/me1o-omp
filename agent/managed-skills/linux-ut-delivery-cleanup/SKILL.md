---
name: linux-ut-delivery-cleanup
description: Safely clean delivered linux-ut workspace backups using the now non-executable clean_all.sh prompt while preserving acceptance and archive evidence
---

# Delivered linux-ut workspace cleanup (10028)

Read the full remote `USER_GUIDE_AI_ONLY.md` first. `scripts/clean_all.sh` is now a **non-executable plain-text cleanup prompt**, readable through each workspace's `clean_all.sh` symlink. Read it; never run `./clean_all.sh`, `sh clean_all.sh`, or its former `--dry-run`/`--verify-only` flags.

Inventory the workspace and produce a precise candidate list manually. Before deleting anything verify `reports.full/validation.json` PASS/acceptance=true/scope=full, config/provenance alignment, report/ticket/config SHA, `stage_links.py verify`, `ws_archive.py verify`, and `sha256sum -c ws.full.tar.zst.sha256`. The archive meta records the pack-time report SHA; post-pack reruns change the current report SHA because of timestamps and do not by themselves require repacking. Check active processes, symlinks, references, and whether each backup has unique evidence. User-authorized safe intermediate/backup candidates need no repeated approval; unknown or risky items stay and require a decision. Never blanket-delete by pattern.

Preserve complete `ws.full`, `reports.full`, `ws.full.tar.zst` and its `.sha256`/`.meta`, active stage `ws.N`/`reports.N` where applicable, the config/ws/reports symlink triad, configs, scripts/hooks, properties, fake-header overlays, and project-specific fallback resources. After final delivery, obsolete stage reports and backups are candidates only after their SHA inventory and unique-value audit. Do not mutate sealed `ws.full` or repack merely as cleanup.

After deletion rerun read-only link/archive/checksum validation and compare protected manifests; report exact removed and retained paths. `finalize_delivery.py --dry-run` can report already-final layout with RC=1; describe it accurately.
