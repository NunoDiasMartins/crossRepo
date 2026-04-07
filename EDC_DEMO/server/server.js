import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(process.cwd(), '..');
const frontendRoot = resolve(root, 'frontend');

const telecomClients = new Set();
const genericClients = new Set();
const retailClients = new Set();
const dashboardClients = new Set();
const intentOrderClients = new Set();
let seq = 0;
let lastNodeId = 'RAN-Cluster-12';
let lastBusinessNodeId = 'Payments';
let lastRetailMissionId = 'weeknight-dinner';
let lastDashboardIncidentId = 'INC-4412';
let lastIntentOrderMode = 'valid';

const incidents = [
  { id: 'INC-4412', severity: 'High', status: 'Open', relatedNode: 'RAN-Cluster-12' },
  { id: 'INC-4403', severity: 'Medium', status: 'Investigating', relatedNode: 'Edge-GW-02' },
  { id: 'INC-4398', severity: 'Low', status: 'Monitoring', relatedNode: 'Auth-SVC' },
  { id: 'INC-4381', severity: 'Medium', status: 'Open', relatedNode: 'Transport-SW3' },
  { id: 'INC-4369', severity: 'Low', status: 'Open', relatedNode: 'DB-Primary' }
];

const businessAlerts = [
  { id: 'OPS-2104', severity: 'High', status: 'Open', relatedNode: 'Payments', impact: 'Checkout abandonment rising' },
  { id: 'OPS-2101', severity: 'Medium', status: 'Investigating', relatedNode: 'Warehouse', impact: 'Packing queue above target' },
  { id: 'OPS-2099', severity: 'Medium', status: 'Open', relatedNode: 'Carrier Hub', impact: 'Delivery ETA slipping in one region' },
  { id: 'OPS-2093', severity: 'Low', status: 'Monitoring', relatedNode: 'Customer Support', impact: 'Refund questions trending up' },
  { id: 'OPS-2088', severity: 'Low', status: 'Monitoring', relatedNode: 'Notifications', impact: 'Shipment email delay spike' }
];

const retailMissions = {
  'weeknight-dinner': {
    missionName: 'Weeknight Dinner',
    highlightedZones: ['Meal Solutions', 'Produce', 'Pickup Desk'],
    metrics: [
      { label: 'Open baskets', value: '152', delta: '+16 vs last hour' },
      { label: 'Dinner conversion', value: '7.4%', delta: '+1.5 pts after offer launch' },
      { label: 'Pickup wait', value: '12 min', delta: 'Rush hour still inside target' },
      { label: 'Fresh fill rate', value: '95%', delta: 'Salad substitution resolved' }
    ],
    basket: [
      { item: 'Fresh pasta kit', qty: '1', area: 'Meal Solutions', status: 'Reserved' },
      { item: 'Garlic bread', qty: '1', area: 'Bakery', status: 'Reserved' },
      { item: 'Sparkling water', qty: '2', area: 'Beverages', status: 'Reserved' },
      { item: 'Chopped Caesar salad', qty: '1', area: 'Produce', status: 'Substitution applied' }
    ],
    zones: [
      { name: 'Meal Solutions', status: 'Focused', detail: 'Dinner kits staged for rapid picking', tone: 'good' },
      { name: 'Bakery', status: 'Ready', detail: 'Garlic bread batch held for pickup window', tone: 'good' },
      { name: 'Produce', status: 'Recovered', detail: 'Alternative salad option confirmed', tone: 'watch' },
      { name: 'Pickup Desk', status: 'Coordinated', detail: '18:45 slot reserved for this basket', tone: 'good' }
    ],
    itinerary: [
      { step: 'Pick items', owner: 'Store team', status: 'Focused' },
      { step: 'Confirm substitutions', owner: 'Retail agent', status: 'Done' },
      { step: 'Reserve slot', owner: 'Pickup desk', status: 'Done' },
      { step: 'Notify shopper', owner: 'CRM journey', status: 'Ready' }
    ],
    approvalMessage: 'Reserve the 18:45 pickup slot, switch the salad item, and publish the dinner bundle now?',
    completedSummary: 'Retail assist completed: dinner basket protected, pickup slot reserved, and shopper notified.'
  },
  'lunchbox-refill': {
    missionName: 'Lunchbox Refill',
    highlightedZones: ['Bakery', 'Deli', 'Pickup Desk'],
    metrics: [
      { label: 'Open baskets', value: '134', delta: '+8 vs last hour' },
      { label: 'Staple conversion', value: '5.9%', delta: '+0.8 pts after bundle prompt' },
      { label: 'Pickup wait', value: '8 min', delta: 'Evening capacity available' },
      { label: 'Fresh fill rate', value: '92%', delta: 'Deli remains the watch area' }
    ],
    basket: [
      { item: 'Whole grain bread', qty: '2', area: 'Bakery', status: 'Reserved' },
      { item: 'Yogurt pouches', qty: '1 pack', area: 'Dairy', status: 'Reserved' },
      { item: 'Roast chicken slices', qty: '1', area: 'Deli', status: 'Backup accepted' },
      { item: 'Apple snack bags', qty: '1', area: 'Produce', status: 'Reserved' }
    ],
    zones: [
      { name: 'Bakery', status: 'Focused', detail: 'Staples held for family refill baskets', tone: 'good' },
      { name: 'Dairy', status: 'Ready', detail: 'Promo inventory available tonight', tone: 'good' },
      { name: 'Deli', status: 'Adjusted', detail: 'Turkey replaced with roast chicken backup', tone: 'watch' },
      { name: 'Pickup Desk', status: 'Open', detail: '20:00 slot kept open for quick collection', tone: 'good' }
    ],
    itinerary: [
      { step: 'Pick items', owner: 'Store team', status: 'Focused' },
      { step: 'Confirm substitutions', owner: 'Retail agent', status: 'Done' },
      { step: 'Reserve slot', owner: 'Pickup desk', status: 'Done' },
      { step: 'Notify shopper', owner: 'CRM journey', status: 'Ready' }
    ],
    approvalMessage: 'Hold the backup deli item, keep the 20:00 pickup slot, and send the lunchbox bundle suggestion?',
    completedSummary: 'Retail assist completed: family staples protected with a low-friction substitution and timed pickup.'
  },
  'weekend-stock-up': {
    missionName: 'Weekend Stock-Up',
    highlightedZones: ['Produce', 'Meat', 'Pickup Desk'],
    metrics: [
      { label: 'Open baskets', value: '188', delta: '+21 vs last hour' },
      { label: 'Large basket conversion', value: '8.1%', delta: '+1.1 pts on reserved slots' },
      { label: 'Pickup wait', value: '14 min', delta: 'Close to morning threshold' },
      { label: 'Fresh fill rate', value: '94%', delta: 'Produce staging improved' }
    ],
    basket: [
      { item: 'Family fruit box', qty: '1', area: 'Produce', status: 'Reserved' },
      { item: 'Chicken thighs', qty: '2 packs', area: 'Meat', status: 'Reserved' },
      { item: 'Paper towels', qty: '1', area: 'Home', status: 'Reserved' },
      { item: 'Laundry detergent', qty: '1', area: 'Home', status: 'Reserved' }
    ],
    zones: [
      { name: 'Produce', status: 'Focused', detail: 'Fruit boxes staged ahead of the morning spike', tone: 'good' },
      { name: 'Meat', status: 'Ready', detail: 'Protein packs held for scheduled pickup', tone: 'good' },
      { name: 'Home', status: 'On pace', detail: 'Bulk household items flow normally', tone: 'good' },
      { name: 'Pickup Desk', status: 'Protected', detail: '09:00 slot secured before capacity closed', tone: 'watch' }
    ],
    itinerary: [
      { step: 'Pick items', owner: 'Store team', status: 'Focused' },
      { step: 'Confirm substitutions', owner: 'Retail agent', status: 'Not needed' },
      { step: 'Reserve slot', owner: 'Pickup desk', status: 'Done' },
      { step: 'Notify shopper', owner: 'CRM journey', status: 'Ready' }
    ],
    approvalMessage: 'Reserve the first pickup wave and stage produce early for this larger household basket?',
    completedSummary: 'Retail assist completed: weekend basket staged early and first-wave pickup capacity protected.'
  }
};

const dashboardIncidents = {
  'INC-4412': {
    incidentId: 'INC-4412',
    nodeId: 'RAN-Cluster-12',
    health: [
      { label: 'Access', value: '82%', tone: 'risk' },
      { label: 'Core', value: '91%', tone: 'watch' },
      { label: 'Digital', value: '94%', tone: 'good' },
      { label: 'Data', value: '89%', tone: 'watch' }
    ],
    impact: [
      { label: 'Impacted service', value: 'Mobile Access' },
      { label: 'Customer effect', value: '12.4K subscribers seeing degraded sessions' },
      { label: 'Recommended action', value: 'Isolate west transport path after approval' }
    ],
    summary: 'Transport path degradation linked to west access cluster.',
    approvalMessage: 'Recommended action: isolate the west transport path and shift traffic to the standby route. Proceed?'
  },
  'INC-4403': {
    incidentId: 'INC-4403',
    nodeId: 'Edge-GW-02',
    health: [
      { label: 'Access', value: '92%', tone: 'watch' },
      { label: 'Core', value: '88%', tone: 'risk' },
      { label: 'Digital', value: '95%', tone: 'good' },
      { label: 'Data', value: '90%', tone: 'watch' }
    ],
    impact: [
      { label: 'Impacted service', value: 'Session Routing' },
      { label: 'Customer effect', value: 'Activation flows slower in one market' },
      { label: 'Recommended action', value: 'Reroute gateway traffic and watch billing retries' }
    ],
    summary: 'Gateway latency is spilling into the service mesh edge.',
    approvalMessage: 'Recommended action: reroute traffic away from Edge-GW-02 and monitor service-mesh spillover. Proceed?'
  },
  'INC-4381': {
    incidentId: 'INC-4381',
    nodeId: 'Transport-SW3',
    health: [
      { label: 'Access', value: '95%', tone: 'good' },
      { label: 'Core', value: '90%', tone: 'watch' },
      { label: 'Digital', value: '86%', tone: 'risk' },
      { label: 'Data', value: '91%', tone: 'watch' }
    ],
    impact: [
      { label: 'Impacted service', value: 'Transport' },
      { label: 'Customer effect', value: 'Intermittent retries across core services' },
      { label: 'Recommended action', value: 'Focus transport-west and suppress noisy retries' }
    ],
    summary: 'Transport switch errors are driving downstream retry storms.',
    approvalMessage: 'Recommended action: focus the transport-west segment and suppress non-critical retries. Proceed?'
  },
  'INC-4369': {
    incidentId: 'INC-4369',
    nodeId: 'DB-Primary',
    health: [
      { label: 'Access', value: '96%', tone: 'good' },
      { label: 'Core', value: '94%', tone: 'good' },
      { label: 'Digital', value: '93%', tone: 'watch' },
      { label: 'Data', value: '84%', tone: 'risk' }
    ],
    impact: [
      { label: 'Impacted service', value: 'Data Platform' },
      { label: 'Customer effect', value: 'No active subscriber impact at this time' },
      { label: 'Recommended action', value: 'Keep topology visible for validation before changes' }
    ],
    summary: 'Replica lag is localized to the data plane boundary.',
    approvalMessage: 'Recommended action: keep traffic steady and trigger a targeted data-plane remediation. Proceed?'
  }
};

const intentOrderScenario = {
  valid: {
    serviceOrderId: 'SO-641-2026-00419',
    intentId: 'INT-AN-SSO-4194',
    customer: 'Nordic Logistics Group',
    requestedService: 'Enterprise Connectivity',
    serviceSpecification: 'Intent-Driven Enterprise Transport',
    strategy: 'Autonomous Network',
    portfolioObjective: 'Simplified Service Orchestration',
    businessIntent: 'Create an enterprise connectivity service that supports autonomous operations, reduces manual orchestration steps, and enables closed-loop assurance for a telecommunications service provider.',
    mappedCharacteristics: [
      { name: 'automationLevel', value: 'closed-loop-ready' },
      { name: 'orchestrationMode', value: 'simplified-service-orchestration' },
      { name: 'assurancePolicy', value: 'proactive-monitoring' },
      { name: 'resilienceProfile', value: 'dual-path' },
      { name: 'operationsImpact', value: 'reduced-manual-configuration' }
    ],
    services: [
      { id: 'SVC-EC-001', name: 'Enterprise Transport Access', spec: 'ServiceSpecA', state: 'Designed', intentRef: 'INT-AN-SSO-4194' },
      { id: 'SVC-ASSURE-002', name: 'Closed-loop Assurance Policy', spec: 'ServiceSpecB', state: 'Ready', intentRef: 'INT-AN-SSO-4194' }
    ],
    notification: 'TMF notification prepared for order and service lifecycle changes. IntentRef is carried without exposing the full business intent downstream.',
    topology: {
      nodes: [
        { id: 'Enterprise Site A', type: 'customer-edge', tone: 'customer', x: 80, y: 110 },
        { id: 'Access NNI', type: 'access', tone: 'active', x: 230, y: 80 },
        { id: 'Transport Core', type: 'transport', tone: 'active', x: 390, y: 105 },
        { id: 'Edge Cloud', type: 'edge', tone: 'watch', x: 555, y: 75 },
        { id: 'Assurance Loop', type: 'closed-loop', tone: 'policy', x: 555, y: 205 },
        { id: 'Service Registry', type: 'registry', tone: 'registry', x: 390, y: 220 }
      ],
      links: [
        { source: 'Enterprise Site A', target: 'Access NNI', label: 'access handoff', tone: 'active' },
        { source: 'Access NNI', target: 'Transport Core', label: 'resilient path', tone: 'active' },
        { source: 'Transport Core', target: 'Edge Cloud', label: 'enterprise transport', tone: 'active' },
        { source: 'Transport Core', target: 'Service Registry', label: 'IntentRef binding', tone: 'registry' },
        { source: 'Edge Cloud', target: 'Assurance Loop', label: 'closed-loop policy', tone: 'policy' },
        { source: 'Service Registry', target: 'Assurance Loop', label: 'assurance subscription', tone: 'policy' }
      ],
      impacts: [
        { label: 'Domains touched', value: 'Access, Transport, Edge, Assurance' },
        { label: 'Manual steps reduced', value: 'Design, assurance policy, service binding' },
        { label: 'Governance gate', value: 'Operator approval before provisioning' }
      ]
    }
  },
  invalid: {
    serviceOrderId: 'SO-641-2026-00420',
    intentId: 'INT-AN-SSO-4195',
    customer: 'Nordic Logistics Group',
    requestedService: 'Enterprise Connectivity',
    serviceSpecification: 'Intent-Driven Enterprise Transport',
    strategy: 'Autonomous Network',
    portfolioObjective: 'Simplified Service Orchestration',
    businessIntent: 'Create a fully autonomous cross-domain service with no approval gate and unspecified assurance policy.',
    reason: 'Intent violates governance policy: provisioning autonomy is requested without an operator approval control and assurance policy scope.'
  }
};
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.ts': 'text/plain'
};

function emit(clients, message) {
  const payload = { ...message, seq: ++seq, id: `evt-${seq}` };
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((res) => res.write(data));
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function telecomNeighborsFor(nodeId) {
  const mapping = {
    'RAN-Cluster-12': ['Edge-GW-02'],
    'Edge-GW-02': ['RAN-Cluster-12', 'Core-RT-7', 'Billing-SVC'],
    'Core-RT-7': ['Edge-GW-02', 'API-GW-1', 'Auth-SVC'],
    'API-GW-1': ['Core-RT-7', 'Transport-SW3'],
    'Transport-SW3': ['API-GW-1', 'DB-Primary']
  };
  return mapping[nodeId] ?? [];
}

function businessNeighborsFor(nodeId) {
  const mapping = {
    'Web Store': ['Payments'],
    'Payments': ['Web Store', 'Warehouse', 'Customer Support'],
    'Warehouse': ['Payments', 'Carrier Hub', 'Inventory'],
    'Carrier Hub': ['Warehouse', 'Notifications'],
    'Customer Support': ['Payments'],
    'Inventory': ['Warehouse'],
    'Notifications': ['Carrier Hub', 'Returns Desk'],
    'Returns Desk': ['Notifications']
  };
  return mapping[nodeId] ?? [];
}

async function streamInvestigation(nodeId) {
  emit({ kind: 'ag-ui', type: 'intent.received', payload: { intent: 'InvestigateNode', nodeId, incidentId: `INC-${String(Math.floor(Math.random()*9000)+1000)}` } });
  await sleep(500);
  emit(telecomClients, { kind: 'ag-ui', type: 'agent.plan', payload: { steps: ['fetch related incidents', 'expand topology neighborhood', 'run correlation analysis'] } });
  await sleep(600);
  emit(telecomClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'IncidentTable.filter', args: { nodeId } } });
  await sleep(500);
  emit(telecomClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'incidents', payload: { incidents: incidents.filter((item) => item.relatedNode === nodeId || telecomNeighborsFor(nodeId).includes(item.relatedNode)) } });
  await sleep(550);
  emit(telecomClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'Topology.expand', args: { nodeId } } });
  await sleep(500);
  emit(telecomClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'topology', payload: { selectedNodeId: nodeId, neighborIds: telecomNeighborsFor(nodeId), focusedSegment: 'transport-west' } });
  await sleep(550);
  emit(telecomClients, { kind: 'ag-ui', type: 'state.updated', payload: { correlationFound: true, suspectedLayer: 'Transport' } });
  await sleep(500);
  emit(telecomClients, { kind: 'ag-ui', type: 'approval.requested', payload: { message: 'Likely issue in Transport Layer - isolate affected segment?', actions: ['approve', 'reject', 'modify'] } });
}

async function streamApproval(action) {
  emit(telecomClients, { kind: 'ag-ui', type: 'user.action', payload: { action } });
  await sleep(500);

  if (action === 'approve') {
    emit(telecomClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'Topology.focusSegment', args: { segmentId: 'transport-west' } } });
    await sleep(450);
    emit(telecomClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'topology', payload: { selectedNodeId: lastNodeId, focusedSegment: 'transport-west', impactedServices: ['API-GW-1', 'Transport-SW3'] } });
  }

  if (action === 'modify') {
    emit(telecomClients, { kind: 'ag-ui', type: 'state.updated', payload: { correlationFound: true, suspectedLayer: 'Transport', narrowedScope: 'single edge gateway' } });
  }

  await sleep(350);
  emit(telecomClients, { kind: 'ag-ui', type: 'agent.completed', payload: { summary: `Analysis completed with operator action: ${action}.` } });
}

async function streamGenericInvestigation(nodeId) {
  emit(genericClients, { kind: 'ag-ui', type: 'intent.received', payload: { intent: 'InvestigateBusinessSlowdown', nodeId } });
  await sleep(450);
  emit(genericClients, { kind: 'ag-ui', type: 'agent.plan', payload: { steps: ['review related alerts', 'expand upstream and downstream workflow', 'estimate customer impact'] } });
  await sleep(550);
  emit(genericClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'Alerts.filter', args: { nodeId } } });
  await sleep(450);
  emit(genericClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'alerts', payload: { alerts: businessAlerts.filter((item) => item.relatedNode === nodeId || businessNeighborsFor(nodeId).includes(item.relatedNode)) } });
  await sleep(550);
  emit(genericClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'Workflow.expand', args: { nodeId } } });
  await sleep(450);
  emit(genericClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'workflow', payload: { selectedNodeId: nodeId, neighborIds: businessNeighborsFor(nodeId), focusedSegment: 'fulfillment' } });
  await sleep(550);
  emit(genericClients, { kind: 'ag-ui', type: 'state.updated', payload: { customerImpact: 'elevated', suspectedArea: 'Fulfillment' } });
  await sleep(450);
  emit(genericClients, { kind: 'ag-ui', type: 'approval.requested', payload: { message: 'Recommended action: temporarily prioritize delayed orders and notify support leads. Proceed?', actions: ['approve', 'reject', 'modify'] } });
}

async function streamGenericApproval(action) {
  emit(genericClients, { kind: 'ag-ui', type: 'user.action', payload: { action } });
  await sleep(450);

  if (action === 'approve') {
    emit(genericClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'Workflow.focusSegment', args: { segmentId: 'fulfillment' } } });
    await sleep(450);
    emit(genericClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'workflow', payload: { selectedNodeId: lastBusinessNodeId, focusedSegment: 'fulfillment', impactedTeams: ['Warehouse', 'Carrier Hub', 'Customer Support'] } });
  }

  if (action === 'modify') {
    emit(genericClients, { kind: 'ag-ui', type: 'state.updated', payload: { customerImpact: 'moderate', suspectedArea: 'Fulfillment', narrowedScope: 'warehouse queue only' } });
  }

  await sleep(350);
  emit(genericClients, { kind: 'ag-ui', type: 'agent.completed', payload: { summary: `Business review completed with operator action: ${action}.` } });
}

async function streamRetailInvestigation(missionId) {
  const mission = retailMissions[missionId] ?? retailMissions['weeknight-dinner'];

  emit(retailClients, { kind: 'ag-ui', type: 'intent.received', payload: { intent: 'AssistRetailMission', missionId, missionName: mission.missionName } });
  await sleep(450);
  emit(retailClients, { kind: 'ag-ui', type: 'agent.plan', payload: { steps: ['review basket intent', 'check zone readiness', 'align pickup promise', 'prepare customer-facing recommendation'] } });
  await sleep(500);
  emit(retailClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'Basket.rebuild', args: { missionId } } });
  await sleep(450);
  emit(retailClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'basket', payload: { items: mission.basket } });
  await sleep(500);
  emit(retailClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'StorePulse.focusZones', args: { zones: mission.highlightedZones } } });
  await sleep(450);
  emit(retailClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'zones', payload: { zones: mission.zones, highlightedZones: mission.highlightedZones } });
  await sleep(500);
  emit(retailClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'RetailMetrics.refresh', args: { missionId } } });
  await sleep(450);
  emit(retailClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'metrics', payload: { metrics: mission.metrics } });
  await sleep(500);
  emit(retailClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'itinerary', payload: { steps: mission.itinerary } });
  await sleep(450);
  emit(retailClients, { kind: 'ag-ui', type: 'state.updated', payload: { summary: 'Basket aligned with store capacity and shopper promise.' } });
  await sleep(450);
  emit(retailClients, { kind: 'ag-ui', type: 'approval.requested', payload: { message: mission.approvalMessage, actions: ['approve', 'reject', 'modify'] } });
}

async function streamRetailApproval(action) {
  const mission = retailMissions[lastRetailMissionId] ?? retailMissions['weeknight-dinner'];

  emit(retailClients, { kind: 'ag-ui', type: 'user.action', payload: { action } });
  await sleep(450);

  if (action === 'approve') {
    emit(retailClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'CustomerJourney.publish', args: { missionId: lastRetailMissionId } } });
    await sleep(450);
    emit(retailClients, { kind: 'ag-ui', type: 'state.updated', payload: { summary: 'Customer message queued and store teams synchronized.' } });
  }

  if (action === 'modify') {
    emit(retailClients, { kind: 'ag-ui', type: 'state.updated', payload: { summary: 'Scope narrowed to substitutions and slot reservation only.' } });
  }

  await sleep(350);
  emit(retailClients, { kind: 'ag-ui', type: 'agent.completed', payload: { summary: action === 'approve' ? mission.completedSummary : `Retail assist completed with operator action: ${action}.` } });
}

async function streamDashboardInvestigation(incidentId) {
  const incident = dashboardIncidents[incidentId] ?? dashboardIncidents['INC-4412'];

  emit(dashboardClients, { kind: 'ag-ui', type: 'intent.received', payload: { intent: 'InvestigateIncidentFromDashboard', incidentId: incident.incidentId } });
  await sleep(450);
  emit(dashboardClients, { kind: 'ag-ui', type: 'agent.plan', payload: { steps: ['inspect incident scope', 'update service health context', 'reveal topology neighborhood', 'prepare remediation approval'] } });
  await sleep(500);
  emit(dashboardClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'ServiceHealth.refresh', args: { incidentId: incident.incidentId } } });
  await sleep(450);
  emit(dashboardClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'health', payload: { health: incident.health } });
  await sleep(500);
  emit(dashboardClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'IncidentImpact.expand', args: { incidentId: incident.incidentId } } });
  await sleep(450);
  emit(dashboardClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'impact', payload: { impact: incident.impact } });
  await sleep(500);
  emit(dashboardClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'Topology.reveal', args: { nodeId: incident.nodeId } } });
  await sleep(450);
  emit(dashboardClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'topology', payload: { selectedNodeId: incident.nodeId, neighborIds: telecomNeighborsFor(incident.nodeId), focusedSegment: 'transport-west' } });
  await sleep(500);
  emit(dashboardClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'incidents', payload: { incidents: incidents.filter((item) => item.relatedNode === incident.nodeId || telecomNeighborsFor(incident.nodeId).includes(item.relatedNode)) } });
  await sleep(450);
  emit(dashboardClients, { kind: 'ag-ui', type: 'state.updated', payload: { summary: incident.summary, suspectedLayer: 'Transport' } });
  await sleep(450);
  emit(dashboardClients, { kind: 'ag-ui', type: 'approval.requested', payload: { message: incident.approvalMessage, actions: ['approve', 'reject', 'modify'] } });
}

async function streamDashboardApproval(action) {
  emit(dashboardClients, { kind: 'ag-ui', type: 'user.action', payload: { action } });
  await sleep(450);

  if (action === 'approve') {
    emit(dashboardClients, { kind: 'ag-ui', type: 'tool.called', payload: { tool: 'Topology.focusSegment', args: { segmentId: 'transport-west' } } });
    await sleep(450);
    emit(dashboardClients, { kind: 'ag-ui', type: 'state.updated', payload: { summary: 'Change request approved and transport remediation prepared.' } });
  }

  if (action === 'modify') {
    emit(dashboardClients, { kind: 'ag-ui', type: 'state.updated', payload: { summary: 'Approval scope narrowed to validation and staged traffic shift.' } });
  }

  await sleep(350);
  emit(dashboardClients, { kind: 'ag-ui', type: 'agent.completed', payload: { summary: `Dashboard-led analysis completed with operator action: ${action}.` } });
}

async function streamIntentOrder(mode) {
  const scenario = intentOrderScenario[mode] ?? intentOrderScenario.valid;
  const baseOrder = {
    id: scenario.serviceOrderId,
    state: 'Submitted',
    customer: scenario.customer,
    requestedService: scenario.requestedService,
    serviceSpecification: scenario.serviceSpecification,
    requestedStartDate: '2026-04-15T09:00:00Z',
    serviceSite: 'Stockholm DC-02',
    slaProfile: 'Enterprise Gold',
    orchestrationDomain: 'Transport and Edge',
    approvalPolicy: 'Human approval required before provisioning',
    characteristics: [
      { name: 'customerSegment', value: 'enterprise-logistics' },
      { name: 'serviceObjective', value: 'intent-driven-automation' }
    ],
    intent: {
      id: scenario.intentId,
      strategy: scenario.strategy,
      portfolioObjective: scenario.portfolioObjective,
      description: scenario.businessIntent
    }
  };

  emit(intentOrderClients, { kind: 'ag-ui', type: 'user.intent.received', payload: { intent: 'SubmitIntentDrivenServiceOrder', orderId: baseOrder.id } });
  await sleep(450);
  emit(intentOrderClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'order', payload: { order: baseOrder } });
  await sleep(500);
  emit(intentOrderClients, { kind: 'ag-ui', type: 'agent.plan.created', payload: { steps: ['receive TMF641 order submission', 'validate intent through TMF921 registry', 'map intent to service characteristics', 'visualize impacted service topology before approval', 'ask for approval before provisioning'] } });
  await sleep(550);
  emit(intentOrderClients, { kind: 'ag-ui', type: 'tool.call.started', payload: { tool: 'TMF921.IntentRegistry.validate', args: { intentId: scenario.intentId } } });
  await sleep(600);

  if (mode === 'invalid') {
    emit(intentOrderClients, { kind: 'ag-ui', type: 'tool.call.completed', payload: { tool: 'TMF921.IntentRegistry.validate', result: 'failed', reason: scenario.reason } });
    await sleep(450);
    emit(intentOrderClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'intentRegistry', payload: { registry: { intentId: scenario.intentId, status: 'Rejected', reason: scenario.reason } } });
    await sleep(450);
    emit(intentOrderClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'order', payload: { order: { ...baseOrder, state: 'Rejected', rejectionReason: scenario.reason } } });
    await sleep(400);
    emit(intentOrderClients, { kind: 'ag-ui', type: 'notification.emitted', payload: { channel: 'TMF641', message: 'Order rejected before provisioning because the intent failed governance validation.' } });
    await sleep(350);
    emit(intentOrderClients, { kind: 'ag-ui', type: 'run.completed', payload: { summary: 'Intent validation rejected the order and provisioning was blocked.' } });
    return;
  }

  emit(intentOrderClients, { kind: 'ag-ui', type: 'tool.call.completed', payload: { tool: 'TMF921.IntentRegistry.validate', result: 'passed', intentRef: scenario.intentId } });
  await sleep(450);
  emit(intentOrderClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'intentRegistry', payload: { registry: { intentId: scenario.intentId, status: 'Validated', strategy: scenario.strategy, portfolioObjective: scenario.portfolioObjective } } });
  await sleep(500);
  emit(intentOrderClients, { kind: 'ag-ui', type: 'tool.call.started', payload: { tool: 'IMF.mapIntentToServiceCharacteristics', args: { intentRef: scenario.intentId } } });
  await sleep(600);
  emit(intentOrderClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'mapping', payload: { characteristics: scenario.mappedCharacteristics } });
  await sleep(500);
  emit(intentOrderClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'order', payload: { order: { ...baseOrder, state: 'Acknowledged', intentRef: scenario.intentId, characteristics: [...baseOrder.characteristics, ...scenario.mappedCharacteristics] } } });
  await sleep(500);
  emit(intentOrderClients, { kind: 'ag-ui', type: 'tool.call.started', payload: { tool: 'ServiceImpactTopology.preview', args: { intentRef: scenario.intentId } } });
  await sleep(500);
  emit(intentOrderClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'impactTopology', payload: { topology: scenario.topology } });
  await sleep(500);
  emit(intentOrderClients, { kind: 'ag-ui', type: 'approval.requested', payload: { message: `Provision ${scenario.requestedService} with IntentRef ${scenario.intentId} and simplified orchestration characteristics?`, actions: ['approve', 'reject', 'modify'] } });
}

async function streamIntentOrderApproval(action) {
  const scenario = intentOrderScenario.valid;

  emit(intentOrderClients, { kind: 'ag-ui', type: 'user.action', payload: { action } });
  await sleep(450);

  if (action === 'reject') {
    emit(intentOrderClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'order', payload: { order: { id: scenario.serviceOrderId, state: 'Rejected', intentRef: scenario.intentId } } });
    await sleep(350);
    emit(intentOrderClients, { kind: 'ag-ui', type: 'run.completed', payload: { summary: 'Operator rejected provisioning. Order is stopped with IntentRef preserved for audit.' } });
    return;
  }

  if (action === 'modify') {
    emit(intentOrderClients, { kind: 'ag-ui', type: 'state.updated', payload: { summary: 'Scope modified: provision connectivity first and stage closed-loop assurance for operator review.' } });
    await sleep(400);
  }

  emit(intentOrderClients, { kind: 'ag-ui', type: 'tool.call.started', payload: { tool: 'TMF641.ServiceOrder.submit', args: { serviceOrderId: scenario.serviceOrderId, intentRef: scenario.intentId } } });
  await sleep(500);
  emit(intentOrderClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'order', payload: { order: { id: scenario.serviceOrderId, state: 'InProgress', intentRef: scenario.intentId } } });
  await sleep(500);
  emit(intentOrderClients, { kind: 'ag-ui', type: 'tool.call.started', payload: { tool: 'ServiceRegistry.createServices', args: { intentRef: scenario.intentId } } });
  await sleep(550);
  emit(intentOrderClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'services', payload: { services: scenario.services } });
  await sleep(450);
  emit(intentOrderClients, { kind: 'ag-ui', type: 'notification.emitted', payload: { channel: 'TMF641/TMF921', message: scenario.notification } });
  await sleep(350);
  emit(intentOrderClients, { kind: 'a2ui', type: 'surface.updateDataModel', target: 'order', payload: { order: { id: scenario.serviceOrderId, state: 'Completed', intentRef: scenario.intentId } } });
  await sleep(350);
  emit(intentOrderClients, { kind: 'ag-ui', type: 'run.completed', payload: { summary: `Intent-driven order completed with operator action: ${action}.` } });
}
function parseBody(req) {
  return new Promise((resolveBody) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch {
        resolveBody({});
      }
    });
  });
}

function sendJson(res, payload) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(payload));
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
    telecomClients.add(res);
    emit(telecomClients, { kind: 'ag-ui', type: 'state.updated', payload: { status: 'connected', note: 'SSE stream connected' } });
    req.on('close', () => telecomClients.delete(res));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/generic-demo/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    genericClients.add(res);
    emit(genericClients, { kind: 'ag-ui', type: 'state.updated', payload: { status: 'connected', note: 'Generic demo SSE stream connected' } });
    req.on('close', () => genericClients.delete(res));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/retail-demo/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    retailClients.add(res);
    emit(retailClients, { kind: 'ag-ui', type: 'state.updated', payload: { status: 'connected', note: 'Retail demo SSE stream connected' } });
    req.on('close', () => retailClients.delete(res));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/dashboard-demo/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    dashboardClients.add(res);
    emit(dashboardClients, { kind: 'ag-ui', type: 'state.updated', payload: { status: 'connected', note: 'Dashboard demo SSE stream connected' } });
    req.on('close', () => dashboardClients.delete(res));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/intent-order-demo/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    intentOrderClients.add(res);
    emit(intentOrderClients, { kind: 'ag-ui', type: 'state.updated', payload: { status: 'connected', note: 'Intent order demo SSE stream connected' } });
    req.on('close', () => intentOrderClients.delete(res));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/investigate') {
    const body = await parseBody(req);
    lastNodeId = body.nodeId ?? 'RAN-Cluster-12';
    sendJson(res, { ok: true });
    streamInvestigation(lastNodeId);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/approval') {
    const body = await parseBody(req);
    sendJson(res, { ok: true });
    streamApproval(body.action ?? 'approve');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/generic-demo/investigate') {
    const body = await parseBody(req);
    lastBusinessNodeId = body.nodeId ?? 'Payments';
    sendJson(res, { ok: true });
    streamGenericInvestigation(lastBusinessNodeId);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/generic-demo/approval') {
    const body = await parseBody(req);
    sendJson(res, { ok: true });
    streamGenericApproval(body.action ?? 'approve');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/retail-demo/investigate') {
    const body = await parseBody(req);
    lastRetailMissionId = body.missionId ?? 'weeknight-dinner';
    sendJson(res, { ok: true });
    streamRetailInvestigation(lastRetailMissionId);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/retail-demo/approval') {
    const body = await parseBody(req);
    sendJson(res, { ok: true });
    streamRetailApproval(body.action ?? 'approve');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/dashboard-demo/investigate') {
    const body = await parseBody(req);
    lastDashboardIncidentId = body.incidentId ?? 'INC-4412';
    sendJson(res, { ok: true });
    streamDashboardInvestigation(lastDashboardIncidentId);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/dashboard-demo/approval') {
    const body = await parseBody(req);
    sendJson(res, { ok: true });
    streamDashboardApproval(body.action ?? 'approve');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/intent-order-demo/create-order') {
    const body = await parseBody(req);
    lastIntentOrderMode = body.mode === 'invalid' ? 'invalid' : 'valid';
    sendJson(res, { ok: true });
    streamIntentOrder(lastIntentOrderMode);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/intent-order-demo/approval') {
    const body = await parseBody(req);
    sendJson(res, { ok: true });
    streamIntentOrderApproval(body.action ?? 'approve');
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

  let filePath;
  if (url.pathname === '/') filePath = resolve(frontendRoot, 'index.html');
  else if (url.pathname === '/generic-demo' || url.pathname === '/generic-demo/') filePath = resolve(frontendRoot, 'generic-demo.html');
  else if (url.pathname === '/retail-demo' || url.pathname === '/retail-demo/') filePath = resolve(frontendRoot, 'retail-demo.html');
  else if (url.pathname === '/dashboard-demo' || url.pathname === '/dashboard-demo/') filePath = resolve(frontendRoot, 'dashboard-demo.html');
  else if (url.pathname === '/intent-order-demo' || url.pathname === '/intent-order-demo/') filePath = resolve(frontendRoot, 'intent-order-demo.html');
  else filePath = resolve(frontendRoot, `.${url.pathname}`);

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

server.listen(8000, () => console.log('EDC demo available at http://localhost:8000, generic demo at http://localhost:8000/generic-demo, retail demo at http://localhost:8000/retail-demo, and dashboard demo at http://localhost:8000/dashboard-demo, and intent order demo at http://localhost:8000/intent-order-demo'));
