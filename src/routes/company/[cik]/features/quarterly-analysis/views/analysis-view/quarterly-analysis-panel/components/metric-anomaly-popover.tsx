"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AnomalyExplanation, CrossLayerAnomaly } from "@/lib/orchestrate";
import { cn } from "@/lib/utils";
import { explanationForAnomaly } from "../lib/metric-anomalies";

type MetricAnomalyPopoverProps = {
  anomalies: CrossLayerAnomaly[];
  explanations: AnomalyExplanation[];
};

const LAYER_STYLES: Record<string, string> = {
  fundamentals: "bg-blue-100 text-blue-800",
  valuation: "bg-violet-100 text-violet-800",
  insider: "bg-amber-100 text-amber-800",
  cross_layer: "bg-red-100 text-red-800",
};

const CONFIDENCE_STYLES = {
  high: "text-emerald-700",
  medium: "text-amber-700",
  low: "text-zinc-500",
} as const;

function AnomalyExplanationBlock({ item }: { item: AnomalyExplanation }) {
  if (item.explanation.refused) {
    return <p className="mt-2 text-xs text-zinc-500">Explanation refused by AI policy.</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {item.explanation.explanations.map((entry) => (
        <li key={`${entry.category}-${entry.summary.slice(0, 32)}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium capitalize text-emerald-800">
              {entry.category.replace(/_/g, " ")}
            </span>
            <span
              className={cn(
                "text-[10px] font-medium capitalize",
                CONFIDENCE_STYLES[entry.confidence],
              )}
            >
              {entry.confidence} confidence
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-700">{entry.summary}</p>
        </li>
      ))}
    </ul>
  );
}

function AnomalyDetail({ anomaly, explanation }: { anomaly: CrossLayerAnomaly; explanation?: AnomalyExplanation }) {
  return (
    <li className="rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10px] text-zinc-600">{anomaly.date}</span>
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium capitalize text-rose-800">
          {anomaly.type.replace(/_/g, " ")}
        </span>
        {anomaly.layers.map((layer) => (
          <span
            key={layer}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
              LAYER_STYLES[layer] ?? "bg-zinc-100 text-zinc-700",
            )}
          >
            {layer.replace(/_/g, " ")}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-zinc-700">{anomaly.description}</p>
      <p className="mt-1 text-[10px] text-zinc-500">
        Magnitude {(anomaly.magnitude * 100).toFixed(1)}%
      </p>
      {explanation?.excerpt ? (
        <p className="mt-2 rounded-md bg-white/80 px-2.5 py-2 text-[10px] leading-5 text-zinc-600">
          {explanation.excerpt}
        </p>
      ) : null}
      {explanation ? <AnomalyExplanationBlock item={explanation} /> : null}
    </li>
  );
}

export function MetricAnomalyPopover({ anomalies, explanations }: MetricAnomalyPopoverProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (anomalies.length === 0) {
    return null;
  }

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${anomalies.length} anomal${anomalies.length === 1 ? "y" : "ies"} flagged — view details`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-md transition-colors",
          open
            ? "bg-rose-100 text-rose-700"
            : "text-rose-600 hover:bg-rose-50 hover:text-rose-700",
        )}
      >
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 1.2 1.4 13.5h13.2L8 1.2zm0 3.2.9 5.4H7.1L8 4.4zM7.25 11.5h1.5v1.5h-1.5v-1.5z"
          />
        </svg>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Anomaly details"
          className="absolute left-0 top-[calc(100%+6px)] z-20 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-zinc-200 bg-white p-3 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-rose-600">
            Flagged anomal{anomalies.length === 1 ? "y" : "ies"}
          </p>
          <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
            {anomalies.map((anomaly) => (
              <AnomalyDetail
                key={anomaly.id}
                anomaly={anomaly}
                explanation={explanationForAnomaly(anomaly.id, explanations)}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </span>
  );
}
