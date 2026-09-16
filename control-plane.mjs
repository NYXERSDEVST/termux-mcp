const base = String(process.env.APPDEPLOY_BASE_URL || '').replace(/\/$/, '');
const endpoint = String(process.env.RENDER_EXTERNAL_URL || 'https://openstreamingplatform-worker.onrender.com');
const name = process.env.RENDER_NODE_NAME || 'Render Linux Worker Frankfurt';
const region = process.env.RENDER_REGION || 'frankfurt';
let nodeId = '';

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function ensureRegistered() {
  if (!base) return;
  try {
    const listing = await jsonFetch(`${base}/api/nodes`);
    const found = (listing.items || []).find(row => row.endpoint === endpoint || row.name === name);
    if (found?.id) nodeId = found.id;
    if (!nodeId) {
      const created = await jsonFetch(`${base}/api/nodes`, { method: 'POST', body: JSON.stringify({ name, region, endpoint, status: 'online' }) });
      nodeId = created.id || '';
      console.log(`Registered Render worker in AppDeploy control plane: ${nodeId}`);
    }
    if (nodeId) await jsonFetch(`${base}/api/nodes/${encodeURIComponent(nodeId)}/heartbeat`, { method: 'POST', body: '{}' });
  } catch (error) {
    console.error('AppDeploy control-plane sync failed:', error?.message || error);
  }
}

await ensureRegistered();
setInterval(ensureRegistered, 60_000).unref();
