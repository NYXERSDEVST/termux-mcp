import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// packages/server/src/ -> repo root is three levels up.
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const TEMPLATES_DIR = join(REPO_ROOT, "templates");

export const PORT = Number(process.env.PORT ?? 8787);
export const COPILOT_MODEL = "claude-opus-5";
export const COPILOT_MAX_TOKENS = 8192;
