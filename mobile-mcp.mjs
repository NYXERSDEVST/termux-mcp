import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const HOME = process.env.HOME || process.cwd();
const ROOT = path.resolve(process.env.MOBILE_MCP_ROOT || path.join(HOME, 'creator-mobile-node'));

const safePath = (value = '.') => {
  const resolved = path.resolve(ROOT, value);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) throw new Error('Path outside MOBILE_MCP_ROOT is not allowed');
  return resolved;
};

const exec = (cmd, args = [], timeout = 15000) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('command timeout')); }, timeout);
  child.stdout.on('data', d => out += d);
  child.stderr.on('data', d => err += d);
  child.on('error', reject);
  child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || `${cmd} exited ${code}`)); });
});

const server = new McpServer({ name: 'motorola-g15-mcp', version: '1.0.0' });

server.tool('device_status', 'Read safe Android/Termux device and runtime status', {}, async () => {
  let battery = null;
  try { battery = JSON.parse(await exec('termux-battery-status')); } catch {}
  const text = JSON.stringify({ hostname: os.hostname(), platform: os.platform(), arch: os.arch(), uptimeSeconds: os.uptime(), memoryTotal: os.totalmem(), memoryFree: os.freemem(), root: ROOT, battery }, null, 2);
  return { content: [{ type: 'text', text }] };
});

server.tool('list_files', 'List files inside the dedicated mobile MCP directory', { relativePath: z.string().default('.') }, async ({ relativePath }) => {
  const dir = safePath(relativePath);
  const rows = await fs.readdir(dir, { withFileTypes: true });
  return { content: [{ type: 'text', text: JSON.stringify(rows.map(x => ({ name: x.name, type: x.isDirectory() ? 'directory' : 'file' })), null, 2) }] };
});

server.tool('read_text_file', 'Read a UTF-8 text file inside the dedicated mobile MCP directory', { relativePath: z.string().min(1) }, async ({ relativePath }) => {
  const file = safePath(relativePath);
  const stat = await fs.stat(file);
  if (stat.size > 1024 * 1024) throw new Error('File too large');
  return { content: [{ type: 'text', text: await fs.readFile(file, 'utf8') }] };
});

server.tool('ffprobe_media', 'Inspect a media file inside the dedicated mobile MCP directory', { relativePath: z.string().min(1) }, async ({ relativePath }) => {
  const file = safePath(relativePath);
  const output = await exec('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], 30000);
  return { content: [{ type: 'text', text: output }] };
});

server.tool('transcode_preview', 'Create a 720p H.264/AAC preview inside the dedicated mobile MCP directory', { input: z.string().min(1), output: z.string().min(1) }, async ({ input, output }) => {
  const src = safePath(input), dst = safePath(output);
  if (!dst.toLowerCase().endsWith('.mp4')) throw new Error('Output must be .mp4');
  await exec('ffmpeg', ['-y', '-i', src, '-vf', 'scale=-2:720', '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '128k', dst], 10 * 60 * 1000);
  return { content: [{ type: 'text', text: JSON.stringify({ ok: true, output: path.relative(ROOT, dst) }) }] };
});

await fs.mkdir(ROOT, { recursive: true });
await server.connect(new StdioServerTransport());
