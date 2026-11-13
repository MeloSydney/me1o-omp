---
name: linux-ut-ws-archive-migration-verify
description: "Verify linux-ut ws.full.tar.zst archive migration on 10028: auto-unpack (checksum+unpack+relocate) or manual unpack --allow-root-mismatch + relocate_ws_paths.py, then plain ./run_all.sh; drift-sensitive workspaces need .cpptest/.metadata deletion before run."
---

# linux-ut ws.full.tar.zst 归档迁移验证（10028）

## 何时用
workspace 已完成交付三件套（`reports.full/` + 完整 `ws.full/` + `ws.full.tar.zst`+`.sha256`+`.meta`），需要验证换部署根路径后仍可复跑；或归档迁移出现首因、需要判断是否为共享工具缺陷。

## 快捷路径：auto-unpack（推荐）
`python3 ../../scripts/ws_archive.py auto-unpack .` 一步完成：SHA-256 校验 → 解包 → 检测 packed_root ≠ 当前根时自动 relocate（内部调 relocate_ws_paths.py）。解包后直接 `LANG=C.UTF-8 LC_ALL=C.UTF-8 ./run_all.sh`。
- 2026-11-13 实证：reloc-links-pilot-1113 根下 9 个 workspace（i2c/iio/input/interconnect/iommu/irqchip/leds/mailbox/soc）全部 auto-unpack + run_all.sh 直通 PASS，validation.json PASS/full + ticket SHA 自洽。
- 验证前 `mv ws.full ws.full.verify-backup` 保留原始交付；验证后 `rm -rf ws.full && mv ws.full.verify-backup ws.full` 恢复。
- 并发控制：一次最多 2 个 workspace 同时跑 run_all.sh（cpptestcli 内存）。

## 手动路径（需要逐步排查时）
1. `python3 ../../scripts/ws_archive.py unpack . --allow-root-mismatch`
2. `python3 ../../scripts/relocate_ws_paths.py --from <old_root> --to <new_root> --apply .`
3. `./run_all.sh`

## 关键事实（勿违反）
- `scripts/relocate_ws_paths.py` 只重写 `ws.full/.cpptest/**`、`ws.full/kbuild/stubs/**`、`ws.full/kbuild/.project`、`.parasoft`、`ws.full/.metadata/.plugins/**`，以及根级 `config.json.stage*`/`config.json.full`/`local.properties`/`run_ut.sh`/`compile_commands*.json`。**不重写 `build/`**。
- 含 NUL 的二进制运行态（`.exe`/`.tlog`/`.o`/`.map`/`lsi_cache`/`psrc` 等）按设计跳过，由换根后**第一次 `./run_all.sh` 重建**；残留计数会打印，不是错误。
- 因此：不得先手动删 `unit-data`/`lsi_cache`/`build/` 来"绕过"迁移失败；那会掩盖真实首因。
- **relocate 后 check-scope 必然触发 regen**：relocate 重写 compile_commands.json（内容 SHA 变），而 `.linux-ut-scope.json` 记录打包时旧 SHA → run_all 报 `workspace scope differs: compile_commands_changed` → 强制 re-init/regen。stage1 无漂移 workspace regen 无害，plain run 直通；**drift-sensitive workspace**（arm64 等，fresh auto stub 有退化签名冲突）regen 会破坏验收态。

## Drift-sensitive workspace（arm64 等）
在 relocate 之后、run_all 之前，**额外删除迁移后的 Parasoft 混合态**：
```
rm -rf ws.full/.cpptest ws.full/.metadata
rm -f ws.full/kbuild/.project ws.full/.linux-ut-scope.json ws.full/.provenance.json ws.full/.stage-gate-pass
```
→ 下一轮 plain run 走全新 setup → 随后按已知漂移走 workspace 私有 restore 脚本恢复验收 stub。

## 通过判据
- 0 failed / 0 execution problems / 0 assertion failures
- `reports.full/validation.json`：status=PASS, acceptance=true, scope=full
- `ws.full/.stage-gate-pass` report_sha256 == 实测 `reports.full/report.xml` SHA-256
- config_sha256 == 实测 `config.json` SHA-256

## 失败时的分诊
- 先看 setup 是否报 scope/元数据变化（如 `compile_commands_changed`）—— relocate 后这是**必然的**，不是缺陷。
- 再看 Generate Test Suites 的"解析文件过程中的错误"：若**全源**失败，最可能原因是迁移后 `.cpptest`/`.metadata` 混合态 → 用 drift-sensitive 路径删五项重试。
- 判定归属前必须排除副本污染：旧 `build/` 携带主根绝对路径、被 kill 轮留下半写状态、`logs/` 混入历史轮次都会造成假首因。
- 只有**干净副本**仍失败，其首个有效错误才可作为共享工具缺陷证据提交 tools-improve。

## 来源
2026-11-11 kernel-drivers-dma-buf（stage1，plain run 直通 220/220）+ kernel-arch-arm64（stage48 drift-sensitive）；2026-11-13 reloc-links-pilot-1113 根 9 workspace auto-unpack 批量验证全 PASS。
