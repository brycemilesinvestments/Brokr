"use client";

import { cn } from "@/lib/utils";
import { CHART_TIME_RANGE_OPTIONS } from "./constants";
import type { ChartTimeRange } from "./types";

type ChartTimeRangeSwitchProps = {
  value: ChartTimeRange;
  onChange: (value: ChartTimeRange) => void;
  className?: string;
};

export function ChartTimeRangeSwitch({ value, onChange, className }: ChartTimeRangeSwitchProps) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-1", className)}>
      {CHART_TIME_RANGE_OPTIONS.map((option) => (
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
