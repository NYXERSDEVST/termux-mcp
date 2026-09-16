#!/usr/bin/env node
/**
 * nyxers-mcp-server — local dev-toolkit MCP server for Nyxers Workflow Cloud Dev.
 *
 * Exposes: run_command, list_templates, export_workspace, browse_url,
 * get_dev_machine_spec. Local stdio transport only — this server runs
 * commands with the same privileges as its own process and must not be
 * exposed over a network transport to untrusted callers.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerBrowseUrlTool } from "./tools/browse-url.js";
import { registerGetDevMachineSpecTool } from "./tools/dev-machine-spec.js";
import { registerExportWorkspaceTool } from "./tools/export-workspace.js";
import { registerListTemplatesTool } from "./tools/list-templates.js";
import { registerRunCommandTool } from "./tools/run-command.js";

const server = new McpServer({
  name: "nyxers-mcp-server",
  version: "0.1.0",
});

registerRunCommandTool(server);
registerListTemplatesTool(server);
registerExportWorkspaceTool(server);
registerBrowseUrlTool(server);
registerGetDevMachineSpecTool(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("nyxers-mcp-server running via stdio");
}

main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
