import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { TEMPLATES_DIR } from "../constants.js";

const ListTemplatesInputSchema = z.object({}).strict();

interface TemplateManifest {
  name: string;
  description: string;
  stack: string;
}

interface TemplateEntry extends TemplateManifest {
  slug: string;
}

async function readManifest(slug: string): Promise<TemplateManifest | null> {
  try {
    const raw = await readFile(join(TEMPLATES_DIR, slug, "template.json"), "utf8");
    const parsed = JSON.parse(raw) as Partial<TemplateManifest>;
    return {
      name: parsed.name ?? slug,
      description: parsed.description ?? "",
      stack: parsed.stack ?? "unknown",
    };
  } catch {
    return null;
  }
}

export function registerListTemplatesTool(server: McpServer): void {
  server.registerTool(
    "list_templates",
    {
      title: "List Starter Templates",
      description: `List the starter project templates available under templates/ in this repo.

Each template is a directory with a template.json manifest ({name,
description, stack}) plus the actual project files. Use export_workspace
with cwd set to "templates/<slug>" to package one of these up.

Returns JSON: { templates: [{ slug, name, description, stack }] }

Error Handling:
  - Returns an empty templates array (not an error) if templates/ has no
    valid template.json manifests yet.`,
      inputSchema: ListTemplatesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      let slugs: string[] = [];
      try {
        const entries = await readdir(TEMPLATES_DIR, { withFileTypes: true });
        slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      } catch {
        slugs = [];
      }

      const templates: TemplateEntry[] = [];
      for (const slug of slugs) {
        const manifest = await readManifest(slug);
        if (manifest) templates.push({ slug, ...manifest });
      }

      const output = { templates };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );
}
