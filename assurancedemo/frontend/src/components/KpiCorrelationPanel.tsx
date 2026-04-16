type KpiSeries = Record<string, number[]>;

const KPI_METADATA: Array<{ key: string; label: string; unit: string; impacted?: boolean }> = [
  { key: 'serviceAvailability', label: 'Service availability', unit: '%' },
  { key: 'latencyP95', label: 'End-to-end latency (P95)', unit: 'ms' },
  { key: 'throughputDlUl', label: 'Throughput (DL/UL)', unit: 'Mbps' },
  { key: 'sessionSuccessRate', label: 'Session success rate', unit: '%' },
  { key: 'dropRate', label: 'Drop rate', unit: '%', impacted: true },
  { key: 'prbUtilization', label: 'PRB utilization (RAN)', unit: '%' },
  { key: 'handoverSuccessRate', label: 'Handover success rate', unit: '%' },
  { key: 'sliceSlaCompliance', label: 'Slice SLA compliance', unit: '%' },
  { key: 'packetLoss', label: 'Packet loss', unit: '%', impacted: true },
  { key: 'alarmCorrelationCount', label: 'Alarm correlation count', unit: 'count' }
];

function toPoints(values: number[], width: number, height: number) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, idx) => {
      const x = idx * step;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');
}

function MetricLineChart({
  label,
  values,
  unit,
  impacted = false,
  timestamps
}: {
  label: string;
  values: number[];
  unit: string;
  impacted?: boolean;
  timestamps: string[];
}) {
  const width = 240;
  const height = 72;
  const points = toPoints(values, width, height);
  const latest = values[values.length - 1];
  const earliest = values[0];
  const delta = latest - earliest;
  const first = timestamps[0] ?? 'T-24h';
  const middle = timestamps[Math.floor(timestamps.length / 2)] ?? 'T-12h';
  const last = timestamps[timestamps.length - 1] ?? 'Now';

  return (
    <article className={`kpi-line-card ${impacted ? 'impacted' : ''}`}>
      <div className="kpi-line-card__header">
        <h3>{label}</h3>
        <strong>
          {latest}
          <small>{unit}</small>
        </strong>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} trend`}>
        <polyline points={points} />
      </svg>
      <div className="kpi-line-card__axis">
        <span>{first}</span>
        <span>{middle}</span>
        <span>{last}</span>
      </div>
      <p className={`kpi-line-card__delta ${delta > 0 ? 'up' : 'down'}`}>
        Trend: {delta > 0 ? '+' : ''}
        {delta.toFixed(2)} {unit}
      </p>
      {impacted ? <p className="kpi-impact-label">Impacted by current issue</p> : null}
    </article>
  );
}

export function KpiCorrelationPanel({
  title,
  series,
  insight,
  timestamps = [],
  metricKeys
}: {
  title: string;
  series: KpiSeries;
  insight: string;
  timestamps?: string[];
  metricKeys?: string[];
}) {
  const visibleKpis = metricKeys?.length
    ? KPI_METADATA.filter((kpi) => metricKeys.includes(kpi.key))
    : KPI_METADATA;

  return (
    <section className="surface-card">
      <h2>{title}</h2>
      <div className="kpi-grid">
        {visibleKpis.map((kpi) => (
          <MetricLineChart
            key={kpi.key}
            label={kpi.label}
            values={series[kpi.key]}
            unit={kpi.unit}
            impacted={kpi.impacted}
            timestamps={timestamps}
          />
        ))}
      </div>
      <p className="insight">⚠ Correlated anomaly: {insight}</p>
    </section>
  );
}
