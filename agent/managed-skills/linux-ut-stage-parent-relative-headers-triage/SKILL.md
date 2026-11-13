---
name: linux-ut-stage-parent-relative-headers-triage
description: "Triage and fix Parasoft build failures fatal error: ../dir/file: No such file or directory when tested .c files use #include \"../sibling-dir/header.h\" on 10028 linux-ut"
---

# linux-ut parent-relative header staging triage (10028)

When a workspace archive re-run or stage-layout run fails with `fatal error: ../<dir>/<file>: No such file or directory` in a tested `.c` file's compile, use this triage and fix procedure. This is a shared Rust root binary defect (tools-improve scope), not a workspace config issue.

## Root cause pattern

`stage::stage_and_filter` (`src/stage.rs`) stages **same-directory** private headers and sibling `.c` files only, via `copy_subsystem_headers` (stage.rs:111-138) and `stage_sibling_c_sources` (stage.rs:149-191). It does **not** handle tested sources containing `#include "../<sibling-dir>/<file>"` — a parent-relative quoted include. The compiler resolves `../fs/internal.h` relative to the staged source dir `build/kbuild/block/` → expects `build/kbuild/fs/internal.h`, which was never staged.

**Why `-I` cannot rescue it**: `rewrite_command` (stage.rs:239-316) deliberately strips kernel-source `-I` flags (design comment run_all.sh:295-297, stage.rs:113-115: "Compile commands must never depend on the kernel source location: a kernel relocation would otherwise break every TestSuite build"). The ONLY correct fix is staging the referenced sibling-dir header into the staged tree, same philosophy as `copy_subsystem_headers`.

**Impact is kernel-wide, not one workspace**: full-kernel `.c` files use `../` non-self quoted includes (`../include` ~236, `../common` ~138, `../core.h` ~73, `../codecs` ~64 occurrences). Any workspace whose test_files source has such an include triggers the same fault. Do NOT special-case one file — fix generically in the shared staging loop.

## Diagnostic evidence to collect

| Check | Command | Meaning |
|---|---|---|
| Staged sibling dir exists | `ls build/kbuild/fs/ 2>&1` | No such file = defect present |
| Quoted include in source | `sed -n '25,35p' build/kbuild/block/bdev.c` | `#include "../fs/internal.h"` |
| Kernel source has it | `cat $KSRC/fs/internal.h | wc -c` | File exists in kernel tree |
| Transitive `../` in target | `grep '\.\./' $KSRC/fs/internal.h` | Empty = single-layer fix is enough |
| test_files owns source | `python3 -c "import json;print(json.load(open('config.json.full'))['test_files'][0])"` | `block/bdev.c` owned by suite |
| Compile `-I` flags | no kernel-source paths | Nothing rescues the staged resolution |
| make `.d` exists ≠ Parasoft OK | `.bdev.o.d` has resolved path | kbuild make uses full `-I$(srctree)/include`; Parasoft uses workspace compile_commands.json WITHOUT kernel-source `-I`。两者标志不同 — treat as independent. |

Where `$KSRC = /home/melo.sf/LFD_MX_CodeBase_QEMU/xmbs/kernel/linux-6.1.132-rt49`.

## Fix template (src/stage.rs, same `stage_file_atomic` idempotent+fail-closed primitive)

New fn `stage_parent_relative_headers`, called in `stage_and_filter` loop right after `stage_sibling_c_sources` (~line 751):

```rust
fn stage_parent_relative_headers(
    kernel_src: &str, source_rel: &str, stage_root: &Path,
) -> anyhow::Result<usize> {
    use std::io::BufRead;
    let abs_src = Path::new(kernel_src).join(source_rel);
    let src_parent = match abs_src.parent() { Some(p)=>p, None=>return Ok(0) };
    let file = match fs::File::open(&abs_src) { Ok(f)=>f, Err(_)=>return Ok(0) };
    // quoted includes whose path starts with "../"
    let re = regex::Regex::new(r#"#include\s*"((?:\.\./)+[^"\n]+)""#).unwrap();
    let mut staged = 0usize;
    for line in std::io::BufReader::new(file).lines() {
        let line = match line { Ok(l)=>l, Err(_)=>break };
        if let Some(caps) = re.captures(&line) {
            let inc = caps.get(1).unwrap().as_str();
            let resolved = src_parent.join(inc);
            let canon = match resolved.canonicalize() {
                Ok(c)=>c,
                Err(_)=>{ eprintln!("  warn: relative include {} not found (skipped)", inc); continue; }
            };
            let ksrc_canon = Path::new(kernel_src).canonicalize()?;
            if !canon.starts_with(&ksrc_canon) {
                anyhow::bail!("relative include {} escapes kernel source: {}", inc, canon.display());
            }
            let rel = canon.strip_prefix(&ksrc_canon)?.to_path_buf();
            let dest = stage_root.join(&rel);
            if stage_file_atomic(&canon, &dest, stage_root)? { staged += 1; }
        }
    }
    Ok(staged)
}
```

Call site inside `for src_rel in sources` loop:
```rust
let n = stage_parent_relative_headers(&ksrc, src_rel, &cfg.stage_dir)?;
if n > 0 { println!("  staged {n} parent-relative header(s) for {src_rel}"); }
```

## Why this passes fail-closed / idempotency / minimal-change

- Reuses `stage_file_atomic` — 同内容跳过（Ok(false) only on changes）、非普通文件/软链目标即报错（stage.rs:84-109）。自然幂等,重跑无副作用。
- **不开内核源 `-I`** — respects "no compile command may depend on kernel source location" design; staged tree relocation-safe.
- **containment fail-closed** — canonicalize + starts_with blocks `../../etc/passwd`-style escapes; escape → `bail!`.
- **缺目标仅 warn** — same no-op philosophy as `copy_subsystem_headers_missing_kernel_dir_is_noop` test (stage.rs:1346); compile error remains the authoritative signal.
- **只扫被测 `.c` 源** — known case (`../fs/internal.h`) is there; if a staged sibling header itself uses `../`, extend one bounded recursion layer later — not now.
- **`../blk.h` self-include auto-no-op** — `block/partitions/core.c`'s `../blk.h` resolves to `block/blk.h`, already staged by `copy_subsystem_headers`; `stage_file_atomic` returns Ok(false), skip. Zero side-effects.
- **仅一处调用点**, 回退 = 删函数 + 调用两行、重编译 root binary.
- **regex crate already in dependencies** (digraph.rs/genstubs.rs use it) — no new external dep.

## Verification chain (must complete before reporting back to dispatcher)

1. `cargo test --release stage::tests` — new case + ALL existing staging cases (mirrors stage.rs:1252 style `copy_subsystem_headers_copies_only_headers_and_skips_identical`); escapes bail, missing → Ok(0), idempotent on re-run.
2. `python3 -m unittest scripts.test_ws_archive scripts.test_stage_links scripts.test_upgrade_run_ut_stage_safe -v` — confirm no regression in Python layer contract.
3. `cargo build --release` + deploy root binary to `/home/melo.sf/LFD_MX_CodeBase_QEMU/linux-ut` with SHA-256 recorded.
4. End-to-end on the failing workspace:
   ```bash
   cd /home/melo.sf/LFD_MX_CodeBase_QEMU/linux-ut/parasoft/kernel-block
   mv build build.bak-1112 2>/dev/null || true
   python3 ../../scripts/ws_archive.py auto-unpack .
   python3 ../../scripts/stage_links.py verify .
   LANG=C.UTF-8 LC_ALL=C.UTF-8 ./run_all.sh
   ```
   Then: `ls build/kbuild/fs/internal.h` MUST exist as a **regular file** (non-symlink); validation.json=PASS; send result back to dispatcher via agent-message naming sender "tools-improve".

## What NOT to touch

- `scripts/{ws_archive.py,stage_links.py,upgrade_run_ut_stage_safe.py,finalize_delivery.py}` — these own archive unpack / symlink migration / kbuild snapshot copytree / delivery pack only; they do NOT derive staged sources. Staging is owned exclusively by Rust `stage::stage_and_filter`.
- `src/report.rs`, `src/targets.rs`, `src/config.rs` — unrelated to staging.
- No workspace-side hand-edits to fake_kernel_headers, kernel source, or per-workspace runner patch — the defect is global, the fix must land in the shared Rust root binary.
