---
name: dogfooding
description: 更新或查看 DogFooding 模型配置。当用户说「更新 dogfooding」「查看当前模型」「切换模型」时使用。
---

# DogFooding 模型配置管理

## 脚本

`~/.Codex/hooks/ali-feedback-survey/dogfooding-update.js`

## 操作

### 查看当前配置和远程推荐

```bash
node ~/.Codex/hooks/ali-feedback-survey/dogfooding-update.js --list
```

展示当前三档映射和远程接口的推荐配置。

### 更新到远程推荐配置

```bash
node ~/.Codex/hooks/ali-feedback-survey/dogfooding-update.js
```

从模型配置接口拉取最新 modelMapping，转换后写入 `~/.config/Codex-proxy/config.json`。

## 映射关系

接口返回 `{ default, sonnet, opus, haiku }`，转换为 CC proxy 格式：
- haiku → small_model
- sonnet → model
- opus → opus_model

## 注意

- 修改后需要**重启 Codex 会话**才生效
- 脚本不存在时提示重新安装插件
