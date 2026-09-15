# Google AI (Gemini API / Vertex AI)

The copilot panel in this repo defaults to the Anthropic Claude API (see
`openai-platform.md`'s sibling section and `packages/server/src/routes/copilot.ts`).
If you want a second/alternate model backend via Google, here's the real
setup — kept separate so the two integrations don't get tangled in one
client.

## Gemini API (simplest — API key, no GCP project required)

```bash
npm install @google/genai
```

```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Explain this codebase's build step in one paragraph.",
});
console.log(response.text);
```

Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Vertex AI (GCP project, enterprise auth/quotas)

Same `@google/genai` package, different constructor — no separate SDK to
learn:

```ts
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID,
  location: "us-central1",
});
```

Auth via Application Default Credentials
(`gcloud auth application-default login` for local dev, or a service
account for the deployed server).

## Where this plugs into the dashboard

If you want a model picker in the copilot panel instead of a single hardcoded
provider, add a second route (`packages/server/src/routes/copilot-gemini.ts`
alongside the existing Claude one) and a provider dropdown in
`packages/dashboard/src/panels/CopilotPanel.tsx` — the panel's chat UI is
already provider-agnostic (it just POSTs `{messages}` and renders
`{reply}`), so swapping backends doesn't touch the frontend's rendering
logic.
