import archiver from "archiver";
import { Router } from "express";
import { stat } from "node:fs/promises";
import { normalize, relative, resolve } from "node:path";
import { REPO_ROOT } from "../constants.js";

function resolveWithinRepo(relativePath: string): string {
  const target = resolve(REPO_ROOT, normalize(relativePath));
  const rel = relative(REPO_ROOT, target);
  if (rel.startsWith("..") || resolve(REPO_ROOT, rel) !== target) {
    throw new Error(`path escapes the repo root: ${relativePath}`);
  }
  return target;
}

export const exportRouter = Router();

// GET so the dashboard's Export button can just point an <a> / fetch at this
// URL: /api/export?path=templates/minimal-react&name=minimal-react
exportRouter.get("/", (req, res) => {
  void (async () => {
    const path = typeof req.query.path === "string" ? req.query.path : ".";
    const name = typeof req.query.name === "string" ? req.query.name : "export";

    let sourceDir: string;
    try {
      sourceDir = resolveWithinRepo(path);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      return;
    }

    try {
      await stat(sourceDir);
    } catch {
      res.status(404).json({ error: `path not found: ${path}` });
      return;
    }

    res.attachment(`${name}.zip`);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err: Error) => {
      res.status(500).end(String(err));
    });
    archive.pipe(res);
    archive.glob("**/*", {
      cwd: sourceDir,
      ignore: ["node_modules/**", "dist/**", ".git/**", ".exports/**"],
      dot: true,
    });
    void archive.finalize();
  })();
});
