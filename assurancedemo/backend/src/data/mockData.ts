export type SurfaceName =
  | 'service-overview'
  | 'impact-topology'
  | 'kpi-correlation'
  | 'root-cause-analysis'
  | 'resolution-summary';

export const baseState = {
  service: {
    id: 'enterprise-surveillance-slice',
    name: 'Enterprise Surveillance Slice',
    slaCompliance: 97.8,
    latencyP95: 148,
    activeAlarms: 3,
    impactedEndpoints: 1200
  },
  alarms: [
    {
      id: 'ALM-4492',
      severity: 'critical',
      text: 'Latency spike detected in region west-metro'
    }
  ],
  entities: {
    slice: 'Enterprise Surveillance Slice',
    region: 'west-metro',
    impactedGnbs: ['gnb-101', 'gnb-102', 'gnb-103'],
    impactedCells: ['cell-101-a', 'cell-101-b', 'cell-102-a', 'cell-103-a'],
    transportPath: 'transport-link-a'
  },
  remediationOptions: [
    {
      id: 'reroute-secondary',
      title: 'Reroute traffic to secondary path',
      risk: 'low',
      expectedLatencyGainMs: 72
    }
  ]
};

const topologyNodes = [
  { id: 'transport-link-a', label: 'transport-link-a', type: 'transport', impacted: true },
  { id: 'gnb-101', label: 'gnb-101', type: 'gnb', impacted: true },
  { id: 'gnb-102', label: 'gnb-102', type: 'gnb', impacted: true },
  { id: 'gnb-103', label: 'gnb-103', type: 'gnb', impacted: true },
  { id: 'cell-101-a', label: 'cell-101-a', type: 'cell', impacted: true },
  { id: 'cell-101-b', label: 'cell-101-b', type: 'cell', impacted: true },
  { id: 'cell-102-a', label: 'cell-102-a', type: 'cell', impacted: true },
  { id: 'cell-103-a', label: 'cell-103-a', type: 'cell', impacted: true }
];

const topologyEdges: string[][] = [
  ['transport-link-a', 'gnb-101'],
  ['transport-link-a', 'gnb-102'],
  ['transport-link-a', 'gnb-103'],
  ['gnb-101', 'cell-101-a'],
  ['gnb-101', 'cell-101-b'],
  ['gnb-102', 'cell-102-a'],
  ['gnb-103', 'cell-103-a']
];

export const surfaces = {
  serviceOverview: {
    surface: 'service-overview',
    title: 'Service Assurance Dashboard',
    component: 'ServiceOverviewCard',
    props: {
      metrics: {
        slaCompliance: 97.8,
        latencyP95: 148,
        activeAlarms: 3,
        impactedEndpoints: 1200,
        availability: 99.71,
        majorIncidents: 2,
        mttrMinutes: 24,
        atRiskSlas: 1
      },
      temporalSeries: {
        availability: [
          { time: '00:00', value: 99.98 },
          { time: '04:00', value: 99.96 },
          { time: '08:00', value: 99.91 },
          { time: '12:00', value: 99.83 },
          { time: '16:00', value: 99.77 },
          { time: '20:00', value: 99.72 },
          { time: '23:59', value: 99.71 }
        ],
        latency: [
          { time: '00:00', value: 48 },
          { time: '04:00', value: 55 },
          { time: '08:00', value: 63 },
          { time: '12:00', value: 88 },
          { time: '16:00', value: 112 },
          { time: '20:00', value: 139 },
          { time: '23:59', value: 148 }
        ],
        errorRate: [
          { time: '00:00', value: 0.2 },
          { time: '04:00', value: 0.3 },
          { time: '08:00', value: 0.4 },
          { time: '12:00', value: 0.8 },
          { time: '16:00', value: 1.3 },
          { time: '20:00', value: 1.9 },
          { time: '23:59', value: 2.2 }
        ],
        throughput: [
          { time: '00:00', value: 432 },
          { time: '04:00', value: 421 },
          { time: '08:00', value: 401 },
          { time: '12:00', value: 372 },
          { time: '16:00', value: 341 },
          { time: '20:00', value: 319 },
          { time: '23:59', value: 309 }
        ]
      }
    }
  },
  impactTopology: {
    surface: 'impact-topology',
    title: 'Impact Topology',
    component: 'TopologyView',
    props: {
      mode: 'impact',
      nodes: topologyNodes,
      edges: topologyEdges,
      blastRadius: {
        impactedCameras: 1200,
        impactedGnbs: 3,
        impactedCells: 4
      }
    }
  },
  kpiCorrelation: {
    surface: 'kpi-correlation',
    title: 'KPI Correlation',
    component: 'KpiCorrelationPanel',
    props: {
      timestamps: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
      series: {
        serviceAvailability: [99.98, 99.97, 99.94, 99.9, 99.82, 99.76, 99.71],
        latencyP95: [44, 46, 48, 62, 89, 122, 148],
        throughputDlUl: [421, 416, 403, 378, 342, 321, 309],
        sessionSuccessRate: [99.4, 99.3, 99.2, 98.8, 98.1, 97.2, 96.8],
        dropRate: [0.2, 0.3, 0.4, 0.9, 1.6, 2.4, 3.1],
        prbUtilization: [62, 64, 66, 74, 81, 88, 91],
        handoverSuccessRate: [99.1, 99.0, 98.8, 98.1, 97.3, 96.4, 95.9],
        sliceSlaCompliance: [99.8, 99.7, 99.6, 99.1, 98.7, 98.2, 97.8],
        packetLoss: [0.1, 0.2, 0.3, 0.8, 1.1, 1.7, 2.2],
        alarmCorrelationCount: [2, 3, 3, 5, 8, 11, 14]
      },
      insight: 'Drop rate and packet loss are impacted by the ongoing transport congestion, alongside the latency spike.'
    }
  },
  rca: {
    surface: 'root-cause-analysis',
    title: 'RCA Causal Topology',
    component: 'TopologyView',
    props: {
      mode: 'rca',
      nodes: topologyNodes.map((node) => ({
        ...node,
        rootCause: node.id === 'transport-link-a',
        causal: ['transport-link-a', 'gnb-101', 'gnb-102', 'gnb-103'].includes(node.id)
      })),
      edges: topologyEdges,
      rcaDetails: {
        confidence: 0.91,
        rootCause: 'transport congestion on transport-link-a',
        propagation: 'Congestion on transport-link-a propagated queueing to three gNBs and then to four impacted cells.',
        causalPath: ['transport-link-a', 'gnb-101', 'gnb-102', 'gnb-103']
      }
    }
  },
  resolution: {
    surface: 'resolution-summary',
    title: 'Resolution Summary',
    component: 'ResolutionPanel',
    props: {
      beforeAfter: {
        latencyP95: { before: 148, after: 52 },
        slaCompliance: { before: 97.8, after: 99.95 },
        dropRate: { before: 3.1, after: 0.3 },
        packetLoss: { before: 2.2, after: 0.2 }
      },
      recoveredDevices: 1200,
      timeline: [
        'Detected latency degradation',
        'Correlated congestion + handover failures',
        'Identified transport-link-a congestion',
        'Rerouted traffic to secondary path',
        'KPI recovery confirmed (drop rate + packet loss improved)'
      ]
    }
  }
};
