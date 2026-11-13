---
name: linux-ut-repository-relocation
description: "Relocate delivered linux-ut repositories via user-provided kernel/toolchain/Parasoft symlinks, temporary absolute compiler settings, and full acceptance verification"
---

# linux-ut repository relocation on 10028

1. Read full remote USER_GUIDE_AI_ONLY.md and docs/1113_linux_ut_relocation_pilot.md; compare original and copied source/binary SHA before rebuilding. Preserve original delivery.
2. Obtain user-provided kernel, arm64 toolchain-root (containing bin/), and Parasoft executable directory. Repo-root stable symlinks: linux-6.1.132-rt49, toolchain, cpptest. Check link targets and executable gcc/g++/cpptestcli before run.
3. Persist workspace-relative linux_dir=../../linux-6.1.132-rt49 and cross_compile=../../toolchain/bin/aarch64-buildroot-linux-gnu- in full and active-stage configs. Keep C compiler property ./parasoft_aarch64_gcc_wrapper.sh and C++/linker properties ../../toolchain/bin/aarch64-buildroot-linux-gnu-g++. Resolve wrapper REAL_CC from SCRIPT_DIR/../../toolchain/bin/...gcc. Existing runners may carry old host paths: migrate only the selected workspace, not all 37.
4. At Parasoft invocation, temporary 0600 localsettings must contain absolute C/C++/linker executable paths; preserve persistent local.properties and remove temp on exit. For Buildroot g++/linker retain the lexical absolute symlink path rather than canonical target, since basename determines `.br_real`. C wrapper canonical path must stay inside workspace. Fresh Generate Test Suites with relative compiler.exec directly failed historically.
5. CLI precedence explicit absolute CPPTESTCLI > PATH > optional repo-root cpptest/cpptestcli. Optional repo toolchain/bin supplements PATH. Validate before archive/ticket mutation. Run full acceptance after archive auto-rebase; confirm case counts, 0 failures/problems, coverage gate, report/config/ticket SHA. Repack only after PASS, verify archive sidecar/meta. Do not claim zero absolute bytes: generated compile DB, Eclipse/Parasoft caches and binaries contain current-root absolute paths.
6. For a copied repo, compare source tree against deployed binary: an older copy previously had stale src/parasoft.rs despite a newer copied binary. Sync touched shared source/scripts/tests/guide before rebuilding. Preserve historical evidence and document unique failures in MMDD_ file.
