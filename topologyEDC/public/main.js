const availableTools = [
  'topology',
  'incidentTable',
  'kpiChart',
  'rcaGraph',
  'actionPanel'
];

const appState = {
  selectedNode: 'node-1',
  topologyHealth: 'degraded',
  incidents: [],
  incidentFilter: 'all',
  chartScope: 'all',
  metrics: { all: { latency: [], errors: [] }, core: { latency: [], errors: [] } },
  panels: ['topology'],
  action: null,
  rcaRoot: null
};

class TopologyTool extends HTMLElement {
  set data(data) {
    this._data = data;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const { highlighted = [], selectedNode, topologyHealth } = this._data || {};
    const nodes = [
      { id: 'node-1', x: 110, y: 85, role: 'core', alert: true },
      { id: 'node-2', x: 290, y: 90, role: 'core', alert: true },
      { id: 'node-3', x: 190, y: 170, role: 'dist', alert: false },
      { id: 'node-4', x: 390, y: 170, role: 'edge', alert: false }
    ];

    this.className = 'panel topology';
    this.innerHTML = `
      <h3>Topology (${topologyHealth || 'degraded'})</h3>
      <svg viewBox="0 0 500 240">
        <line class="edge" x1="110" y1="85" x2="290" y2="90"></line>
        <line class="edge" x1="110" y1="85" x2="190" y2="170"></line>
        <line class="edge" x1="290" y1="90" x2="390" y2="170"></line>
        <line class="edge" x1="190" y1="170" x2="390" y2="170"></line>
        ${nodes
          .map((node) => {
            const classes = ['node'];
            if (node.alert && topologyHealth !== 'healthy') classes.push('alert');
            if (highlighted.includes(node.id)) classes.push('highlight');
            return `<g data-node="${node.id}">
              <circle class="${classes.join(' ')}" cx="${node.x}" cy="${node.y}" r="22"></circle>
              <text x="${node.x}" y="${node.y + 4}" text-anchor="middle" font-size="10" fill="#091324">${node.id}</text>
              ${selectedNode === node.id ? `<circle cx="${node.x}" cy="${node.y}" r="28" fill="none" stroke="#53d0ff" stroke-width="2"></circle>` : ''}
            </g>`;
          })
          .join('')}
      </svg>
      <small>Click node to trigger investigate intent.</small>
    `;

    this.querySelectorAll('[data-node]').forEach((el) => {
      el.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('node-select', { detail: el.dataset.node, bubbles: true }));
      });
    });
  }
}

class IncidentTableTool extends HTMLElement {
  set data(data) {
    this._data = data;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const incidents = this._data?.incidents || [];
    this.className = 'panel';
    this.innerHTML = `
      <h3>Incident Table</h3>
      <small>Filter: ${this._data?.incidentFilter || 'all'}</small>
      <table>
        <thead><tr><th>id</th><th>severity</th><th>status</th><th>affected node</th></tr></thead>
        <tbody>
          ${incidents
            .map(
              (it) => `<tr>
              <td>${it.id}</td>
              <td><span class="badge ${it.severity}">${it.severity}</span></td>
              <td>${it.status}</td>
              <td>${it.node}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;
  }
}

class KpiChartTool extends HTMLElement {
  set data(data) {
    this._data = data;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.className = 'panel kpi';
    this.innerHTML = `
      <h3>KPI Chart</h3>
      <small>Scope: ${this._data?.scope || 'all'}</small>
      <canvas width="420" height="180"></canvas>
    `;
    const ctx = this.querySelector('canvas').getContext('2d');
    this.drawSeries(ctx, this._data?.latency || [], '#53d0ff');
    this.drawSeries(ctx, this._data?.errors || [], '#ff7a7a');
  }

  drawSeries(ctx, data, color) {
    if (!ctx || !data.length) return;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const max = Math.max(...data) + 5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1 || 1)) * (w - 30) + 15;
      const y = h - (v / max) * (h - 24) - 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

class RcaGraphTool extends HTMLElement {
  set data(data) {
    this._data = data;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const root = this._data?.root || 'node-2';
    this.className = 'panel';
    this.innerHTML = `
      <h3>RCA Graph</h3>
      <svg viewBox="0 0 420 210">
        <line class="edge" x1="80" y1="40" x2="210" y2="105"></line>
        <line class="edge" x1="80" y1="170" x2="210" y2="105"></line>
        <line class="edge" x1="210" y1="105" x2="340" y2="105"></line>
        <circle cx="80" cy="40" r="20" class="node"></circle>
        <circle cx="80" cy="170" r="20" class="node"></circle>
        <circle cx="210" cy="105" r="24" class="node root-cause"></circle>
        <circle cx="340" cy="105" r="20" class="node"></circle>
        <text x="210" y="110" font-size="10" text-anchor="middle" fill="#111">${root}</text>
      </svg>
      <small>Root cause highlighted.</small>
    `;
  }
}

class ActionPanelTool extends HTMLElement {
  set data(data) {
    this._data = data;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.className = 'panel';
    const action = this._data?.action;
    this.innerHTML = `
      <h3>Action Panel</h3>
      ${
        action
          ? `<div class="action">
              <p>Suggested action: <strong>${action.action}</strong></p>
              <p>Confidence: ${(action.confidence * 100).toFixed(1)}%</p>
              <button id="approve">Approve</button>
              <button id="reject">Reject</button>
            </div>`
          : '<p>Waiting for agent recommendation…</p>'
      }
    `;

    this.querySelector('#approve')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('action-approve', { bubbles: true }));
    });
  }
}

customElements.define('tool-topology', TopologyTool);
customElements.define('tool-incidents', IncidentTableTool);
customElements.define('tool-kpi', KpiChartTool);
customElements.define('tool-rca', RcaGraphTool);
customElements.define('tool-action', ActionPanelTool);

const workspace = document.querySelector('#workspace');
const log = document.querySelector('#event-log');
const status = document.querySelector('#agent-status');

function panelFor(tool) {
  if (tool === 'topology') {
    const el = document.createElement('tool-topology');
    el.data = {
      selectedNode: appState.selectedNode,
      highlighted: appState.highlightedNodes || [],
      topologyHealth: appState.topologyHealth
    };
    return el;
  }

  if (tool === 'incidentTable') {
    const el = document.createElement('tool-incidents');
    const incidents = appState.incidents.filter((it) =>
      appState.incidentFilter === 'all' ? true : it.domain === appState.incidentFilter
    );
    el.data = { incidents, incidentFilter: appState.incidentFilter };
    return el;
  }

  if (tool === 'kpiChart') {
    const metricPack = appState.metrics[appState.chartScope] || appState.metrics.all;
    const el = document.createElement('tool-kpi');
    el.data = { scope: appState.chartScope, latency: metricPack.latency, errors: metricPack.errors };
    return el;
  }

  if (tool === 'rcaGraph') {
    const el = document.createElement('tool-rca');
    el.data = { root: appState.rcaRoot || 'node-2' };
    return el;
  }

  if (tool === 'actionPanel') {
    const el = document.createElement('tool-action');
    el.data = { action: appState.action };
    return el;
  }

  return document.createElement('div');
}

function renderLayout() {
  workspace.innerHTML = '';
  appState.panels.forEach((panel) => {
    workspace.appendChild(panelFor(panel));
  });
}

function applyAction(action) {
  switch (action.type) {
    case 'highlight_nodes':
      appState.highlightedNodes = action.ids;
      break;
    case 'open_panel':
      if (!appState.panels.includes(action.component)) appState.panels.push(action.component);
      break;
    case 'render_widget':
      if (!appState.panels.includes(action.component)) appState.panels.push(action.component);
      if (action.component === 'kpiChart' && action.scope) appState.chartScope = action.scope;
      if (action.component === 'rcaGraph') appState.rcaRoot = action.rootCause || 'node-2';
      break;
    case 'filter_incidents':
      appState.incidentFilter = action.criteria;
      break;
    case 'update_chart_scope':
      appState.chartScope = action.scope;
      break;
    case 'show_action':
      appState.action = { action: action.action, confidence: action.confidence };
      if (!appState.panels.includes('actionPanel')) appState.panels.push('actionPanel');
      break;
    case 'update_topology_state':
      appState.topologyHealth = action.status;
      appState.highlightedNodes = [];
      break;
    case 'resolve_incidents':
      appState.incidents = appState.incidents.map((it) => ({ ...it, status: 'resolved' }));
      break;
    default:
      break;
  }
}

function appendLog(payload) {
  log.textContent = `${JSON.stringify(payload, null, 2)}\n\n${log.textContent}`.slice(0, 5000);
}

function processAgentEvent(payload) {
  status.textContent = payload.status_text || 'Agent updated';
  appendLog(payload);
  if (payload.state) {
    appState.incidents = payload.state.incidents;
    appState.metrics = payload.state.metrics;
    appState.topologyHealth = payload.state.healthy ? 'healthy' : 'degraded';
  }
  if (payload.layout?.panels) appState.panels = payload.layout.panels;
  (payload.ui_actions || []).forEach(applyAction);
  renderLayout();
}

workspace.addEventListener('node-select', async (evt) => {
  appState.selectedNode = evt.detail;
  renderLayout();
  await sendIntent('investigate_service', { nodeId: evt.detail });
});

workspace.addEventListener('action-approve', async () => {
  await sendIntent('approve_action', { action: appState.action?.action });
});

document.querySelector('#investigate-btn').addEventListener('click', async () => {
  await sendIntent('investigate_service', { nodeId: appState.selectedNode });
});

document.querySelector('#suggest-btn').addEventListener('click', async () => {
  await sendIntent('request_action', { source: 'user_button' });
});

document.querySelector('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = document.querySelector('#chat-input');
  const text = input.value.trim().toLowerCase();
  if (!text) return;
  if (text.includes('core')) {
    await sendIntent('refine_focus', { criteria: 'core' });
  } else if (text.includes('action')) {
    await sendIntent('request_action', { source: 'chat' });
  } else {
    await sendIntent('unknown', { text });
  }
  input.value = '';
});

async function sendIntent(intent, context) {
  const payload = { intent, context, availableTools };
  await fetch('/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

const source = new EventSource('/events');
source.onmessage = (event) => {
  processAgentEvent(JSON.parse(event.data));
};
source.onerror = () => {
  status.textContent = 'Agent channel interrupted';
};
