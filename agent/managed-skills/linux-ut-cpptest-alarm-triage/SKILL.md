---
name: linux-ut-cpptest-alarm-triage
description: Diagnose shifting SIGALRM failures caused by the workspace CppTest runner crash-finalizer timer on linux-ut split-exec
---

1. Inspect report.xml ExecViol `testName` and message across at least two existing runs. If SIGALRM shifts among cases, suspect a binary-wide timer rather than deterministic test behavior.
2. Read generated `cpptest_testrunner.c` around `CPPTEST_CRASH_FINALIZER_V4`; inspect workspace-local `patch_cpptest_runner.py` and the invoking recovery recipe.
3. Distinguish `alarm(N)` in generated `CppTest_Main` from Parasoft `timeout.per.test.case`: changing the latter does not change the former.
4. Preserve the original patch script before changing its timer; keep fatal-signal finalization/recovery intact. Verify the generated runner in a fresh run and inspect report.xml for zero execution problems/SIGALRM, then verify the independent combined coverage gate.
5. Do not infer a timer change passed coverage or final delivery from zero SIGALRM alone.
