import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";

export default function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      convertEol: true,
      fontFamily: "IBM Plex Mono, monospace",
      fontSize: 13,
      theme: { background: "#0a0b0d" },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/terminal`);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
    });

    socket.addEventListener("message", (event: MessageEvent<string>) => {
      try {
        const message = JSON.parse(event.data) as { type: string; data?: string };
        if (message.type === "output" && message.data) term.write(message.data);
        if (message.type === "exit") term.write("\r\n[process exited]\r\n");
      } catch {
        // ignore malformed frames
      }
    });

    const disposable = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "input", data }));
      }
    });

    const handleResize = () => {
      fitAddon.fit();
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      disposable.dispose();
      socket.close();
      term.dispose();
    };
  }, []);

  return (
    <div className="panel-card">
      <h2>Terminal</h2>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Real shell, backed by node-pty on the server. Connects to /ws/terminal.
      </p>
      <div ref={containerRef} style={{ height: "60vh" }} />
    </div>
  );
}
