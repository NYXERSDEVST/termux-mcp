import { useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface CopilotResponse {
  configured: boolean;
  reply: string;
  error?: string;
}

export default function CopilotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const next = [...messages, { role: "user" as const, text }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as CopilotResponse;
      setMessages([...next, { role: "assistant", text: data.error ?? data.reply }]);
    } catch (error) {
      setMessages([
        ...next,
        { role: "assistant", text: `Request failed: ${error instanceof Error ? error.message : String(error)}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel-card">
      <h2>Copilot</h2>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Calls Claude (claude-opus-5) via the server's /api/copilot route. Requires
        ANTHROPIC_API_KEY set on the server — otherwise it tells you so instead of
        pretending to answer.
      </p>
      <div className="chat-log">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder="Ask the copilot..."
          disabled={busy}
        />
        <button onClick={() => void send()} disabled={busy}>
          {busy ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
