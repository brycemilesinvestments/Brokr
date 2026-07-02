"use client";

import { Suspense } from "react";
import type { ResponsiveContainerProps } from "recharts";
import { useRecharts } from "@/components/evilcharts/ui/use-recharts";
import {
  validateChartConfigColors,
  type ChartConfig,
} from "@/components/evilcharts/lib/chart-helpers";
import { ChartStyle } from "@/components/evilcharts/ui/chart-style";
import { cn } from "@/lib/utils";
import * as React from "react";

export type { ChartConfig } from "@/components/evilcharts/lib/chart-helpers";

interface ChartContextProps {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const context = React.use(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

interface ChartResponsiveContainerProps
  extends Pick<
    ResponsiveContainerProps,
    | "initialDimension"
    | "aspect"
    | "debounce"
    | "minHeight"
    | "minWidth"
    | "maxHeight"
    | "height"
    | "width"
    | "onResize"
    | "children"
  > {
  className?: string;
}

function ChartResponsiveContainer({
  className,
  children,
  initialDimension = { width: 320, height: 200 },
  ...props
}: ChartResponsiveContainerProps) {
  const Recharts = useRecharts();

  return (
    <Recharts.ResponsiveContainer
      className={className}
      initialDimension={initialDimension}
      {...props}
    >
      {children}
    </Recharts.ResponsiveContainer>
  );
}

interface ChartContainerProps
  extends Omit<React.ComponentProps<"div">, "children">,
    ChartResponsiveContainerProps {
  config: ChartConfig;
  innerResponsiveContainerStyle?: ResponsiveContainerProps["style"];
  /** Optional content rendered below the chart (e.g. EvilBrush) */
  footer?: React.ReactNode;
}

function ChartContainer({
  id,
  config,
  initialDimension = { width: 320, height: 200 },
  className,
  children,
  footer,
  ...props
}: Readonly<ChartContainerProps>) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  validateChartConfigColors(config);

  const contextValue = React.useMemo(() => ({ config }), [config]);

  return (
    <ChartContext.Provider value={contextValue}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "min-h-0 w-full flex-1",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border relative flex flex-col justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          !footer && "aspect-video",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <Suspense
          fallback={<div className="min-h-0 w-full flex-1 animate-pulse rounded-md bg-muted/30" />}
        >
          <ChartResponsiveContainer initialDimension={initialDimension}>
            {children}
          </ChartResponsiveContainer>
        </Suspense>
        {footer}
      </div>
    </ChartContext.Provider>
  );
}

export { ChartContainer };
