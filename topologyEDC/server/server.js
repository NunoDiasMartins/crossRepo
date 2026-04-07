const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 4310;
const publicDir = path.join(__dirname, '..', 'public');

const clients = new Set();

const availableTools = [
  'topology',
  'incidentTable',
  'kpiChart',
  'rcaGraph',
  'actionPanel'
];

const baseState = {
  incidents: [
    { id: 'INC-101', severity: 'critical', status: 'open', node: 'node-1', domain: 'core' },
    { id: 'INC-203', severity: 'major', status: 'investigating', node: 'node-2', domain: 'core' },
    { id: 'INC-338', severity: 'minor', status: 'open', node: 'node-4', domain: 'edge' }
  ],
  metrics: {
    all: {
      latency: [39, 42, 45, 61, 88, 92, 80, 64, 58],
      errors: [1, 1, 2, 4, 7, 8, 5, 3, 2]
    },
    core: {
      latency: [42, 46, 49, 70, 95, 105, 89, 73, 65],
      errors: [1, 2, 2, 6, 9, 11, 7, 5, 4]
    }
  },
  healthy: false
};

function send(client, payload) {
  client.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcast(payload) {
  for (const client of clients) {
    send(client, payload);
  }
}

function composeResponse({ intent, context = {} }) {
  if (intent === 'investigate_service') {
    const nodeId = context.nodeId || 'node-1';
    return {
      intent,
      context,
      tool_usage: ['topology', 'incidentTable', 'kpiChart', 'rcaGraph'],
      status_text: 'Agent is analyzing topology and incidents…',
      layout: { layout: 'grid', panels: ['topology', 'incidentTable', 'kpiChart', 'rcaGraph'] },
      ui_actions: [
        { type: 'highlight_nodes', ids: [nodeId, 'node-2'] },
        { type: 'open_panel', component: 'incidentTable' },
        { type: 'render_widget', component: 'kpiChart', metrics: ['latency', 'errors'], scope: 'all' },
        { type: 'render_widget', component: 'rcaGraph', rootCause: 'node-2' }
      ]
    };
  }

  if (intent === 'refine_focus') {
    return {
      intent,
      context,
      tool_usage: ['incidentTable', 'kpiChart'],
      status_text: 'Agent is refining scope to core routers…',
      ui_actions: [
        { type: 'filter_incidents', criteria: 'core' },
        { type: 'update_chart_scope', scope: 'core' }
      ]
    };
  }

  if (intent === 'request_action') {
    return {
      intent,
      context,
      tool_usage: ['actionPanel'],
      status_text: 'Agent suggests action based on RCA confidence.',
      ui_actions: [{ type: 'show_action', action: 'reroute_traffic', confidence: 0.87 }]
    };
  }

  if (intent === 'approve_action') {
    return {
      intent,
      context,
      tool_usage: ['topology', 'incidentTable'],
      status_text: 'Applying corrective action…',
      ui_actions: [
        { type: 'update_topology_state', status: 'healthy' },
        { type: 'resolve_incidents' }
      ]
    };
  }

  return {
    intent: intent || 'unknown',
    context,
    tool_usage: [],
    status_text: 'No deterministic action available for that request.',
    ui_actions: []
  };
}

function serveStatic(req, res) {
  const safePath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType =
      ext === '.css'
        ? 'text/css'
        : ext === '.js'
          ? 'application/javascript'
          : 'text/html';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function collectBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    clients.add(res);
    send(res, {
      intent: 'session_ready',
      context: {},
      tool_usage: ['bootstrap'],
      availableTools,
      state: baseState,
      status_text: 'Agent channel ready. Start from topology to investigate.',
      layout: { layout: 'grid', panels: ['topology'] },
      ui_actions: []
    });

    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.url === '/agent' && req.method === 'POST') {
    const message = await collectBody(req);
    const agentMessage = composeResponse(message);
    broadcast(agentMessage);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, dispatched: agentMessage }));
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`topologyEDC mock agent server on http://localhost:${port}`);
});
