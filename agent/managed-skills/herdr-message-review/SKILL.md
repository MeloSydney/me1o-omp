---
name: herdr-message-review
description: "Review Herdr agent-to-agent messaging semantics, request feedback prerequisites, and failure boundaries"
---

When reviewing Herdr inter-agent message mechanisms, first check `HERDR_ENV=1` in the current shell; read the matching Herdr skill and installed `herdr agent`/`herdr pane` CLI contracts. Trace sender submission, acknowledgement semantics, recipient identity, session output correlation, concurrent senders, and failure/retry behavior. Distinguish input submitted from recipient processed. Avoid blind retry after ambiguous submission failures. Prefer `herdr agent prompt` over separate pane send-text/send-keys for agent-targeted submission. Treat read methods that trigger automatic kick as mutating operations. Confirm implementation and current CLI afresh; this is a review checklist, not proof of existing defects.

For `/agent-message request`, the returned UUID and `submitted` status only acknowledge dispatch. The recipient must have `agent_reply` loaded in its current session; after an extension update, an already-running OMP recipient can process and answer in chat but fail to call the absent tool, leaving durable status `submitted`. Inspect the request record and recipient's actual output before diagnosis; never treat a chat answer as an ID-correlated callback or blindly resend.
