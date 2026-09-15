import type { Server as HttpServer } from "node:http";
import pty from "node-pty";
import { WebSocketServer, type WebSocket } from "ws";
import { REPO_ROOT } from "../constants.js";

interface ClientMessage {
  type: "input" | "resize";
  data?: string;
  cols?: number;
  rows?: number;
}

const SHELL = process.platform === "win32" ? "powershell.exe" : process.env.SHELL ?? "bash";

export function attachTerminalWebSocket(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/terminal" });

  wss.on("connection", (socket: WebSocket) => {
    const shell = pty.spawn(SHELL, [], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: REPO_ROOT,
      env: process.env as Record<string, string>,
    });

    shell.onData((data: string) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: "output", data }));
      }
    });

    shell.onExit(({ exitCode }) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: "exit", exitCode }));
        socket.close();
      }
    });

    socket.on("message", (raw) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        return;
      }

      if (message.type === "input" && typeof message.data === "string") {
        shell.write(message.data);
      } else if (message.type === "resize" && message.cols && message.rows) {
        shell.resize(message.cols, message.rows);
      }
    });

    socket.on("close", () => {
      shell.kill();
    });
  });
}
