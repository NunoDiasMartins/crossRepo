import salesDataRaw from '../data/sales_q3.json' assert { type: 'json' };
import campaignsRaw from '../data/campaigns.json' assert { type: 'json' };
import type { Anomaly, CampaignRow, SalesRow, WeeklyRevenue } from '@demo/shared';

export type Filters = {
  region?: string;
  channel?: string;
  category?: string;
  sensitivity: number;
};

export class AnalysisPipeline {
  private sales = salesDataRaw as SalesRow[];
  private campaigns = campaignsRaw as CampaignRow[];

  datasetPreview(): SalesRow[] {
    return this.sales.slice(0, 8);
  }

  aggregateWeekly(filters: Filters): WeeklyRevenue[] {
    const filtered = this.sales.filter((row) => {
      const regionOk = !filters.region || filters.region === 'all' || row.region === filters.region;
      const channelOk = !filters.channel || filters.channel === 'all' || row.channel === filters.channel;
      const categoryOk = !filters.category || filters.category === 'all' || row.category === filters.category;
      return regionOk && channelOk && categoryOk;
    });

    const map = new Map<string, number>();
    for (const row of filtered) {
      map.set(row.week, (map.get(row.week) ?? 0) + row.revenue);
    }

    return [...map.entries()]
      .map(([week, revenue]) => ({ week, revenue }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  detectAnomalies(weekly: WeeklyRevenue[], sensitivity = 0.14): Anomaly[] {
    const avg = weekly.reduce((sum, x) => sum + x.revenue, 0) / Math.max(weekly.length, 1);

    return weekly
      .filter((x) => Math.abs((x.revenue - avg) / avg) > sensitivity)
      .map((row) => {
        const deviationPct = Number((((row.revenue - avg) / avg) * 100).toFixed(1));
        const campaign = this.campaigns.find((item) => item.week === row.week);
        return {
          week: row.week,
          revenue: row.revenue,
          deviationPct,
          kind: campaign?.impact ?? (deviationPct > 0 ? 'positive_spike' : 'negative_dip'),
          cause: campaign?.note ?? 'No direct campaign match; probable external factors.'
        };
      });
  }

  forecastNextQuarter(weekly: WeeklyRevenue[]): WeeklyRevenue[] {
    const tail = weekly.slice(-4);
    const trend = tail.length < 2 ? 0.015 : (tail[tail.length - 1].revenue - tail[0].revenue) / tail[0].revenue / 4;
    const base = weekly[weekly.length - 1]?.revenue ?? 100000;

    return [1, 2, 3, 4].map((step) => ({
      week: `2025-W${36 + step}`,
      revenue: Math.round(base * (1 + trend * step + step * 0.01))
    }));
  }

  segmentByRegion(): Record<string, WeeklyRevenue[]> {
    const regions = ['Europe', 'North America', 'APAC'];
    return Object.fromEntries(regions.map((region) => [region, this.aggregateWeekly({ region, sensitivity: 0.14 })]));
  }
}
