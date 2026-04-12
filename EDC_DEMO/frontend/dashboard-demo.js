const topology = {
  nodes: [
    { id: 'RAN-Cluster-12', x: 70, y: 80, segment: 'transport-west' },
    { id: 'Edge-GW-02', x: 220, y: 90, segment: 'transport-west' },
    { id: 'Core-RT-7', x: 370, y: 85, segment: 'transport-west' },
    { id: 'API-GW-1', x: 520, y: 90, segment: 'service-mesh' },
    { id: 'Billing-SVC', x: 170, y: 220, segment: 'service-mesh' },
    { id: 'Auth-SVC', x: 320, y: 220, segment: 'service-mesh' },
    { id: 'Transport-SW3', x: 470, y: 220, segment: 'transport-west' },
    { id: 'DB-Primary', x: 620, y: 220, segment: 'data-plane' }
  ],
  links: [
    { source: 'RAN-Cluster-12', target: 'Edge-GW-02', segment: 'transport-west' },
    { source: 'Edge-GW-02', target: 'Core-RT-7', segment: 'transport-west' },
    { source: 'Core-RT-7', target: 'API-GW-1', segment: 'transport-west' },
    { source: 'Edge-GW-02', target: 'Billing-SVC', segment: 'service-mesh' },
    { source: 'Core-RT-7', target: 'Auth-SVC', segment: 'service-mesh' },
    { source: 'API-GW-1', target: 'Transport-SW3', segment: 'transport-west' },
    { source: 'Transport-SW3', target: 'DB-Primary', segment: 'data-plane' }
  ]
};

const allIncidents = [
  {
    id: 'INC-4412',
    severity: 'High',
    status: 'Open',
    relatedNode: 'RAN-Cluster-12',
    summary: 'Packet loss spike on west region access cluster',
    service: 'Mobile Access',
    impactedServices: ['Mobile Access', 'Authentication'],
    customerImpact: '12.4K subscribers seeing degraded sessions'
  },
  {
    id: 'INC-4403',
    severity: 'Medium',
    status: 'Investigating',
    relatedNode: 'Edge-GW-02',
    summary: 'Edge gateway latency above baseline',
    service: 'Session Routing',
    impactedServices: ['Session Routing', 'Billing'],
    customerImpact: 'Activation flows slower in one market'
  },
  {
    id: 'INC-4381',
    severity: 'Medium',
    status: 'Open',
    relatedNode: 'Transport-SW3',
    summary: 'Transport switch interface errors trending up',
    service: 'Transport',
    impactedServices: ['Transport', 'API Gateway'],
    customerImpact: 'Intermittent retries across core services'
  },
  {
    id: 'INC-4369',
    severity: 'Low',
    status: 'Monitoring',
    relatedNode: 'DB-Primary',
    summary: 'Replica lag briefly exceeded threshold',
    service: 'Data Platform',
    impactedServices: ['Data Platform'],
    customerImpact: 'No active subscriber impact at this time'
  }
];

const defaultHealth = [
  { label: 'Access', value: 96, tone: 'good' },
  { label: 'Core', value: 91, tone: 'watch' },
  { label: 'Digital', value: 94, tone: 'good' },
  { label: 'Data', value: 89, tone: 'risk' }
];

const defaultImpact = [
  { label: 'Impacted service', value: 'Not selected' },
  { label: 'Customer effect', value: 'Choose an incident to inspect' },
  { label: 'Recommended action', value: 'Awaiting investigation' }
];

const state = {
  selectedIncidentId: null,
  selectedNodeId: null,
  neighborIds: [],
  focusedSegment: null,
  incidents: allIncidents,
  health: defaultHealth,
  impact: defaultImpact,
  showTopology: false,
  timeline: [],
  awaitingApproval: false,
  proposalText: null,
  agentStatus: 'idle',
  investigationMode: false,
  degradedNodes: [],
  showCorrectionWidget: false,
  correctionMetrics: []
};

const app = document.querySelector('#app');
let debugMode = false;

function getSelectedIncident() {
  return allIncidents.find((incident) => incident.id === state.selectedIncidentId) ?? null;
}

function render() {
  app.innerHTML = `
    <main class="dashboard-demo-app">
      <header class="header">
        <div>
          <div class="title">Agent-First Assurance Dashboard Demo</div>
          <div class="subtitle">Start from service health, then let the agent reveal the topology only when it becomes relevant.</div>
        </div>
        <div class="chips">
          <span class="chip">Incident: ${state.selectedIncidentId ?? 'None'}</span>
          <span class="chip">Agent: ${state.agentStatus}</span>
          <span class="chip">Topology: ${state.showTopology ? 'Visible' : 'Hidden'}</span>
        </div>
      </header>

      <section class="layout ${state.showTopology ? 'topology-active' : ''} ${state.investigationMode ? 'investigation-mode' : ''}">
        ${state.investigationMode ? '' : `
        <article class="panel overview-panel">
          <div class="panel-heading">
            <h2>Service Health</h2>
            <div class="panel-note">Entry point for the operator</div>
          </div>
          <div class="donut-grid">
            ${state.health.map((service) => renderDonut(service)).join('')}
          </div>
          <div class="impact-strip">
            ${state.impact.map((item) => `
              <div class="impact-card">
                <small>${item.label}</small>
                <strong>${item.value}</strong>
              </div>
            `).join('')}
          </div>
        </article>
        `}

        ${state.investigationMode ? '' : `
        <article class="panel incidents-panel">
          <div class="panel-heading">
            <h2>Incident Queue</h2>
            <div class="panel-note">Select one incident to begin</div>
          </div>
          <div class="incident-list">
            ${state.incidents.map((incident) => `
              <button class="incident-card ${state.selectedIncidentId === incident.id ? 'selected' : ''}" data-incident="${incident.id}">
                <div class="incident-topline">
                  <strong>${incident.id}</strong>
                  <span class="severity ${incident.severity.toLowerCase()}">${incident.severity}</span>
                </div>
                <div class="incident-summary">${incident.summary}</div>
                <div class="incident-meta">${incident.service} · ${incident.status}</div>
              </button>
            `).join('')}
          </div>
          <div class="actions inline-actions">
            <button id="investigateBtn" ${state.selectedIncidentId ? '' : 'disabled'}>Investigate issue</button>
          </div>
        </article>
        `}

        ${state.showTopology ? `
          <article class="panel topology-panel">
            <div class="panel-heading">
              <h2>Topology View</h2>
              <div class="panel-note">Revealed by agent action</div>
            </div>
            ${renderTopology()}
            <div class="topology-caption">Topology is shown only after the agent expands the affected scope and service impact.</div>
          </article>

          <article class="panel degradation-panel">
            <div class="panel-heading">
              <h2>Impacted Node Degradation</h2>
              <div class="panel-note">Degradation % (higher is worse)</div>
            </div>
            ${renderDegradationBars()}
          </article>
        ` : ''}

        <article class="panel timeline-panel">
          <div class="panel-heading">
            <h2>Agent Activity Timeline</h2>
            <button id="debugBtn">${debugMode ? 'Hide debug' : 'Show debug'}</button>
          </div>
          <div class="timeline">
            ${state.timeline.length ? state.timeline.map((evt) => `<div class="event"><small>#${evt.seq} · ${evt.kind.toUpperCase()}</small>${toReadableEvent(evt)}</div>`).join('') : '<div class="event empty">Select an incident, then the timeline will narrate the investigation.</div>'}
          </div>
          ${state.awaitingApproval && state.proposalText ? `<div class="event approval"><small>Human in the loop</small>${state.proposalText}<div class="actions"><button data-action="approve">Approve</button><button data-action="reject">Reject</button><button data-action="modify">Modify scope</button></div></div>` : ''}
          ${state.showCorrectionWidget ? renderCorrectionWidget() : ''}
          ${debugMode ? `<pre class="debug">${JSON.stringify(state.timeline, null, 2)}</pre>` : ''}
        </article>
      </section>
    </main>
  `;

  wireUi();
}

function renderDegradationBars() {
  if (!state.degradedNodes.length) return '<div class="event empty">Waiting for topology and impact correlation.</div>';
  return `
    <div class="degradation-bars">
      ${state.degradedNodes.map((node) => `
        <div class="degradation-row">
          <div class="degradation-label">${node.id}</div>
          <div class="degradation-track"><div class="degradation-fill" style="width:${node.degradation}%"></div></div>
          <div class="degradation-value">${node.degradation}%</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderCorrectionWidget() {
  return `
    <div class="correction-widget">
      <div class="panel-heading">
        <h2>Correction Nodes (Real-time)</h2>
        <div class="panel-note">Latency / Error Rate / Packet Loss</div>
      </div>
      <div class="metric-grid">
        ${state.correctionMetrics.map((metric) => `
          <div class="metric-card">
            <strong>${metric.id}</strong>
            <small>Latency: ${metric.latencyMs} ms</small>
            <small>Error rate: ${Number(metric.errorRate).toFixed(2)}%</small>
            <small>Packet loss: ${Number(metric.packetLoss).toFixed(2)}%</small>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderDonut(service) {
  const angle = Math.round((service.value / 100) * 360);
  return `
    <div class="donut-card ${service.tone}">
      <div class="donut" style="--angle:${angle}deg">
        <div class="donut-inner">
          <strong>${service.value}%</strong>
        </div>
      </div>
      <span>${service.label}</span>
    </div>
  `;
}

function renderTopology() {
  const nodes = topology.nodes.map((node) => {
    const cls = ['node', state.selectedNodeId === node.id ? 'selected' : '', state.neighborIds.includes(node.id) ? 'neighbor' : '', state.focusedSegment && state.focusedSegment === node.segment ? 'focus' : ''].filter(Boolean).join(' ');
    return `<g class="${cls}"><circle cx="${node.x}" cy="${node.y}" r="22"></circle><text x="${node.x}" y="${node.y + 4}" text-anchor="middle">${node.id}</text></g>`;
  }).join('');

  const links = topology.links.map((link) => {
    const source = topology.nodes.find((node) => node.id === link.source);
    const target = topology.nodes.find((node) => node.id === link.target);
    return `<line class="link ${state.focusedSegment && state.focusedSegment === link.segment ? 'focus' : ''}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" />`;
  }).join('');

  return `<svg class="topology-svg" viewBox="0 0 700 300">${links}${nodes}</svg>`;
}

function toReadableEvent(evt) {
  const payload = evt.payload ?? {};
  if (evt.kind === 'ag-ui') {
    switch (evt.type) {
      case 'intent.received': return `Intent received for incident <b>${payload.incidentId ?? 'Unknown'}</b>.`;
      case 'agent.plan': return `Plan: ${(payload.steps ?? []).join(' -> ') || 'No steps provided'}.`;
      case 'tool.called': return `Tool called: <b>${payload.tool ?? 'Unknown tool'}</b>.`;
      case 'state.updated': return `State updated: <b>${payload.summary ?? payload.suspectedLayer ?? payload.status ?? payload.note ?? 'Update received'}</b>.`;
      case 'approval.requested': return 'Approval requested from operator.';
      case 'user.action': return `User selected <b>${payload.action ?? 'an action'}</b>.`;
      case 'agent.completed': return payload.summary ?? 'Agent completed the investigation flow.';
      default: return evt.type;
    }
  }
  return `A2UI mutation: <b>${evt.type ?? 'unknown'}</b> on <b>${evt.target ?? 'unknown target'}</b>.`;
}

function wireUi() {
  document.querySelectorAll('[data-incident]').forEach((button) => button.addEventListener('click', () => {
    const incidentId = button.dataset.incident;
    const incident = allIncidents.find((item) => item.id === incidentId);
    if (!incident) return;

    state.selectedIncidentId = incidentId;
    state.selectedNodeId = incident.relatedNode;
    state.neighborIds = [];
    state.focusedSegment = null;
    state.showTopology = false;
    state.timeline = [];
    state.awaitingApproval = false;
    state.proposalText = null;
    state.agentStatus = 'idle';
    state.investigationMode = false;
    state.degradedNodes = [];
    state.showCorrectionWidget = false;
    state.correctionMetrics = [];
    state.incidents = allIncidents;
    state.health = defaultHealth;
    state.impact = [
      { label: 'Impacted service', value: incident.service },
      { label: 'Customer effect', value: incident.customerImpact },
      { label: 'Recommended action', value: 'Investigate to reveal topology scope' }
    ];
    render();
  }));

  document.getElementById('investigateBtn')?.addEventListener('click', () => {
    const selectedIncident = getSelectedIncident();
    if (!selectedIncident) return;
    fetch('/dashboard-demo/investigate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ incidentId: selectedIncident.id })
    });
  });

  document.getElementById('debugBtn')?.addEventListener('click', () => {
    debugMode = !debugMode;
    render();
  });

  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => {
    fetch('/dashboard-demo/approval', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: button.dataset.action })
    });
  }));
}

const renderer = {
  applyDataModelUpdate(msg) {
    if (msg.target === 'incidents') state.incidents = msg.payload.incidents ?? state.incidents;
    if (msg.target === 'health') state.health = msg.payload.health ?? state.health;
    if (msg.target === 'impact') state.impact = msg.payload.impact ?? state.impact;
    if (msg.target === 'degradation') state.degradedNodes = msg.payload.nodes ?? state.degradedNodes;
    if (msg.target === 'correction') {
      state.showCorrectionWidget = msg.payload.visible ?? state.showCorrectionWidget;
      state.correctionMetrics = msg.payload.metrics ?? state.correctionMetrics;
    }
    if (msg.target === 'topology') {
      state.showTopology = true;
      state.investigationMode = true;
      state.selectedNodeId = msg.payload.selectedNodeId ?? state.selectedNodeId;
      state.neighborIds = msg.payload.neighborIds ?? state.neighborIds;
      state.focusedSegment = msg.payload.focusedSegment ?? state.focusedSegment;
    }
    render();
  }
};

function handleAgUiEvent(evt) {
  state.timeline = [...state.timeline, evt];
  if (['intent.received', 'agent.plan', 'tool.called'].includes(evt.type)) state.agentStatus = 'active';
  if (evt.type === 'approval.requested') {
    state.agentStatus = 'awaiting_approval';
    state.awaitingApproval = true;
    state.proposalText = evt.payload.message;
  }
  if (evt.type === 'user.action') {
    state.awaitingApproval = false;
    state.proposalText = null;
    state.agentStatus = 'active';
  }
  if (evt.type === 'agent.completed') state.agentStatus = 'completed';
  render();
}

function startEventStream() {
  const source = new EventSource('/dashboard-demo/events');
  source.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.kind === 'ag-ui') handleAgUiEvent(msg);
    if (msg.kind === 'a2ui') {
      state.timeline = [...state.timeline, msg];
      if (msg.type === 'surface.updateDataModel') renderer.applyDataModelUpdate(msg);
      else render();
    }
  };
}

render();
startEventStream();
