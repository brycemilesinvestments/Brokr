"use client";

import { cn } from "@/lib/utils";
import { CHART_TIME_RANGE_OPTIONS } from "./constants";
import type { ChartTimeRange } from "./types";

type ChartTimeRangeSwitchProps = {
  value: ChartTimeRange;
  onChange: (value: ChartTimeRange) => void;
  className?: string;
  options?: ChartTimeRange[];
  variant?: "default" | "segmented";
};

export function ChartTimeRangeSwitch({
  value,
  onChange,
  className,
  options,
  variant = "default",
}: ChartTimeRangeSwitchProps) {
  const visibleOptions = options
    ? CHART_TIME_RANGE_OPTIONS.filter((option) => options.includes(option.value))
    : CHART_TIME_RANGE_OPTIONS;

  if (variant === "segmented") {
    return (
      <div className={cn("flex gap-0.5 rounded-[10px] bg-zinc-100 p-0.5", className)}>
        {visibleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "min-w-[46px] rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold transition",
              value === option.value
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap justify-center gap-1", className)}>
      {visibleOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "min-w-[2.25rem] rounded-md px-2 py-1 text-xs font-semibold transition",
            value === option.value
              ? "bg-emerald-700 text-white"
              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
