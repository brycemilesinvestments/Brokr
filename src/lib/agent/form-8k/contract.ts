import type { Form8kClassification } from "@/lib/agent/form-8k/types";

export function isForm8kClassification(value: unknown): value is Form8kClassification {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.accessionNumber === "string" &&
    Array.isArray(obj.declaredItems) &&
    Array.isArray(obj.inferredItems) &&
    typeof obj.primaryEventType === "string" &&
    typeof obj.confidence === "string"
  );
}
