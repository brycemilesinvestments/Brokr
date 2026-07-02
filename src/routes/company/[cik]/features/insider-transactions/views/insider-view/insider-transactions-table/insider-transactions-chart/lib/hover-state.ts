import type { ChartGeometry, HoverState, SnapPoint } from "../types";
import { findLineValueAtSnap } from "../utils/svg-coords";

export function buildHoverState(geometry: ChartGeometry, snap: SnapPoint): HoverState {
  const entries: HoverState["entries"] = [];

  for (const line of geometry.lines) {
    const match = findLineValueAtSnap(line, snap);
    if (!match) continue;
    entries.push({ label: line.label, color: line.color, value: match.value });
  }

  return { x: snap.x, date: snap.date, time: snap.time, entries };
}
