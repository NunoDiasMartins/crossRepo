const baseIntent = {
  id: 'INT-AN-SSO-4194',
  strategy: 'Autonomous Network',
  portfolioObjective: 'Simplified Service Orchestration',
  description: 'Create an enterprise connectivity service that supports autonomous operations, reduces manual orchestration steps, and enables closed-loop assurance for a telecommunications service provider.'
};

const initialOrder = {
  id: 'SO-641-2026-00419',
  state: 'Draft',
  customer: 'Nordic Logistics Group',
  requestedService: 'Enterprise Connectivity',
  serviceSpecification: 'Intent-Driven Enterprise Transport',
  requestedStartDate: '2026-04-15 09:00 UTC',
  serviceSite: 'Stockholm DC-02',
  slaProfile: 'Enterprise Gold',
  orchestrationDomain: 'Transport and Edge',
  approvalPolicy: 'Human approval required before provisioning',
  characteristics: [
    { name: 'customerSegment', value: 'enterprise-logistics' },
    { name: 'serviceObjective', value: 'intent-driven-automation' }
  ],
  intent: baseIntent
};

const emptyTopology = {
  nodes: [
    { id: 'Enterprise Site A', type: 'customer-edge', tone: 'pending', x: 80, y: 110 },
    { id: 'Access NNI', type: 'access', tone: 'pending', x: 230, y: 80 },
    { id: 'Transport Core', type: 'transport', tone: 'pending', x: 390, y: 105 },
    { id: 'Edge Cloud', type: 'edge', tone: 'pending', x: 555, y: 75 },
    { id: 'Assurance Loop', type: 'closed-loop', tone: 'pending', x: 555, y: 205 },
    { id: 'Service Registry', type: 'registry', tone: 'pending', x: 390, y: 220 }
  ],
  links: [],
  impacts: [
    { label: 'Domains touched', value: 'Pending intent validation' },
    { label: 'Manual steps reduced', value: 'Pending IMF mapping' },
    { label: 'Governance gate', value: 'Approval required before provisioning' }
  ]
};

const state = {
  mode: 'valid',
  order: structuredClone(initialOrder),
  registry: null,
  mappedCharacteristics: [],
  topology: emptyTopology,
  services: [],
  timeline: [],
  awaitingApproval: false,
  proposalText: null,
  agentStatus: 'idle',
  notification: null,
  debugMode: false,
  streamCollapsed: false
};

const app = document.querySelector('#app');

function render() {
  app.innerHTML = `
    <main class="intent-demo-app">
      <header class="hero">
        <div>
          <div class="eyebrow">Order Management Workspace</div>
          <h1>Intent-Driven Service Order</h1>
          <p>The operator submits a normal TMF641-style service order. The agent-first architecture is visible through AG-UI events, A2UI surface mutations, and a pre-approval service impact topology.</p>
        </div>
      </header>

      <section class="layout ${state.awaitingApproval ? 'approval-active' : ''} ${state.streamCollapsed ? 'stream-collapsed' : ''}">
        <article class="panel order-panel">
          <div class="panel-heading"><h2>Service Order Draft</h2><span>${state.order.state}</span></div>
          ${renderOrderCard()}
          ${renderOrderFlow()}
          ${renderDraftActions()}
        </article>

        ${state.awaitingApproval ? `
        <article class="panel topology-panel approval-topology-panel">
          <div class="panel-heading"><h2>Pre-Approval Impact Topology</h2><span>Approval needed</span></div>
          ${renderImpactTopology()}
        </article>` : ''}

        <article class="panel intent-panel">
          <div class="panel-heading"><h2>TMF921 Intent Registry</h2><span>${state.registry?.status ?? 'Pending'}</span></div>
          ${renderIntentRegistry()}
        </article>

        <article class="panel mapping-panel">
          <div class="panel-heading"><h2>Intent To Service Mapping</h2><span>${state.mappedCharacteristics.length} mapped</span></div>
          ${renderMappingBoard()}
        </article>

        <article class="panel service-panel">
          <div class="panel-heading"><h2>Provisioning Surface</h2><span>${state.services.length} services</span></div>
          ${renderServices()}
        </article>

        <article class="panel protocol-panel ${state.streamCollapsed ? 'collapsed' : ''}">
          <div class="panel-heading"><h2>AG-UI / A2UI Stream</h2><button id="streamToggleBtn">${state.streamCollapsed ? 'Expand' : 'Collapse'}</button></div>
          ${renderProtocolPanel()}
        </article>
      </section>
    </main>
  `;
  wireUi();
}

function renderDraftActions() {
  return `
    <div class="draft-actions">
      <label class="toggle"><input type="checkbox" id="invalidToggle" ${state.mode === 'invalid' ? 'checked' : ''}/> Validation scenario: policy violation</label>
      <button id="submitOrderBtn">Submit order</button>
    </div>
  `;
}

function renderProtocolPanel() {
  if (state.streamCollapsed) {
    return `<button class="stream-rail" id="streamRailBtn"><strong>Protocol stream</strong><span>${state.timeline.length} events</span><small>${state.agentStatus}</small></button>`;
  }

  return `
    <div class="stream-tools"><button id="debugBtn">${state.debugMode ? 'Hide debug' : 'Show debug'}</button></div>
    <div class="timeline">${state.timeline.length ? state.timeline.map(renderEvent).join('') : '<div class="event empty">Submit the draft order to see protocol events and UI mutations.</div>'}</div>
    ${state.notification ? `<div class="notification"><small>Notification</small>${state.notification}</div>` : ''}
    ${state.debugMode ? `<pre class="debug">${JSON.stringify(state.timeline, null, 2)}</pre>` : ''}
  `;
}

function renderOrderCard() {
  const intent = state.order.intent ?? baseIntent;
  return `
    <div class="order-card state-${state.order.state.toLowerCase().replaceAll(' ', '-')}">
      <div class="order-topline"><strong>${state.order.id}</strong><span>${state.order.state}</span></div>
      <div class="field-grid">
        <div><small>Customer</small><b>${state.order.customer}</b></div>
        <div><small>Requested service</small><b>${state.order.requestedService}</b></div>
        <div><small>Service site</small><b>${state.order.serviceSite}</b></div>
        <div><small>Requested start</small><b>${state.order.requestedStartDate}</b></div>
        <div><small>SLA profile</small><b>${state.order.slaProfile}</b></div>
        <div><small>Orchestration domain</small><b>${state.order.orchestrationDomain}</b></div>
        <div><small>Approval policy</small><b>${state.order.approvalPolicy}</b></div>
        <div><small>IntentRef</small><b>${state.order.intentRef ?? 'Awaiting TMF921'}</b></div>
      </div>
      <div class="intent-box">
        <small>Business intent</small>
        <p>${intent.description}</p>
        <div class="chips"><span>${intent.strategy}</span><span>${intent.portfolioObjective}</span></div>
      </div>
      ${renderCharacteristics()}
      ${state.order.rejectionReason ? `<div class="rejection">${state.order.rejectionReason}</div>` : ''}
    </div>
  `;
}

function renderCharacteristics() {
  return `<div class="characteristic-strip">${state.order.characteristics.map((item) => `<div class="characteristic"><small>${item.name}</small><b>${item.value}</b></div>`).join('')}</div>`;
}

function renderOrderFlow() {
  const stages = ['Draft', 'Submitted', 'Acknowledged', 'InProgress', 'Completed'];
  const currentIndex = stages.indexOf(state.order.state);
  return `<div class="order-flow">${stages.map((stage, index) => `<div class="stage ${stage === state.order.state ? 'active' : currentIndex > index ? 'done' : ''}"><span></span>${stage}</div>`).join('')}</div>`;
}

function renderIntentRegistry() {
  if (!state.registry) return '<div class="empty-surface">The submitted order will trigger intent validation and return an IntentRef before provisioning.</div>';
  return `
    <div class="registry-card ${state.registry.status.toLowerCase()}">
      <strong>${state.registry.intentId}</strong>
      <span>${state.registry.status}</span>
      <p>${state.registry.reason ?? 'Intent accepted for Autonomous Network and Simplified Service Orchestration policy mapping.'}</p>
      <div class="chips"><span>${state.registry.strategy ?? 'Governance blocked'}</span><span>${state.registry.portfolioObjective ?? 'No registry write'}</span></div>
    </div>
  `;
}

function renderMappingBoard() {
  const sourceItems = ['intent-driven automation', 'reduced operational complexity', 'proactive assurance readiness', 'policy-based lifecycle orchestration'];
  return `
    <div class="mapping-board">
      <div class="mapping-column"><h3>Intent objectives</h3>${sourceItems.map((item) => `<div class="mapping-pill">${item}</div>`).join('')}</div>
      <div class="mapping-arrow">-&gt;</div>
      <div class="mapping-column"><h3>Service characteristics</h3>${state.mappedCharacteristics.length ? state.mappedCharacteristics.map((item) => `<div class="characteristic"><small>${item.name}</small><b>${item.value}</b></div>`).join('') : '<div class="empty-surface compact">Awaiting IMF mapping</div>'}</div>
    </div>
  `;
}

function renderImpactTopology() {
  const nodeById = new Map(state.topology.nodes.map((node) => [node.id, node]));
  const links = state.topology.links.map((link) => {
    const source = nodeById.get(link.source);
    const target = nodeById.get(link.target);
    if (!source || !target) return '';
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    return `<g><line class="topology-link ${link.tone}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}"/><text class="link-label" x="${midX}" y="${midY - 6}" text-anchor="middle">${link.label}</text></g>`;
  }).join('');
  const nodes = state.topology.nodes.map((node) => `<g class="topology-node ${node.tone}"><circle cx="${node.x}" cy="${node.y}" r="24"></circle><text x="${node.x}" y="${node.y + 4}" text-anchor="middle">${node.id}</text><title>${node.type}</title></g>`).join('');
  return `
    <div class="topology-wrap">
      <svg class="impact-topology" viewBox="0 0 650 300">${links}${nodes}</svg>
      <div class="impact-cards">${state.topology.impacts.map((item) => `<div><small>${item.label}</small><b>${item.value}</b></div>`).join('')}</div>
      <div class="approval-context">
        <small>Human-in-the-loop control</small>
        <strong>${state.proposalText}</strong>
        <p>This preview is produced before approval, so the operator sees which domains, registry bindings, and assurance loops the intent will affect.</p>
        <div class="actions"><button data-action="approve">Approve</button><button data-action="reject">Reject</button><button data-action="modify">Modify scope</button></div>
      </div>
    </div>
  `;
}

function renderServices() {
  if (!state.services.length) return '<div class="empty-surface">Provisioned services appear here after operator approval. The service registry receives the IntentRef, not the full business intent.</div>';
  return `<div class="service-list">${state.services.map((service) => `<div class="service-card"><strong>${service.name}</strong><span>${service.state}</span><small>${service.id} - ${service.spec} - ${service.intentRef}</small></div>`).join('')}</div>`;
}

function renderEvent(evt) {
  return `<div class="event ${evt.kind}"><small>#${evt.seq} - ${evt.kind.toUpperCase()}</small>${toReadableEvent(evt)}</div>`;
}

function toReadableEvent(evt) {
  if (evt.kind === 'a2ui') return `A2UI mutation applied to <b>${evt.target}</b>.`;
  switch (evt.type) {
    case 'state.updated': return `State update: <b>${evt.payload.summary ?? evt.payload.status}</b>.`;
    case 'user.intent.received': return `Order submission received for <b>${evt.payload.orderId}</b>.`;
    case 'agent.plan.created': return `Plan: ${evt.payload.steps.join(' -> ')}.`;
    case 'tool.call.started': return `Tool call started: <b>${evt.payload.tool}</b>.`;
    case 'tool.call.completed': return `Tool call completed: <b>${evt.payload.tool}</b> (${evt.payload.result}).`;
    case 'approval.requested': return 'Approval requested after impact preview.';
    case 'user.action': return `Operator selected <b>${evt.payload.action}</b>.`;
    case 'notification.emitted': return `Notification emitted on <b>${evt.payload.channel}</b>.`;
    case 'run.completed': return evt.payload.summary;
    default: return evt.type;
  }
}

function resetScenario() {
  const intent = { ...baseIntent, id: state.mode === 'invalid' ? 'INT-AN-SSO-4195' : 'INT-AN-SSO-4194' };
  if (state.mode === 'invalid') intent.description = 'Create a fully autonomous cross-domain service with no approval gate and unspecified assurance policy.';
  state.order = { ...structuredClone(initialOrder), id: state.mode === 'invalid' ? 'SO-641-2026-00420' : 'SO-641-2026-00419', intent };
  state.registry = null;
  state.mappedCharacteristics = [];
  state.topology = structuredClone(emptyTopology);
  state.services = [];
  state.timeline = [];
  state.awaitingApproval = false;
  state.proposalText = null;
  state.notification = null;
  state.agentStatus = 'idle';
}

function mergeOrder(orderPatch) {
  state.order = {
    ...state.order,
    ...orderPatch,
    intent: orderPatch.intent ?? state.order.intent,
    characteristics: orderPatch.characteristics ?? state.order.characteristics
  };
}

function wireUi() {
  document.getElementById('invalidToggle')?.addEventListener('change', (event) => {
    state.mode = event.target.checked ? 'invalid' : 'valid';
    resetScenario();
    render();
  });

  document.getElementById('submitOrderBtn')?.addEventListener('click', () => {
    resetScenario();
    state.agentStatus = 'active';
    render();
    fetch('/intent-order-demo/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: state.mode })
    });
  });

  document.getElementById('debugBtn')?.addEventListener('click', () => {
    state.debugMode = !state.debugMode;
    render();
  });

  document.getElementById('streamToggleBtn')?.addEventListener('click', () => {
    state.streamCollapsed = !state.streamCollapsed;
    render();
  });

  document.getElementById('streamRailBtn')?.addEventListener('click', () => {
    state.streamCollapsed = false;
    render();
  });

  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => {
    fetch('/intent-order-demo/approval', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: button.dataset.action })
    });
  }));
}

function applyDataModelUpdate(msg) {
  if (msg.target === 'order') mergeOrder(msg.payload.order ?? {});
  if (msg.target === 'intentRegistry') state.registry = msg.payload.registry;
  if (msg.target === 'mapping') state.mappedCharacteristics = msg.payload.characteristics ?? [];
  if (msg.target === 'impactTopology') state.topology = msg.payload.topology ?? state.topology;
  if (msg.target === 'services') state.services = msg.payload.services ?? [];
  render();
}

function handleAgUiEvent(evt) {
  state.timeline = [...state.timeline, evt];
  if (evt.type === 'approval.requested') {
    state.awaitingApproval = true;
    state.proposalText = evt.payload.message;
    state.agentStatus = 'awaiting_approval';
  }
  if (evt.type === 'user.action') {
    state.awaitingApproval = false;
    state.proposalText = null;
    state.topology = structuredClone(emptyTopology);
    state.agentStatus = 'active';
  }
  if (evt.type === 'notification.emitted') state.notification = evt.payload.message;
  if (evt.type === 'run.completed') state.agentStatus = 'completed';
  render();
}

function startEventStream() {
  const source = new EventSource('/intent-order-demo/events');
  source.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.kind === 'ag-ui') handleAgUiEvent(msg);
    if (msg.kind === 'a2ui') {
      state.timeline = [...state.timeline, msg];
      if (msg.type === 'surface.updateDataModel') applyDataModelUpdate(msg);
      else render();
    }
  };
}

render();
startEventStream();