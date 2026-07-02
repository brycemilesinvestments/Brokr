"use client";

import {
  getPayloadConfigFromPayload,
  getColorsCount,
} from "@/components/evilcharts/lib/chart-helpers";
import { useChart } from "@/components/evilcharts/ui/chart";
import { useRecharts } from "@/components/evilcharts/ui/use-recharts";
import type {
  DefaultTooltipContentProps,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { NameType, Payload, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { cn } from "@/lib/utils";
import * as React from "react";

type TooltipRoundness = "sm" | "md" | "lg" | "xl";
type TooltipVariant = "default" | "frosted-glass";

const roundnessMap: Record<TooltipRoundness, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

const variantMap: Record<TooltipVariant, string> = {
  default: "bg-background",
  "frosted-glass": "bg-background/70 backdrop-blur-sm",
};

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  nameKey,
  labelKey,
  selected,
  roundness = "lg",
  variant = "default",
}: React.ComponentProps<typeof RechartsTooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
    selected?: string | null;
    roundness?: TooltipRoundness;
    variant?: TooltipVariant;
  } & Omit<
    DefaultTooltipContentProps<ValueType, NameType>,
    "accessibilityLayer"
  >) {
  if (!active || !payload?.length) {
    // Empty tooltip - to prevent position getting 0.0 so it doesnt animate tooltip every time from 0.0 origin
    return <span className="p-4" />;
  }

  return (
    <ChartTooltipBody
      payload={payload}
      className={className}
      indicator={indicator}
      hideLabel={hideLabel}
      hideIndicator={hideIndicator}
      label={typeof label === "string" || typeof label === "number" ? label : undefined}
      labelFormatter={labelFormatter}
      labelClassName={labelClassName}
      formatter={formatter}
      nameKey={nameKey}
      labelKey={labelKey}
      selected={selected}
      roundness={roundness}
      variant={variant}
    />
  );
}

function ChartTooltipBody({
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  nameKey,
  labelKey,
  selected,
  roundness = "lg",
  variant = "default",
}: {
  payload: ReadonlyArray<Payload<ValueType, NameType>>;
  className?: string;
  indicator?: "line" | "dot" | "dashed";
  hideLabel?: boolean;
  hideIndicator?: boolean;
  label?: string | number;
  labelFormatter?: React.ComponentProps<typeof RechartsTooltip>["labelFormatter"];
  labelClassName?: string;
  formatter?: DefaultTooltipContentProps<ValueType, NameType>["formatter"];
  nameKey?: string;
  labelKey?: string;
  selected?: string | null;
  roundness?: TooltipRoundness;
  variant?: TooltipVariant;
}) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string" ? (config[label]?.label ?? label) : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>
      );
    }

    if (!value) {
      return null;
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  const nestLabel = payload.length === 1 && indicator !== "dot";

  const payloadItems: React.ReactNode[] = [];
  for (const item of payload) {
    if (item.type === "none") continue;

    // For pie charts, item.name contains the sector name (e.g., "chrome")
    // For radial charts, the name is in item.payload[nameKey]
    // For other charts, item.name or item.dataKey contains the series name
    const payloadName =
      nameKey && item.payload ? (item.payload as Record<string, unknown>)[nameKey] : undefined;
    const key = `${payloadName ?? item.name ?? item.dataKey ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);

    // Get colors count for this item to determine gradient vs solid
    const colorsCount = itemConfig ? getColorsCount(itemConfig) : 1;

    payloadItems.push(
      <div
        key={key}
        className={cn(
          "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
          indicator === "dot" && "items-center",
          selected != null && selected !== item.dataKey && "opacity-30",
        )}
      >
        {formatter && item?.value !== undefined && item.name ? (
          formatter(item.value, item.name, item, 0, item.payload)
        ) : (
          <>
            {itemConfig?.icon ? (
              <itemConfig.icon />
            ) : (
              !hideIndicator && (
                <div
                  className={cn("shrink-0 rounded-[2px]", {
                    "h-2.5 w-2.5": indicator === "dot",
                    "w-1": indicator === "line",
                    "w-0 border-[1.5px] border-dashed bg-transparent!": indicator === "dashed",
                    "my-0.5": nestLabel && indicator === "dashed",
                  })}
                  style={getIndicatorColorStyle(key, colorsCount)}
                />
              )
            )}
            <div
              className={cn(
                "flex flex-1 justify-between gap-4 leading-none",
                nestLabel ? "items-end" : "items-center",
              )}
            >
              <div className="grid gap-1.5">
                {nestLabel ? tooltipLabel : null}
                <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
              </div>
              {item.value != null && (
                <span className="text-foreground font-mono font-medium tabular-nums">
                  {typeof item.value === "number"
                    ? item.value.toLocaleString()
                    : String(item.value)}
                </span>
              )}
            </div>
          </>
        )}
      </div>,
    );
  }

  return (
    <div
      className={cn(
        "border-border/50 grid min-w-32 items-start gap-1.5 border px-2.5 py-1.5 text-xs shadow-xl",
        roundnessMap[roundness],
        variantMap[variant],
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">{payloadItems}</div>
    </div>
  );
}

function getIndicatorColorStyle(dataKey: string, colorsCount: number): React.CSSProperties {
  if (colorsCount <= 1) {
    return { background: `var(--color-${dataKey}-0)` };
  }

  // Multiple colors: create linear gradient with evenly distributed stops
  const stops = Array.from({ length: colorsCount }, (_, index) => {
    const offset = (index / (colorsCount - 1)) * 100;
    return `var(--color-${dataKey}-${index}) ${offset}%`;
  }).join(", ");

  return { background: `linear-gradient(to right, ${stops})` };
}

function ChartTooltip({
  animationDuration = 200,
  ...props
}: React.ComponentProps<typeof RechartsTooltip>) {
  const { Tooltip } = useRecharts();

  return <Tooltip animationDuration={animationDuration} {...props} />;
}

export { ChartTooltip, ChartTooltipContent };
export type { TooltipRoundness, TooltipVariant };
