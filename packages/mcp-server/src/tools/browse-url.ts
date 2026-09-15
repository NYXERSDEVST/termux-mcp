import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { z } from "zod";
import { CHARACTER_LIMIT, EXPORT_OUTPUT_DIR } from "../constants.js";

const BrowseUrlInputSchema = z
  .object({
    url: z.string().url().describe("The http(s) URL to load."),
    screenshot: z
      .boolean()
      .default(false)
      .describe("If true, also save a full-page screenshot and return its path."),
    wait_for_selector: z
      .string()
      .optional()
      .describe("Optional CSS selector to wait for before reading the page (for JS-rendered content)."),
  })
  .strict();

type BrowseUrlInput = z.infer<typeof BrowseUrlInputSchema>;

export function registerBrowseUrlTool(server: McpServer): void {
  server.registerTool(
    "browse_url",
    {
      title: "Browse a URL (headless Chromium)",
      description: `Load a URL in headless Chromium (via Playwright) and return its title and
visible text content, optionally with a full-page screenshot. Unlike a
plain HTTP fetch, this renders JavaScript first — use it for SPAs and
client-rendered pages a simple fetch would return empty.

Args:
  - url (string): must be http:// or https:// (other schemes are rejected)
  - screenshot (boolean): also save a PNG screenshot (default: false)
  - wait_for_selector (string, optional): CSS selector to wait for before
    reading the page, for content that renders after initial load

Returns JSON: { url, title, text, screenshot_path? }
text is truncated to ${CHARACTER_LIMIT} characters.

Error Handling:
  - Returns "Error: only http/https URLs are supported" for other schemes
    (e.g. file://, data:) — this tool must not be used to read local files.
  - Returns "Error: navigation failed: <reason>" on timeout, DNS failure,
    or a non-2xx/3xx response.`,
      inputSchema: BrowseUrlInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: BrowseUrlInput) => {
      const scheme = new URL(params.url).protocol;
      if (scheme !== "http:" && scheme !== "https:") {
        return { content: [{ type: "text" as const, text: "Error: only http/https URLs are supported" }] };
      }

      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        try {
          await page.goto(params.url, { waitUntil: "networkidle", timeout: 30_000 });
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: navigation failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }

        if (params.wait_for_selector) {
          await page.waitForSelector(params.wait_for_selector, { timeout: 10_000 }).catch(() => {});
        }

        const title = await page.title();
        const rawText = await page.evaluate(() => document.body?.innerText ?? "");
        const text =
          rawText.length > CHARACTER_LIMIT
            ? `${rawText.slice(0, CHARACTER_LIMIT)}\n...[truncated]`
            : rawText;

        let screenshotPath: string | undefined;
        if (params.screenshot) {
          await mkdir(join(EXPORT_OUTPUT_DIR, "screenshots"), { recursive: true });
          screenshotPath = join(EXPORT_OUTPUT_DIR, "screenshots", `${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
        }

        const output = { url: params.url, title, text, ...(screenshotPath ? { screenshot_path: screenshotPath } : {}) };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } finally {
        await browser.close();
      }
    },
  );
}
