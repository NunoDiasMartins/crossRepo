function MetricRow({ label, values }: { label: string; values: number[] }) {
  return (
    <div className="kpi-row">
      <span>{label}</span>
      <div className="kpi-bars">
        {values.map((v, idx) => (
          <i key={idx} style={{ height: `${Math.max(8, v)}%` }} />
        ))}
      </div>
    </div>
  );
}

export function KpiCorrelationPanel({ title, series, insight }: { title: string; series: any; insight: string }) {
  return (
    <section className="surface-card">
      <h2>{title}</h2>
      <MetricRow label="PRB utilization" values={series.prbUtilization} />
      <MetricRow label="Handover failures" values={series.handoverFailures.map((v: number) => v * 15)} />
      <MetricRow label="Latency" values={series.latency.map((v: number) => v / 2)} />
      <MetricRow label="Packet loss" values={series.packetLoss.map((v: number) => v * 25)} />
      <p className="insight">⚠ Correlated anomaly: {insight}</p>
    </section>
  );
}
