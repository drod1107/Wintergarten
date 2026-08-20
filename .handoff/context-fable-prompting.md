# How Fable 5 Differs — Prompting Reference

Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5
Researched: 2026-08-19

## Key differences from Opus 4.8 / Sonnet 4.6

| Aspect | Sonnet/Opus | Fable 5 |
|---|---|---|
| Context window | 200k | 1M tokens |
| Max output | 32k | 128k tokens |
| Adaptive thinking | Optional | Always on |
| Individual turn length | Seconds | Can run many minutes |
| Prompt style | Explicit step-by-step | Brief steering — it infers steps |
| Agentic behavior | Needs prompting | Does it by default |
| Requesting reasoning | Fine | Triggers refusal (`stop_reason: "refusal"`) |

## Critical: Do NOT ask Fable to show/reproduce its reasoning
❌ "Show your thinking before answering"
❌ "Explain your reasoning step-by-step"
❌ "Reproduce your internal reasoning"
These trigger a `reasoning_extraction` refusal. Use adaptive thinking blocks instead.

## Effort parameter (use in system prompt or API call)
- `high` = default for most tasks (use this)
- `xhigh` = maximum for hardest problems
- `medium`/`low` = routine mechanical work

## Prompt style
Fable follows brief, clear instructions without needing enumeration of every behavior.
Prior-model prompts that list 10 explicit rules are often counterproductive — simplify.

Example: Instead of 10 bullet rules about formatting, just write:
"Lead with the outcome. Drop details that don't change what the reader would do next."

## Agentic boundaries — set these explicitly
Fable may: draft emails, create backups, refactor code if not bounded.
Set explicitly: "Do not refactor, add features, or take actions beyond the stated task."
Set explicitly: "When describing a problem (not requesting a fix), report findings and stop."

## Autonomous operation
Fable is designed for long autonomous runs. For tasks like this one:
"Operate autonomously. The user cannot answer questions mid-task. For reversible actions
that follow from the original request, proceed. Only block on credentials or irreversible
steps that were not pre-authorized."

## Progress verification
Fable can fabricate status in long runs. Mandate:
"Before reporting progress, verify each claim against a tool result from this session.
Report only what you can point to evidence for. If something is unverified, say so."

## Context limit reassurance
Fable may preemptively compress if it perceives context pressure. Preempt with:
"You have ample context remaining. Do not stop, summarize, or suggest a new session."

## Pricing (API)
- Input: $10/MTok
- Output: $50/MTok
- Much more expensive than Sonnet 4.6 ($3/$15) — Fable's budget per session is limited.
  The user explicitly noted this. Keep tool calls efficient; prefer javascript_tool over
  screenshots; read only what's needed.
