import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import archiver from "archiver";
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { join, normalize, relative, resolve } from "node:path";
import { z } from "zod";
import { EXPORT_OUTPUT_DIR, REPO_ROOT } from "../constants.js";

const ExportWorkspaceInputSchema = z
  .object({
    path: z
      .string()
      .default(".")
      .describe(
        "Directory to export, relative to the repo root (e.g. 'templates/minimal-react'). Defaults to the whole repo.",
      ),
    archive_name: z
      .string()
      .default("export")
      .describe("Base name for the output .zip file (without extension)."),
  })
  .strict();

type ExportWorkspaceInput = z.infer<typeof ExportWorkspaceInputSchema>;

function resolveWithinRepo(relativePath: string): string {
  const target = resolve(REPO_ROOT, normalize(relativePath));
  const rel = relative(REPO_ROOT, target);
  if (rel.startsWith("..") || resolve(REPO_ROOT, rel) !== target) {
    throw new Error(`path escapes the repo root: ${relativePath}`);
  }
  return target;
}

export function registerExportWorkspaceTool(server: McpServer): void {
  server.registerTool(
    "export_workspace",
    {
      title: "Export Workspace as Zip",
      description: `Zip a directory from this repo (defaults to the whole repo) and write it to
.exports/<archive_name>-<timestamp>.zip.

Use this to package a template (path="templates/minimal-react") or the
current state of the whole workspace for download/handoff.

Args:
  - path (string): directory to zip, relative to the repo root (default: ".")
  - archive_name (string): base filename, no extension (default: "export")

Returns JSON: { archive_path, size_bytes }

Error Handling:
  - Returns "Error: path escapes the repo root" if path tries to traverse
    outside the repository (e.g. "../../etc").
  - Returns "Error: path not found" if the directory doesn't exist.`,
      inputSchema: ExportWorkspaceInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params: ExportWorkspaceInput) => {
      let sourceDir: string;
      try {
        sourceDir = resolveWithinRepo(params.path);
      } catch (error) {
        return {
          content: [
            { type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` },
          ],
        };
      }

      try {
        await stat(sourceDir);
      } catch {
        return { content: [{ type: "text" as const, text: `Error: path not found: ${params.path}` }] };
      }

      await mkdir(EXPORT_OUTPUT_DIR, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const archivePath = join(EXPORT_OUTPUT_DIR, `${params.archive_name}-${timestamp}.zip`);

      await new Promise<void>((resolvePromise, reject) => {
        const output = createWriteStream(archivePath);
        const archive = archiver("zip", { zlib: { level: 9 } });
        output.on("close", () => resolvePromise());
        archive.on("error", (err: Error) => reject(err));
        archive.pipe(output);
        archive.glob("**/*", {
          cwd: sourceDir,
          ignore: ["node_modules/**", "dist/**", ".git/**", ".exports/**"],
          dot: true,
        });
        void archive.finalize();
      });

      const { size } = await stat(archivePath);
      const output = { archive_path: archivePath, size_bytes: size };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );
}
