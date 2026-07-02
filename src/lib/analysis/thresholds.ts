export type ThresholdConfig = {
  grossMarginSwing: number;
  revenueYoYSwing: number;
  netMarginFloor: number;
};

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  grossMarginSwing: 0.3,
  revenueYoYSwing: 1.0,
  netMarginFloor: 0,
};

export function exceedsThreshold(value: number, threshold: number): boolean {
  return Math.abs(value) >= threshold;
}

export function isBelowFloor(value: number | undefined, floor: number): boolean {
  if (value === undefined) return false;
  return value < floor;
}
