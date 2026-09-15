import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { DEV_MACHINE_SPEC_PATH } from "../constants.js";

const GetDevMachineSpecInputSchema = z.object({}).strict();

export function registerGetDevMachineSpecTool(server: McpServer): void {
  server.registerTool(
    "get_dev_machine_spec",
    {
      title: "Get Recommended Dev Machine Spec",
      description: `Return the contents of docs/dev-machine-spec.md — the reference hardware spec
recommended for running this repo's full stack alongside a normal dev
workflow (browser, IDE, containers, optionally a local model).

This is documentation only — it does NOT provision any hardware or cloud VM.

Returns JSON: { path, markdown }

Error Handling:
  - Returns "Error: spec file not found" if docs/dev-machine-spec.md is
    missing (e.g. run from outside the repo checkout).`,
      inputSchema: GetDevMachineSpecInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      let markdown: string;
      try {
        markdown = await readFile(DEV_MACHINE_SPEC_PATH, "utf8");
      } catch {
        return { content: [{ type: "text" as const, text: "Error: spec file not found" }] };
      }

      const output = { path: DEV_MACHINE_SPEC_PATH, markdown };
      return {
        content: [{ type: "text" as const, text: markdown }],
        structuredContent: output,
      };
    },
  );
}
