import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { PORT } from "./constants.js";
import { cliRouter } from "./routes/cli.js";
import { copilotRouter } from "./routes/copilot.js";
import { exportRouter } from "./routes/export.js";
import { templatesRouter } from "./routes/templates.js";
import { attachTerminalWebSocket } from "./ws/terminal.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/templates", templatesRouter);
app.use("/api/export", exportRouter);
app.use("/api/copilot", copilotRouter);
app.use("/api/cli", cliRouter);

const httpServer = createServer(app);
attachTerminalWebSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Nyxers Cloud Dev server listening on http://localhost:${PORT}`);
  console.log(`Terminal WebSocket: ws://localhost:${PORT}/ws/terminal`);
});
