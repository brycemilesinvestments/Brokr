"use client";

import { useState } from "react";
import {
  NET_POSITION_BAR_HEIGHT,
  NET_POSITION_BODY_HEIGHT_CLASS,
  NET_POSITION_COLORS,
} from "../constants";
import { buildNetPositionGeometry } from "../lib/build-net-position-geometry";
import type { NetPositionRow } from "../types";
import { formatNetShares } from "../utils/format-net-shares";
import { NetInsiderPositionDetailPanel } from "./net-insider-position-detail-panel";

type NetInsiderPositionChartProps = {
  rows: NetPositionRow[];
};

const NAME_COLUMN_CLASS = "w-[min(180px,28%)] shrink-0";
const VALUE_COLUMN_CLASS = "w-14 shrink-0 text-right";

export function NetInsiderPositionChart({ rows }: NetInsiderPositionChartProps) {
  const bars = buildNetPositionGeometry(rows);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);

  const selectedBar = bars.find((bar) => bar.owner === selectedOwner) ?? null;

  if (rows.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-sm text-zinc-500">
        No net insider activity in this range.
      </p>
    );
  }

  function toggleOwner(owner: string) {
    setSelectedOwner((current) => (current === owner ? null : owner));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className={`flex min-h-0 ${NET_POSITION_BODY_HEIGHT_CLASS}`}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="shrink-0 px-6 pt-[22px] pb-1">
            <div className="font-mono text-[10.5px] font-semibold tracking-[0.09em] text-emerald-600 uppercase">
              Net insider position
            </div>
            <h3 className="mt-1.5 text-[17px] font-semibold text-zinc-900">
              Who moved, and which way
            </h3>
            <div className="mt-3.5 flex items-center gap-3">
              <div className={NAME_COLUMN_CLASS} aria-hidden />
              <div className="flex min-w-0 flex-1 items-center justify-between">
                <span className="font-mono text-[9px] font-semibold tracking-[0.05em] text-red-600 uppercase">
                  ← Disposed
                </span>
                <span className="font-mono text-[9px] font-semibold tracking-[0.05em] text-emerald-700 uppercase">
                  Acquired →
                </span>
              </div>
              <div className={VALUE_COLUMN_CLASS} aria-hidden />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-1.5 pb-2.5">
            {bars.map((bar) => {
              const isSelected = selectedOwner === bar.owner;
              const color =
                bar.direction === "acquired"
                  ? NET_POSITION_COLORS.acquired
                  : NET_POSITION_COLORS.disposed;
              const barWidthPercent = bar.barHalfFraction * 50;

              return (
                <button
                  key={bar.owner}
                  type="button"
                  onClick={() => toggleOwner(bar.owner)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center gap-3 px-6 py-2 text-left transition-colors ${
                    isSelected ? "bg-emerald-50/80" : "hover:bg-zinc-50"
                  }`}
                >
                  <div className={`${NAME_COLUMN_CLASS} min-w-0`}>
                    <div className="truncate text-xs font-semibold leading-tight text-zinc-900">
                      {bar.owner}
                    </div>
                    {bar.ownerType ? (
                      <div className="truncate text-[10px] leading-snug text-zinc-400">
                        {bar.ownerType}
                      </div>
                    ) : null}
                  </div>

                  <div className="relative h-[22px] min-w-0 flex-1" aria-hidden>
                    <div className="absolute top-px bottom-px left-1/2 w-px -translate-x-1/2 bg-zinc-300" />
                    {bar.barHalfFraction > 0 ? (
                      <div
                        className="absolute rounded-[3px]"
                        style={{
                          top: 5,
                          height: NET_POSITION_BAR_HEIGHT,
                          width: `${barWidthPercent}%`,
                          left: bar.direction === "acquired" ? "50%" : undefined,
                          right: bar.direction === "disposed" ? "50%" : undefined,
                          backgroundColor: color,
                        }}
                      />
                    ) : null}
                  </div>

                  <div
                    className={`${VALUE_COLUMN_CLASS} font-mono text-[10.5px] font-semibold`}
                    style={{ color }}
                  >
                    {formatNetShares(bar.netShares)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedBar ? (
          <NetInsiderPositionDetailPanel
            bar={selectedBar}
            onClose={() => setSelectedOwner(null)}
          />
        ) : null}
      </div>

      <div className="shrink-0 border-t border-zinc-100 px-6 py-3 text-[11px] leading-relaxed text-zinc-400">
        Bar length = net shares (log-scaled). Green = net acquirer, red = net seller. Officers
        show large green from performance-share grants; directors&apos; reds are gifts and
        open-market sales. Click a row to open transaction details.
      </div>
    </div>
  );
}
