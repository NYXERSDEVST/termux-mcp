import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, createReadStream, readdirSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { WebSocketServer } from 'ws';

const port = Number(process.env.PORT || 10000);
const hlsRoot = process.env.HLS_ROOT || '/tmp/openstream-hls';
mkdirSync(hlsRoot, { recursive: true });

const channels = new Map();
const clients = new Set();

const sendJson = (res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS'
  });
  res.end(JSON.stringify(body));
};

const broadcast = payload => {
  const text = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === 1) client.send(text);
  }
};

const readBody = req => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
    if (data.length > 1024 * 1024) reject(new Error('body too large'));
  });
  req.on('end', () => {
    try { resolve(data ? JSON.parse(data) : {}); }
    catch (error) { reject(error); }
  });
  req.on('error', reject);
});

const safeId = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);

const channelSnapshot = channel => ({
  id: channel.id,
  source: channel.source,
  status: channel.status,
  startedAt: channel.startedAt || null,
  stoppedAt: channel.stoppedAt || null,
  pid: channel.process?.pid || null,
  hls: `/hls/${channel.id}/index.m3u8`,
  lastError: channel.lastError || null
});

const stopChannel = async id => {
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
};

const startChannel = async ({ id, source }) => {
  id = safeId(id);
  if (!id || !source) throw new Error('id and source are required');
  await stopChannel(id);

  const dir = join(hlsRoot, id);
  mkdirSync(dir, { recursive: true });
  const playlist = join(dir, 'index.m3u8');
  const segment = join(dir, 'segment_%06d.ts');

  const args = [
    '-hide_banner', '-loglevel', 'warning',
    '-i', String(source),
    '-map', '0:v:0?', '-map', '0:a:0?',
    '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
    '-c:a', 'aac', '-b:a', '128k',
    '-f', 'hls', '-hls_time', '4', '-hls_list_size', '8',
    '-hls_flags', 'delete_segments+append_list+independent_segments',
    '-hls_segment_filename', segment,
    playlist
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
};

const mime = path => ({
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t'
}[extname(path)] || 'application/octet-stream');

const server = http.createServer(async (req, res) => {
  if (!req.url) return sendJson(res, 404, { error: 'not found' });
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return sendJson(res, 200, {
        ok: true,
        service: 'OPENSTREAMINGPLATFORM Render Worker',
        ffmpeg: Boolean(ffmpegPath),
        channels: [...channels.values()].map(channelSnapshot),
        limits: {
          inboundRtmpSrt: false,
          note: 'Render web services expose HTTP(S); use this worker to pull reachable sources and emit HLS.'
        }
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/channels') {
      return sendJson(res, 200, { items: [...channels.values()].map(channelSnapshot) });
    }

    if (req.method === 'POST' && url.pathname === '/api/channels/start') {
      const body = await readBody(req);
      const channel = await startChannel(body);
      return sendJson(res, 202, { ok: true, channel });
    }

    if (req.method === 'POST' && url.pathname === '/api/channels/stop') {
      const body = await readBody(req);
      const id = safeId(body.id);
      const channel = await stopChannel(id);
      if (!channel) return sendJson(res, 404, { error: 'channel not found' });
      return sendJson(res, 200, { ok: true, channel });
    }

    if (req.method === 'POST' && url.pathname === '/api/node/heartbeat') {
      const body = await readBody(req);
      return sendJson(res, 200, {
        ok: true,
        node: {
          name: body.name || process.env.RENDER_SERVICE_NAME || 'render-worker',
          region: process.env.RENDER_REGION || 'render',
          status: 'online',
          endpoint: `https://${req.headers.host}`,
          lastSeen: Date.now()
        }
      });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/hls/')) {
      const relative = normalize(url.pathname.replace(/^\/hls\//, '')).replace(/^\.\.(\/|\\|$)/, '');
      const path = join(hlsRoot, relative);
      if (!path.startsWith(hlsRoot) || !existsSync(path) || !statSync(path).isFile()) {
        return sendJson(res, 404, { error: 'media not found' });
      }
      res.writeHead(200, {
        'content-type': mime(path),
        'cache-control': extname(path) === '.m3u8' ? 'no-cache' : 'public, max-age=30',
        'access-control-allow-origin': '*'
      });
      return createReadStream(path).pipe(res);
    }

    return sendJson(res, 404, { error: 'not found' });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : 'unknown error' });
  }
});

const wss = new WebSocketServer({ noServer: true });
wss.on('connection', socket => {
  clients.add(socket);
  socket.send(JSON.stringify({ type: 'worker.ready', channels: [...channels.values()].map(channelSnapshot) }));
  socket.on('close', () => clients.delete(socket));
});
server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`OPENSTREAMINGPLATFORM Render Worker listening on ${port}`);
});
