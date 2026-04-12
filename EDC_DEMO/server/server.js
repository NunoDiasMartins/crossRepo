import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(process.cwd(), '..');
const frontendRoot = resolve(root, 'frontend');

const clients = new Set();
let seq = 0;
let lastNodeId = 'RAN-Cluster-12';

const incidents = [
  { id: 'INC-4412', severity: 'High', status: 'Open', relatedNode: 'RAN-Cluster-12' },
  { id: 'INC-4403', severity: 'Medium', status: 'Investigating', relatedNode: 'Edge-GW-02' },
  { id: 'INC-4398', severity: 'Low', status: 'Monitoring', relatedNode: 'Auth-SVC' },
  { id: 'INC-4381', severity: 'Medium', status: 'Open', relatedNode: 'Transport-SW3' },
  { id: 'INC-4369', severity: 'Low', status: 'Open', relatedNode: 'DB-Primary' }
];

const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.ts': 'text/plain' };

function emit(message) {
  const payload = { ...message, seq: ++seq, id: `evt-${seq}` };
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((res) => res.write(data));
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function neighborsFor(nodeId) {
  const mapping = {
    'RAN-Cluster-12': ['Edge-GW-02'],
    'Edge-GW-02': ['RAN-Cluster-12', 'Core-RT-7', 'Billing-SVC'],
    'Core-RT-7': ['Edge-GW-02', 'API-GW-1', 'Auth-SVC'],
    'API-GW-1': ['Core-RT-7', 'Transport-SW3'],
    'Transport-SW3': ['API-GW-1', 'DB-Primary']
  };
  return mapping[nodeId] ?? [];
}

async function streamInvestigation(nodeId) {
  emit({ kind: 'ag-ui', type: 'intent.received', payload: { intent: 'InvestigateNode', nodeId, incidentId: `INC-${String(Math.floor(Math.random()*9000)+1000)}` } });
  await sleep(500);
  emit({ kind: 'ag-ui', type: 'agent.plan', payload: { steps: ['fetch related incidents', 'expand topology neighborhood', 'run correlation analysis'] } });
  await sleep(600);
  emit({ kind: 'ag-ui', type: 'tool.called', payload: { tool: 'IncidentTable.filter', args: { nodeId } } });
  await sleep(500);
  emit({ kind: 'a2ui', type: 'surface.updateDataModel', target: 'incidents', payload: { incidents: incidents.filter((i) => i.relatedNode === nodeId || neighborsFor(nodeId).includes(i.relatedNode)) } });
  await sleep(550);
  emit({ kind: 'ag-ui', type: 'tool.called', payload: { tool: 'Topology.expand', args: { nodeId } } });
  await sleep(500);
  emit({ kind: 'a2ui', type: 'surface.updateDataModel', target: 'topology', payload: { selectedNodeId: nodeId, neighborIds: neighborsFor(nodeId), impactedSegment: 'transport-west' } });
  await sleep(550);
  emit({ kind: 'ag-ui', type: 'state.updated', payload: { correlationFound: true, suspectedLayer: 'Transport' } });
  await sleep(500);
  emit({ kind: 'ag-ui', type: 'approval.requested', payload: { message: 'Likely issue in Transport Layer — isolate affected segment?', actions: ['approve', 'reject', 'modify'] } });
}

async function streamApproval(action) {
  emit({ kind: 'ag-ui', type: 'user.action', payload: { action } });
  await sleep(500);

  if (action === 'approve') {
    emit({ kind: 'ag-ui', type: 'tool.called', payload: { tool: 'Topology.focusSegment', args: { segmentId: 'transport-west' } } });
    await sleep(450);
    emit({ kind: 'a2ui', type: 'surface.updateDataModel', target: 'topology', payload: { selectedNodeId: lastNodeId, focusedSegment: 'transport-west', impactedServices: ['API-GW-1', 'Transport-SW3'] } });
  }

  if (action === 'modify') {
    emit({ kind: 'ag-ui', type: 'state.updated', payload: { correlationFound: true, suspectedLayer: 'Transport', narrowedScope: 'single edge gateway' } });
  }

  await sleep(350);
  emit({ kind: 'ag-ui', type: 'agent.completed', payload: { summary: `Analysis completed with operator action: ${action}.` } });
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => (body += c.toString()));
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost:8000');

  if (req.method === 'GET' && url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    clients.add(res);
    emit({ kind: 'ag-ui', type: 'state.updated', payload: { status: 'connected', note: 'SSE stream connected' } });
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/investigate') {
    const body = await parseBody(req);
    lastNodeId = body.nodeId ?? 'RAN-Cluster-12';
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end('{"ok":true}');
    streamInvestigation(lastNodeId);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/approval') {
    const body = await parseBody(req);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end('{"ok":true}');
    streamApproval(body.action ?? 'approve');
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const filePath = (url.pathname === '/' || url.pathname === '/dashboard-demo')
    ? resolve(frontendRoot, 'index.html')
    : resolve(frontendRoot, `.${url.pathname}`);
  try {
    const file = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] ?? 'application/octet-stream' });
    res.end(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(8000, () => console.log('EDC demo available at http://localhost:8000'));
