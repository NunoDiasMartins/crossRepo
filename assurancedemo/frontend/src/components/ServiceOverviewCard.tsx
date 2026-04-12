type TemporalPoint = {
  time: string;
  value: number;
};

type OverviewProps = {
  title: string;
  serviceName: string;
  metrics: {
    slaCompliance: number;
    latencyP95: number;
    activeAlarms: number;
    impactedEndpoints: number;
    availability?: number;
    majorIncidents?: number;
    mttrMinutes?: number;
    atRiskSlas?: number;
  };
  sparkline?: number[];
  temporalSeries?: {
    availability: TemporalPoint[];
    latency: TemporalPoint[];
    errorRate: TemporalPoint[];
    throughput: TemporalPoint[];
  };
};

function toPath(values: number[], width: number, height: number) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, idx) => {
      const x = idx * step;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');
}

function TemporalChart({ label, unit, points }: { label: string; unit: string; points: TemporalPoint[] }) {
  const width = 290;
  const height = 80;
  const values = points.map((point) => point.value);
  const path = toPath(values, width, height);
  const latest = values[values.length - 1];
  const first = points[0]?.time ?? '';
  const middle = points[Math.floor(points.length / 2)]?.time ?? '';
  const last = points[points.length - 1]?.time ?? '';

  return (
    <article className="temporal-kpi-card">
      <div className="temporal-kpi-card__header">
        <h4>{label}</h4>
        <strong>
          {latest}
          <small>{unit}</small>
        </strong>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} over time`}>
        <polyline points={path} />
      </svg>
      <div className="temporal-kpi-card__axis">
        <span>{first}</span>
        <span>{middle}</span>
        <span>{last}</span>
      </div>
    </article>
  );
}

export function ServiceOverviewCard({ title, serviceName, metrics, sparkline, temporalSeries }: OverviewProps) {
  const baseSparkline = sparkline ?? [95, 93, 94, 90, 85, 81, 79];
  const fallbackTemporalSeries = temporalSeries ?? {
    availability: baseSparkline.map((value, idx) => ({ time: `T-${baseSparkline.length - idx}h`, value })),
    latency: baseSparkline.map((value, idx) => ({ time: `T-${baseSparkline.length - idx}h`, value: 40 + value })),
    errorRate: baseSparkline.map((value, idx) => ({ time: `T-${baseSparkline.length - idx}h`, value: Number((value / 40).toFixed(2)) })),
    throughput: baseSparkline.map((value, idx) => ({ time: `T-${baseSparkline.length - idx}h`, value: 500 - value * 2 }))
  };

  return (
    <section className="surface-card">
      <h2>{title}</h2>
      <h3>{serviceName}</h3>
      <div className="metric-grid">
        <div><span>SLA compliance</span><strong>{metrics.slaCompliance}%</strong></div>
        <div><span>Latency P95</span><strong>{metrics.latencyP95} ms</strong></div>
        <div><span>Active alarms</span><strong>{metrics.activeAlarms}</strong></div>
        <div><span>Impacted endpoints</span><strong>{metrics.impactedEndpoints}</strong></div>
        <div><span>Service availability</span><strong>{metrics.availability ?? 99.71}%</strong></div>
        <div><span>Major incidents (24h)</span><strong>{metrics.majorIncidents ?? 2}</strong></div>
        <div><span>MTTR</span><strong>{metrics.mttrMinutes ?? 24} min</strong></div>
        <div><span>SLA breach risk</span><strong>{metrics.atRiskSlas ?? 1}</strong></div>
      </div>

      <div className="service-assurance-section">
        <h4>Service Assurance KPI Timeline (24h)</h4>
        <div className="temporal-kpi-grid">
          <TemporalChart label="Availability" unit="%" points={fallbackTemporalSeries.availability} />
          <TemporalChart label="Latency (P95)" unit="ms" points={fallbackTemporalSeries.latency} />
          <TemporalChart label="Error rate" unit="%" points={fallbackTemporalSeries.errorRate} />
          <TemporalChart label="Throughput" unit="Mbps" points={fallbackTemporalSeries.throughput} />
        </div>
      </div>
    </section>
  );
}
