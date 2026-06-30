---
name: feedback-hermes-codex-provider
description: Hermes must stay on openai-codex (ChatGPT Pro flat rate) — never switch to paid API providers
metadata:
  type: feedback
---

Keep Hermes on the `openai-codex` provider (ChatGPT Pro flat-rate plan). Never switch him to OpenRouter, Gemini, or any per-token API provider.

**Why:** Brew pays a flat rate for ChatGPT Pro. Using an API provider adds per-token costs. The goal is making money, not spending it.

**How to apply:** When Hermes auth fails, the fix is always re-authenticating the OAuth token (`hermes auth add openai-codex --manual-paste` on the VPS), never switching providers. The token expires periodically — that's the tradeoff for $0 marginal cost.
