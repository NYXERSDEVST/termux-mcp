# OpenAI platform (as an alternate/second provider)

This repo's built-in copilot panel calls the **Anthropic Claude API** by
default (`packages/server/src/routes/copilot.ts`, model `claude-opus-5`).
This doc is for anyone who wants to add OpenAI as an additional backend —
kept as its own file so the default integration stays uncluttered.

## Setup

```bash
npm install openai
```

```ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await client.responses.create({
  model: "gpt-5.1",
  input: "Explain this codebase's build step in one paragraph.",
});
console.log(response.output_text);
```

## Where this plugs in

Same pattern as `google-ai.md`: add
`packages/server/src/routes/copilot-openai.ts` next to the existing Claude
route, and switch the model in `CopilotPanel.tsx`'s dropdown. Don't mix SDKs
in one file — keep each provider's client and route separate so upgrading
one doesn't risk breaking the other.

## Platform features worth knowing about if you go this route

- **Assistants/Responses API** — stateful conversation threads managed
  server-side by OpenAI, an alternative to keeping history in your own DB.
- **Realtime API** — WebSocket-based, low-latency voice/text — relevant if
  you want a voice mode for the copilot panel later.
- **Fine-tuning** — `client.fineTuning.jobs.create(...)` against a JSONL
  dataset, if you want a model tuned on your own codebase/support history
  rather than relying on prompting alone.
