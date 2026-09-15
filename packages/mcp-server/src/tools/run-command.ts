import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { exec } from "node:child_process";
import { z } from "zod";
import {
  REPO_ROOT,
  RUN_COMMAND_MAX_OUTPUT_CHARS,
  RUN_COMMAND_TIMEOUT_MS,
} from "../constants.js";

const RunCommandInputSchema = z
  .object({
    command: z
      .string()
      .min(1, "command must not be empty")
      .describe("The shell command to execute, e.g. 'npm run build' or 'git status'."),
    cwd: z
      .string()
      .optional()
      .describe(
        "Working directory, relative to the repo root. Defaults to the repo root itself.",
      ),
  })
  .strict();

type RunCommandInput = z.infer<typeof RunCommandInputSchema>;

interface RunCommandOutput {
  [key: string]: unknown;
  command: string;
  cwd: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
}

function truncate(text: string): { text: string; truncated: boolean } {
  if (text.length <= RUN_COMMAND_MAX_OUTPUT_CHARS) return { text, truncated: false };
  return {
    text: `${text.slice(0, RUN_COMMAND_MAX_OUTPUT_CHARS)}\n...[truncated]`,
    truncated: true,
  };
}

export function registerRunCommandTool(server: McpServer): void {
  server.registerTool(
    "run_command",
    {
      title: "Run Shell Command",
      description: `Execute a shell command on the machine this MCP server runs on, and return its
stdout/stderr/exit code.

This is a local, trusted developer tool — analogous to a coding assistant's
own bash tool. It runs with the same OS-level privileges as the MCP server
process, has no allowlist, and is NOT sandboxed. Only wire this server over
stdio to a trusted local client; never expose it over an HTTP transport
reachable by untrusted callers.

Args:
  - command (string): the shell command to run
  - cwd (string, optional): working directory relative to the repo root

Returns JSON with: command, cwd, exit_code, stdout, stderr, truncated
(true if stdout/stderr were cut down to the character limit).

Error Handling:
  - A non-zero exit_code is returned as normal output, not a tool error —
    inspect exit_code/stderr yourself to decide if the command "succeeded".
  - Returns "Error: command timed out after Ns" if it runs past the timeout.`,
      inputSchema: RunCommandInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: RunCommandInput) => {
      const cwd = params.cwd ? `${REPO_ROOT}/${params.cwd}` : REPO_ROOT;

      const result = await new Promise<RunCommandOutput>((resolve) => {
        exec(
          params.command,
          { cwd, timeout: RUN_COMMAND_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
          (error, stdout, stderr) => {
            const outTrunc = truncate(stdout);
            const errTrunc = truncate(stderr);
            resolve({
              command: params.command,
              cwd,
              exit_code: error && typeof error.code === "number" ? error.code : error ? 1 : 0,
              stdout: outTrunc.text,
              stderr: errTrunc.text,
              truncated: outTrunc.truncated || errTrunc.truncated,
            });
          },
        );
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );
}
