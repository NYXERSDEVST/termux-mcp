import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// packages/mcp-server/src/ -> repo root is three levels up.
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const TEMPLATES_DIR = join(REPO_ROOT, "templates");
export const DEV_MACHINE_SPEC_PATH = join(REPO_ROOT, "docs", "dev-machine-spec.md");
export const EXPORT_OUTPUT_DIR = join(REPO_ROOT, ".exports");

export const CHARACTER_LIMIT = 25000;
export const RUN_COMMAND_TIMEOUT_MS = 60_000;
export const RUN_COMMAND_MAX_OUTPUT_CHARS = 20_000;
