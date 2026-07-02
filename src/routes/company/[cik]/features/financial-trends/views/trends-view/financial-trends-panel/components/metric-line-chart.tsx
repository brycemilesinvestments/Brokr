"use client";

import { useEffect } from "react";
import { ReferenceDot } from "recharts";
import {
  ActiveDot,
  Area,
  Dot,
  EvilAreaChart,
  Grid,
  XAxis,
  YAxis,
} from "@/components/evilcharts/charts/area-chart";
import { type ChartConfig } from "@/components/evilcharts/ui/chart";
import { ChartTooltip, ChartTooltipContent } from "@/components/evilcharts/ui/tooltip";
import type { ChartPoint } from "@/lib/analysis";
import { humanizeConcept } from "@/routes/company/[cik]/features/financial-trends/utils/humanize-concept";
import type { MetricChartRow } from "../lib/build-metric-chart-geometry";
import { formatAxisDate, formatDeltaPercent, formatMetricValue } from "../utils/format-metric";

const chartConfig = {
  value: {
    label: "Value",
    colors: { light: ["#047857"] },
  },
} satisfies ChartConfig;

type MetricLineChartProps = {
  metric: string;
  chartData: MetricChartRow[];
  onActivePointChange?: (point: MetricChartRow | null) => void;
};

function MetricTooltipContent({
  metric,
  onActivePointChange,
  active,
  payload,
  label,
}: React.ComponentProps<typeof ChartTooltipContent> & {
  metric: string;
  onActivePointChange?: (point: MetricChartRow | null) => void;
}) {
  const row = payload?.[0]?.payload as MetricChartRow | undefined;
  const labelText = metric.includes("_") ? metric.replace(/_/g, " ") : humanizeConcept(metric);

  useEffect(() => {
    if (active && row) {
      onActivePointChange?.(row);
    }
  }, [active, row, onActivePointChange]);

  if (!active || !row) {
    return <ChartTooltipContent active={active} payload={payload} label={label} />;
  }

  return (
    <div className="border-border/50 bg-background grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium text-zinc-500">
        {formatAxisDate(row.date)} · {row.frequency}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-700">{labelText}</span>
        <span className="font-mono font-medium text-zinc-900">
          {formatMetricValue(metric, row.value)}
        </span>
      </div>
      {row.frequency === "quarterly" && row.delta_qoq !== undefined ? (
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500">QoQ</span>
          <span className="font-mono text-zinc-700">{formatDeltaPercent(row.delta_qoq)}</span>
        </div>
      ) : null}
      {row.delta_yoy !== undefined ? (
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500">YoY</span>
          <span className="font-mono text-zinc-700">{formatDeltaPercent(row.delta_yoy)}</span>
        </div>
      ) : null}
      {row.anomaly ? <p className="font-medium text-red-700">Flagged anomaly</p> : null}
    </div>
  );
}

export function MetricLineChart({ metric, chartData, onActivePointChange }: MetricLineChartProps) {
  if (chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        No data points for this metric and frequency.
      </div>
    );
  }

  return (
    <EvilAreaChart
      data={chartData}
      config={chartConfig}
      curveType="monotone"
      animationType="left-to-right"
      className="h-[280px] w-full"
    >
      <Grid />
      <XAxis
        dataKey="date"
        tickFormatter={(value) => formatAxisDate(String(value))}
        minTickGap={48}
      />
      <YAxis tickFormatter={(value) => formatMetricValue(metric, Number(value))} width={72} />
      <ChartTooltip
        content={
          <MetricTooltipContent metric={metric} onActivePointChange={onActivePointChange} />
        }
      />
      <Area dataKey="value" variant="gradient">
        <Dot variant="default" />
        <ActiveDot variant="colored-border" />
      </Area>
      {chartData
        .filter((row) => row.anomaly)
        .map((row) => (
          <ReferenceDot
            key={`${row.date}-${row.frequency}`}
            x={row.date}
            y={row.value}
            r={5}
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth={2}
          />
        ))}
    </EvilAreaChart>
  );
}

export function filterChartPoints(
  allPoints: ChartPoint[] | undefined,
  frequency: "quarterly" | "annual" | "both",
): ChartPoint[] {
  if (!allPoints) return [];
  const filtered =
    frequency === "both" ? allPoints : allPoints.filter((point) => point.frequency === frequency);
  return [...filtered].sort((a, b) => a.x.localeCompare(b.x));
}
