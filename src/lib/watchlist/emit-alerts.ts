import type { AlertEmitter, StructuredAlert } from "@/lib/watchlist/types";

/**
 * W6 — Deliver structured alerts through the injected channel.
 *
 * Delivery is sequential to preserve ordering. If any emitter calls throw,
 * the errors are collected and re-thrown as an AggregateError after all
 * alerts have been attempted (no early abort).
 *
 * The emitter is injected by the caller, making this delivery-agnostic
 * (email, webhook, in-app notification, test spy, etc.).
 */
export async function emitAlerts(
  alerts: StructuredAlert[],
  emitter: AlertEmitter,
): Promise<void> {
  const outcomes = await Promise.allSettled(alerts.map((alert) => emitter(alert)));
  const errors = outcomes
    .filter((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected")
    .map((outcome) => outcome.reason);

  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `${errors.length} of ${alerts.length} alert(s) failed delivery`,
    );
  }
}
