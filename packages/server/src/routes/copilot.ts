import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import { COPILOT_MAX_TOKENS, COPILOT_MODEL } from "../constants.js";

interface CopilotMessage {
  role: "user" | "assistant";
  text: string;
}

interface CopilotRequestBody {
  messages?: CopilotMessage[];
}

export const copilotRouter = Router();

copilotRouter.post("/", (req, res) => {
  void (async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.json({
        configured: false,
        reply:
          "Copilot isn't configured yet — set ANTHROPIC_API_KEY on the server and restart it to enable this panel.",
      });
      return;
    }

    const body = req.body as CopilotRequestBody;
    const history = Array.isArray(body.messages) ? body.messages : [];
    if (history.length === 0) {
      res.status(400).json({ error: "messages must be a non-empty array" });
      return;
    }

    const client = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.text,
    }));

    try {
      const response = await client.messages.create({
        model: COPILOT_MODEL,
        max_tokens: COPILOT_MAX_TOKENS,
        output_config: { effort: "medium" },
        system:
          "You are the copilot panel inside Nyxers Workflow Cloud Dev, a developer dashboard. Be concise and practical; when you show code, keep it directly usable.",
        messages,
      });

      if (response.stop_reason === "refusal") {
        res.json({ configured: true, reply: "Claude declined to answer that request.", refusal: true });
        return;
      }

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );

      res.json({ configured: true, reply: textBlock?.text ?? "" });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        res.status(500).json({ configured: true, error: "Invalid ANTHROPIC_API_KEY on the server." });
      } else if (error instanceof Anthropic.RateLimitError) {
        res.status(429).json({ configured: true, error: "Rate limited — try again shortly." });
      } else if (error instanceof Anthropic.APIError) {
        res.status(502).json({ configured: true, error: `Claude API error: ${error.message}` });
      } else {
        res.status(500).json({
          configured: true,
          error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  })();
});
