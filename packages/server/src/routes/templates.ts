import { Router } from "express";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { TEMPLATES_DIR } from "../constants.js";

interface TemplateManifest {
  name: string;
  description: string;
  stack: string;
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

export const templatesRouter = Router();

templatesRouter.get("/", (_req, res) => {
  void (async () => {
    let slugs: string[] = [];
    try {
      const entries = await readdir(TEMPLATES_DIR, { withFileTypes: true });
      slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      slugs = [];
    }

    const templates = [];
    for (const slug of slugs) {
      const manifest = await readManifest(slug);
      if (manifest) templates.push({ slug, ...manifest });
    }

    res.json({ templates });
  })();
});
