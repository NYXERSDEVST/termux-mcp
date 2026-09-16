import express from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, createReadStream, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { WebSocketServer } from 'ws';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, authorization');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const port = Number(process.env.PORT || 10000);
const hlsRoot = process.env.HLS_ROOT || '/tmp/openstream-hls';
mkdirSync(hlsRoot, { recursive: true });
const channels = new Map();
const clients = new Set();
const mobileNodes = new Map();
const startedAt = new Date().toISOString();

function requireAuth(req, res, next) {
  const expected = process.env.CONTROL_TOKEN;
  if (!expected) return res.status(503).json({ error: 'control_token_not_configured' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (token !== expected) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function providerState() {
  return {
    grok: Boolean(process.env.XAI_API_KEY),
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    appdeploy: Boolean(process.env.APPDEPLOY_BASE_URL),
    webflow: Boolean(process.env.WEBFLOW_SITE_URL)
  };
}

function safeId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
}

function channelSnapshot(channel) {
  return {
    id: channel.id,
    source: channel.source,
    status: channel.status,
    startedAt: channel.startedAt || null,
    stoppedAt: channel.stoppedAt || null,
    pid: channel.process?.pid || null,
    hls: `/hls/${channel.id}/index.m3u8`,
    lastError: channel.lastError || null
  };
}

function broadcast(payload) {
  const text = JSON.stringify(payload);
  for (const client of clients) if (client.readyState === 1) client.send(text);
}

async function stopChannel(id) {
  const channel = channels.get(id);
  if (!channel) return null;
  if (channel.process && !channel.process.killed) {
    channel.status = 'stopping';
    channel.process.kill('SIGTERM');
    setTimeout(() => {
      try { if (!channel.process.killed) channel.process.kill('SIGKILL'); } catch {}
    }, 5000).unref();
  } else {
    channel.status = 'offline';
    channel.stoppedAt = Date.now();
  }
  broadcast({ type: 'channel.status', channel: channelSnapshot(channel) });
  return channelSnapshot(channel);
}

async function startChannel({ id, source }) {
  id = safeId(id);
  if (!id || !source) throw new Error('id and source are required');
  await stopChannel(id);
  const dir = join(hlsRoot, id);
  mkdirSync(dir, { recursive: true });
  const playlist = join(dir, 'index.m3u8');
  const segment = join(dir, 'segment_%06d.ts');
  const args = [
    '-hide_banner', '-loglevel', 'warning', '-i', String(source),
    '-map', '0:v:0?', '-map', '0:a:0?', '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
    '-c:a', 'aac', '-b:a', '128k', '-f', 'hls', '-hls_time', '4', '-hls_list_size', '8',
    '-hls_flags', 'delete_segments+append_list+independent_segments', '-hls_segment_filename', segment, playlist
  ];
  const proc = spawn(ffmpegPath || 'ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const channel = { id, source, process: proc, status: 'starting', startedAt: Date.now(), stoppedAt: null, lastError: null };
  channels.set(id, channel);
  let stderr = '';
  proc.stderr.on('data', chunk => {
    stderr = (stderr + chunk.toString()).slice(-4000);
    if (channel.status === 'starting') {
      channel.status = 'live';
      broadcast({ type: 'channel.status', channel: channelSnapshot(channel) });
    }
  });
  proc.on('error', error => {
    channel.status = 'error';
    channel.lastError = error.message;
    broadcast({ type: 'channel.status', channel: channelSnapshot(channel) });
  });
  proc.on('exit', (code, signal) => {
    channel.status = code === 0 || signal === 'SIGTERM' ? 'offline' : 'error';
    channel.stoppedAt = Date.now();
    if (channel.status === 'error') channel.lastError = stderr || `ffmpeg exited ${code}`;
    broadcast({ type: 'channel.status', channel: channelSnapshot(channel) });
  });
  broadcast({ type: 'channel.status', channel: channelSnapshot(channel) });
  return channelSnapshot(channel);
}

async function aiCall(provider, prompt) {
  if (provider === 'grok') {
    if (!process.env.XAI_API_KEY) throw new Error('XAI_API_KEY not configured');
    const r = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.XAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.XAI_MODEL || 'grok-4-latest', messages: [{ role: 'user', content: prompt }] })
    });
    const j = await r.json(); if (!r.ok) throw new Error(j?.error?.message || 'xAI request failed');
    return j.choices?.[0]?.message?.content || '';
  }
  if (provider === 'claude') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] })
    });
    const j = await r.json(); if (!r.ok) throw new Error(j?.error?.message || 'Anthropic request failed');
    return (j.content || []).map(x => x.text || '').join('');
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5.6', input: prompt })
  });
  const j = await r.json(); if (!r.ok) throw new Error(j?.error?.message || 'OpenAI request failed');
  return j.output_text || '';
}

app.get('/', (_req, res) => res.type('html').send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>OPENSTREAMINGPLATFORM</title><style>body{font-family:system-ui;background:#0b0d10;color:#f6f7fa;padding:28px}main{max-width:820px;margin:auto}.card{background:#151a22;border:1px solid #2b3441;border-radius:18px;padding:20px;margin:14px 0}code{color:#ffd54a}</style><main><h1>OPENSTREAMINGPLATFORM</h1><div class="card"><b>Render Linux worker online</b><p>FFmpeg + HLS + WebSockets + MCP + AI gateway + Android node registry.</p></div><div class="card"><code>GET /health</code><br><code>POST /mcp</code><br><code>POST /api/ai</code><br><code>POST /api/nodes/register</code></div></main>`));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'OPENSTREAMINGPLATFORM Render Worker', startedAt, ffmpeg: Boolean(ffmpegPath), providers: providerState(), channels: [...channels.values()].map(channelSnapshot), mobileNodes: [...mobileNodes.values()] }));
app.get('/api/status', requireAuth, (_req, res) => res.json({ ok: true, startedAt, providers: providerState(), channels: [...channels.values()].map(channelSnapshot), mobileNodes: [...mobileNodes.values()] }));
app.get('/api/channels', requireAuth, (_req, res) => res.json({ items: [...channels.values()].map(channelSnapshot) }));
app.post('/api/channels/start', requireAuth, async (req, res) => { try { res.status(202).json({ ok: true, channel: await startChannel(req.body || {}) }); } catch (e) { res.status(400).json({ error: String(e.message || e) }); } });
app.post('/api/channels/stop', requireAuth, async (req, res) => { const channel = await stopChannel(safeId(req.body?.id)); if (!channel) return res.status(404).json({ error: 'channel not found' }); res.json({ ok: true, channel }); });
app.post('/api/ai', requireAuth, async (req, res) => { try { const provider = req.body?.provider || 'grok'; const prompt = String(req.body?.prompt || ''); if (!prompt) return res.status(400).json({ error: 'prompt_required' }); res.json({ provider, output: await aiCall(provider, prompt) }); } catch (e) { res.status(502).json({ error: String(e.message || e) }); } });
app.post('/api/nodes/register', requireAuth, (req, res) => { const id = safeId(req.body?.id || crypto.randomUUID()); const row = { id, name: req.body?.name || 'mobile-node', type: req.body?.type || 'android', capabilities: req.body?.capabilities || [], status: 'online', lastSeen: new Date().toISOString() }; mobileNodes.set(id, row); broadcast({ type: 'node.status', node: row }); res.json(row); });
app.post('/api/nodes/:id/heartbeat', requireAuth, (req, res) => { const id = safeId(req.params.id); const old = mobileNodes.get(id) || { id, name: req.body?.name || 'mobile-node', type: req.body?.type || 'android', capabilities: [] }; const row = { ...old, ...req.body, id, status: 'online', lastSeen: new Date().toISOString() }; mobileNodes.set(id, row); broadcast({ type: 'node.status', node: row }); res.json(row); });
app.post('/api/node/heartbeat', requireAuth, (req, res) => res.json({ ok: true, node: { name: req.body?.name || process.env.RENDER_SERVICE_NAME || 'render-worker', region: process.env.RENDER_REGION || 'render', status: 'online', endpoint: `https://${req.headers.host}`, lastSeen: Date.now() } }));
app.get('/hls/:id/:file', (req, res) => { const relative = normalize(`${safeId(req.params.id)}/${req.params.file}`).replace(/^\.\.(\/|\\|$)/, ''); const path = join(hlsRoot, relative); if (!path.startsWith(hlsRoot) || !existsSync(path) || !statSync(path).isFile()) return res.status(404).json({ error: 'media not found' }); res.setHeader('content-type', extname(path) === '.m3u8' ? 'application/vnd.apple.mpegurl' : 'video/mp2t'); res.setHeader('cache-control', extname(path) === '.m3u8' ? 'no-cache' : 'public, max-age=30'); createReadStream(path).pipe(res); });

function buildMcpServer() {
  const mcp = new McpServer({ name: 'openstreamingplatform-mcp', version: '2.0.1' });
  mcp.tool('platform_status', 'Get Render worker, stream, provider and mobile node status', {}, async () => ({ content: [{ type: 'text', text: JSON.stringify({ providers: providerState(), channels: [...channels.values()].map(channelSnapshot), mobileNodes: [...mobileNodes.values()], startedAt }, null, 2) }] }));
  mcp.tool('ai_generate', 'Generate text through OpenAI, Grok or Claude', { provider: z.enum(['openai', 'grok', 'claude']), prompt: z.string().min(1) }, async ({ provider, prompt }) => ({ content: [{ type: 'text', text: await aiCall(provider, prompt) }] }));
  mcp.tool('stream_start', 'Start an HLS stream from a reachable source URL', { id: z.string().min(1), source: z.string().url() }, async ({ id, source }) => ({ content: [{ type: 'text', text: JSON.stringify(await startChannel({ id, source }), null, 2) }] }));
  mcp.tool('stream_stop', 'Stop an active stream', { id: z.string().min(1) }, async ({ id }) => ({ content: [{ type: 'text', text: JSON.stringify(await stopChannel(safeId(id)), null, 2) }] }));
  mcp.tool('mobile_nodes', 'List registered Android/mobile worker nodes', {}, async () => ({ content: [{ type: 'text', text: JSON.stringify([...mobileNodes.values()], null, 2) }] }));
  return mcp;
}

app.post('/mcp', requireAuth, async (req, res) => {
  const mcp = buildMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { try { transport.close(); } catch {} try { mcp.close(); } catch {} });
  try { await mcp.connect(transport); await transport.handleRequest(req, res, req.body); } catch (e) { if (!res.headersSent) res.status(500).json({ error: String(e.message || e) }); }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', socket => { clients.add(socket); socket.send(JSON.stringify({ type: 'worker.ready', channels: [...channels.values()].map(channelSnapshot), mobileNodes: [...mobileNodes.values()] })); socket.on('close', () => clients.delete(socket)); });
server.on('upgrade', (req, socket, head) => { if (req.url === '/ws') wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req)); else socket.destroy(); });
server.listen(port, '0.0.0.0', () => console.log(`OPENSTREAMINGPLATFORM Render Worker v2.0.1 listening on ${port}`));
