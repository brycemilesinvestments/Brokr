/**
 * Pure scoring utilities — no I/O, deterministic, FREE layer.
 * Used by all five sub-score calculators.
 */

/** A breakpoint mapping an input value to an output score (0–100). */
export type Breakpoint = readonly [input: number, score: number];

/**
 * Piecewise-linear interpolation between breakpoints.
 * Breakpoints must be sorted ascending by input value.
 * Returns the score clamped to [0, 100].
 *
 * Determinism layer 1: pure function, no randomness, no external I/O.
 */
export function piecewiseScore(value: number, breakpoints: readonly Breakpoint[]): number {
  if (breakpoints.length === 0) return 50;

  const first = breakpoints[0];
  const last = breakpoints[breakpoints.length - 1];

  if (value <= first[0]) return Math.max(0, Math.min(100, first[1]));
  if (value >= last[0]) return Math.max(0, Math.min(100, last[1]));

  for (let i = 0; i < breakpoints.length - 1; i++) {
    const [x0, y0] = breakpoints[i];
    const [x1, y1] = breakpoints[i + 1];
    if (value >= x0 && value <= x1) {
      const t = (value - x0) / (x1 - x0);
      const score = y0 + t * (y1 - y0);
      return Math.max(0, Math.min(100, score));
    }
  }

  return 50;
}

/**
 * Weighted average of (score, weight) pairs, skipping undefined scores.
 * If all weights are zero or no pairs provided, returns 50 (neutral).
 *
 * Determinism layer 2: order-independent (weights are explicit).
 */
export function weightedAverage(pairs: ReadonlyArray<readonly [score: number | undefined, weight: number]>): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [score, weight] of pairs) {
    if (score !== undefined && weight > 0) {
      weightedSum += score * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 50;
  return Math.max(0, Math.min(100, weightedSum / totalWeight));
}

/**
 * Clamp a value to [0, 100] and round to two decimal places.
 * Determinism layer 3: no floating-point accumulation drift across calls.
 */
export function clampScore(score: number): number {
  return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100;
}
