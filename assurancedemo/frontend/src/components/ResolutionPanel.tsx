type RecoverySeries = {
  dropRate: number[];
  packetLoss: number[];
};

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

function RecoveryChart({ label, values, unit, checkpoints }: { label: string; values: number[]; unit: string; checkpoints: string[] }) {
  const width = 220;
  const height = 70;
  const points = toPoints(values, width, height);
  const latest = values[values.length - 1];

  return (
    <article className="resolution-kpi-chart">
      <div className="resolution-kpi-chart__header">
        <h4>{label}</h4>
        <strong>
          {latest}
          <small>{unit}</small>
        </strong>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} recovery trend`}>
        <polyline points={points} />
      </svg>
      <div className="kpi-line-card__axis">
        {checkpoints.map((checkpoint) => (
          <span key={checkpoint}>{checkpoint}</span>
        ))}
      </div>
    </article>
  );
}

export function ResolutionPanel({
  title,
  beforeAfter,
  recoveredDevices,
  timeline,
  recoverySeries,
  recoveryLabels = ['Before fix', 'During reroute', 'After fix']
}: {
  title: string;
  beforeAfter: any;
  recoveredDevices: number;
  timeline: string[];
  recoverySeries?: RecoverySeries;
  recoveryLabels?: string[];
}) {
  const fallbackSeries: RecoverySeries = {
    dropRate: [beforeAfter.dropRate.before, (beforeAfter.dropRate.before + beforeAfter.dropRate.after) / 2, beforeAfter.dropRate.after],
    packetLoss: [beforeAfter.packetLoss.before, (beforeAfter.packetLoss.before + beforeAfter.packetLoss.after) / 2, beforeAfter.packetLoss.after]
  };

  const appliedSeries = recoverySeries ?? fallbackSeries;

  return (
    <section className="surface-card">
      <h2>{title}</h2>
      <div className="before-after-grid">
        <div><span>Latency P95</span><strong>{beforeAfter.latencyP95.before} → {beforeAfter.latencyP95.after} ms</strong></div>
        <div><span>SLA</span><strong>{beforeAfter.slaCompliance.before}% → {beforeAfter.slaCompliance.after}%</strong></div>
        <div><span>Drop Rate</span><strong>{beforeAfter.dropRate.before}% → {beforeAfter.dropRate.after}%</strong></div>
        <div><span>Packet Loss</span><strong>{beforeAfter.packetLoss.before}% → {beforeAfter.packetLoss.after}%</strong></div>
      </div>

      <div className="resolution-kpi-grid">
        <RecoveryChart label="Drop rate recovery" values={appliedSeries.dropRate} unit="%" checkpoints={recoveryLabels} />
        <RecoveryChart label="Packet loss recovery" values={appliedSeries.packetLoss} unit="%" checkpoints={recoveryLabels} />
      </div>

      <div className="improved-kpi-strip">
        <p>KPI recovery confirmed (drop rate + packet loss improved):</p>
        <span>Drop rate recovered to {beforeAfter.dropRate.after}%</span>
        <span>Packet loss recovered to {beforeAfter.packetLoss.after}%</span>
      </div>
      <p>Recovered impacted devices: {recoveredDevices}</p>
      <ol>
        {timeline.map((entry, idx) => <li key={idx}>{entry}</li>)}
      </ol>
    </section>
  );
}
