---
name: sync-skills
description: 将 ~/.Codex/skills/ 中的自定义 skills 通过软链接注册到 CodeFuse 的 skill 目录。当用户提到"同步 skill"、"注册 skill"、"skill 不生效"、"skill 未加载"、"sync-skills"时应触发此 skill。
version: 0.1.0
allowed-tools: Bash
argument-hint: "[--dry-run] [--remove] 例如: --dry-run 先预览不执行, --remove 移除已注册的软链接"
---

# 同步 Skills 到 CodeFuse

将 `~/.Codex/skills/` 中的自定义 skills 通过软链接注册到 Codefuse 的 skill 加载目录，使其在 Codex / CodeFuse 会话中可用。

## 背景

CodeFuse 扫描的 skill 目录为 `~/.codefuse/engine/cc/skills/`，而用户自定义 skill 通常放在 `~/.Codex/skills/`。此 skill 通过创建软链接将两者关联，避免手动复制或移动文件。

## 输入参数

`$ARGUMENTS` 支持以下可选标志：

| 标志 | 含义 |
|------|------|
| `--dry-run` | 仅预览将要执行的操作，不实际创建或删除软链接 |
| `--remove` | 移除 CodeFuse skill 目录中指向 `~/.Codex/skills/` 的软链接 |
| 无参数 | 执行同步（创建缺失的软链接） |

## 执行步骤

### 1. 确认源目录和目标目录

- **源目录**：`~/.Codex/skills/`
- **目标目录**：`~/.codefuse/engine/cc/skills/`

如果源目录不存在，提示用户：**"~/.Codex/skills/ 目录不存在，没有需要同步的 skill"** 并结束。

如果目标目录不存在，使用 `mkdir -p` 创建。

### 2. 扫描源目录中的 skills

列出 `~/.Codex/skills/` 下所有包含 `SKILL.md` 文件的子目录，这些就是需要注册的 skills。

跳过 `sync-skills` 自身（避免递归注册）。

### 3. 比对目标目录

对源目录中的每个 skill：

- 检查目标目录中是否已存在同名条目
- 如果已存在且是软链接且指向正确的源路径 → **跳过**（已同步）
- 如果已存在且是软链接但指向错误路径 → **标记为"需修复"**
- 如果已存在且是真实目录（非软链接）→ **标记为"冲突"**，不覆盖，提示用户手动处理
- 如果不存在 → **标记为"需创建"**

### 4. 执行操作

#### 默认模式（同步）

对"需创建"的 skill：

```bash
ln -s ~/.Codex/skills/<skill-name> ~/.codefuse/engine/cc/skills/<skill-name>
```

对"需修复"的 skill：

```bash
# 先移除旧链接，再创建新链接
rm ~/.codefuse/engine/cc/skills/<skill-name>
ln -s ~/.Codex/skills/<skill-name> ~/.codefuse/engine/cc/skills/<skill-name>
```

#### --remove 模式

移除目标目录中指向 `~/.Codex/skills/` 的软链接：

```bash
rm ~/.codefuse/engine/cc/skills/<skill-name>
```

只移除软链接，不移除真实目录。如果同名条目是真实目录而非软链接，跳过并提示。

#### --dry-run 模式

仅输出将要执行的操作列表，不实际执行。

### 5. 输出结果

告知用户：

- 新创建的软链接数量及 skill 名称
- 修复的软链接数量及 skill 名称
- 跳过的（已同步）skill 数量
- 冲突的 skill 名称（如有）
- 移除的软链接数量（--remove 模式）
- 提醒用户：**"需要重启 Codex / CodeFuse 会话才能加载新注册的 skill"**

## 注意事项

- 软链接使用绝对路径，确保移动目录后链接仍然有效
- 不会覆盖目标目录中的真实目录（非软链接），避免破坏 CodeFuse 自带的 skill
- `sync-skills` 自身不会被注册到 CodeFuse（避免递归），因为它已经在 `~/.Codex/skills/` 中，同步后需手动将其也链接过去，或由用户决定
- 如果用户在 `~/.Codex/skills/` 中新增了 skill，需要重新运行此 skill 来注册