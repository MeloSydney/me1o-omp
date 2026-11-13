---
name: linux-ut-split-dc-targeting
description: Target and verify DC improvements in linux-ut split projects without invalidating combined provenance
---

When tuning a linux-ut split project's coverage:
1. Read the latest valid single-project report.xml and list file-level CvgInfo `elem`; parse semicolon-separated `num`/`total` index 5 as DC.
2. Rank uncovered DC within files actually belonging to that project; don't assume a suite path or stage label implies membership.
3. Edit only owned TestSuite files, back up first, and add assertions exercising genuine branches.
4. After all edits, rebuild a private prep cache from ws.N; execute each affected project and require nonzero expected cases, all PASS, zero execution problems and SIGSEGV, plus measured DC increase.
5. Freeze ws.N before another agent builds combined provenance; subsequent edits invalidate that cache.
