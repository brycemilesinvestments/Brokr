"use client";

import { use } from "react";

export type RechartsModule = typeof import("recharts");

const rechartsPromise: Promise<RechartsModule> = import("recharts");

export function useRecharts(): RechartsModule {
  return use(rechartsPromise);
}
