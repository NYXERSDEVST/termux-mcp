import { exec } from "node:child_process";
import { Router } from "express";
import { REPO_ROOT } from "../constants.js";

interface CliRequestBody {
  command?: string;
}

const MAX_OUTPUT_CHARS = 20_000;
const TIMEOUT_MS = 30_000;

function truncate(text: string): string {
  return text.length > MAX_OUTPUT_CHARS ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n...[truncated]` : text;
}

export const cliRouter = Router();

// One-shot command execution for the dashboard's CLI panel — distinct from
// the interactive /ws/terminal shell, this runs a single command and
// returns its full output once it exits.
cliRouter.post("/", (req, res) => {
  const body = req.body as CliRequestBody;
  const command = body.command;
  if (!command) {
    res.status(400).json({ error: "command is required" });
    return;
  }

  exec(command, { cwd: REPO_ROOT, timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    res.json({
      command,
      exit_code: error && typeof error.code === "number" ? error.code : error ? 1 : 0,
      stdout: truncate(stdout),
      stderr: truncate(stderr),
    });
  });
});
