import { useState } from "react";

interface CliResult {
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
}

export default function CliPanel() {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<CliResult[]>([]);
  const [busy, setBusy] = useState(false);

  async function run() {
    const trimmed = command.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed }),
      });
      const data = (await res.json()) as CliResult;
      setHistory((prev) => [...prev, data]);
      setCommand("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel-card">
      <h2>CLI</h2>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        One-shot command runner (separate from the interactive Terminal panel) —
        runs a single command via /api/cli and shows its full output once it exits.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, fontFamily: "IBM Plex Mono, monospace" }}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void run();
          }}
          placeholder="npm run build"
          disabled={busy}
        />
        <button onClick={() => void run()} disabled={busy}>
          {busy ? "Running..." : "Run"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {history.map((entry, i) => (
          <div key={i} className="panel-card" style={{ background: "#0e0f12" }}>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", marginBottom: 6 }}>
              $ {entry.command} <span style={{ color: "var(--muted)" }}>(exit {entry.exit_code})</span>
            </div>
            {entry.stdout && <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{entry.stdout}</pre>}
            {entry.stderr && (
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--danger)" }}>{entry.stderr}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
