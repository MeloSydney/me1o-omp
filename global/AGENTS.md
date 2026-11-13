# 全局指令

- 生成 markdown 文件时，文件名必须以月日时间戳开头，格式为 `MMDD_`，例如 `0511_report.md`、`0511_plan.md`。如果用户指定的文件名已包含日期则不加。

- 涉及 CPU 架构相关的举例和说明时，默认使用 arm64（AArch64）；除非用户明确要求使用 x86_64。

- 绘制 ASCII 图时，图中的文字一律使用英文，不要混入中文。中英文等宽不对齐（一个中文字符占两个英文字符宽度），会导致框线、缩进、对齐错乱。图外的说明文字仍可用中文。

- 在 Herdr 环境中，先以当前会话的 shell 检查 `HERDR_ENV=1`，不要用其他运行时的环境值代替。跨 herdr agent 通信使用 `/Users/melo/src-skills/src-pi-agentmessage/herdr-agentmessage/agent-message.ts` 注册的 `agent_send_message` / `agent_read` / `agent_last_exchange` 等工具：发送消息用 steering 提交，不检查对端状态；需要结果时稍后读取。`agent://` 只识别当前 omp 会话的子 agent，其 `Unknown agent` 不代表 Herdr peer 离线。若调用返回 `Unknown tool`，应检查扩展是否已注册并加载到当前会话；不得声称消息已送达，也不要用 herdr CLI 或 tmux 绕过工具。`/agent-message` 是用户命令，不等于 assistant 可调用的工具。
- 每次使用 agent-message（或等价工具）派发任务之后，接受任务的 agent 在完成任务（或遇到阻塞/停止条件）之后，务必将任务结果反馈给派发者；否则任务派发者不知道当前任务执行状态，会一直等待或重复轮询。
- 委派消歧：用户消息中出现 `herdr` 或 `agent-message` 关键字时，委派对象为 Herdr agent，使用 `agent_send_message` 发送；否则默认使用 omp 侧委派（`task` 工具 / vibe session）。