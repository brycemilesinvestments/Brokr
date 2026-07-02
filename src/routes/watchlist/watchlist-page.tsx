"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { StructuredAlert, WatchlistEntry } from "@/lib/watchlist/types";

type EvaluateOutput = {
  alerts: StructuredAlert[];
  newSeenAccessions: Record<string, string[]>;
  newFiredEventKeys: string[];
};

export function WatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [cikInput, setCikInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [alerts, setAlerts] = useState<StructuredAlert[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/watchlist");
      const payload = (await response.json()) as WatchlistEntry[];
      if (!response.ok) throw new Error("Failed to load watchlist");
      setEntries(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function addEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cik = cikInput.trim();
    if (!cik) return;

    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cik,
        triggerConfig: {
          triggers: [
            { kind: "new_filing" },
            { kind: "threshold", metric: "net_margin", operator: "lt", value: 0 },
            { kind: "insider_purchase" },
          ],
        },
      }),
    });

    if (!response.ok) {
      setError("Failed to save watchlist entry (is Supabase configured?)");
      return;
    }

    setCikInput("");
    await loadEntries();
  }

  async function removeEntry(cik: string) {
    await fetch(`/api/watchlist?cik=${encodeURIComponent(cik)}`, { method: "DELETE" });
    await loadEntries();
  }

  async function evaluateNow() {
    setEvaluating(true);
    setError(null);
    try {
      const response = await fetch("/api/watchlist/evaluate", { method: "POST" });
      const payload = (await response.json()) as EvaluateOutput & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Evaluation failed");
      setAlerts(payload.alerts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold text-emerald-700">
            ← Edgar Review
          </Link>
          <span className="text-xs uppercase tracking-wide text-zinc-500">Watchlist</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-zinc-900">Company watchlist</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Monitor new filings, metric thresholds, and open-market insider purchases.
          </p>

          <form className="mt-6 flex gap-2" onSubmit={(e) => void addEntry(e)}>
            <input
              value={cikInput}
              onChange={(e) => setCikInput(e.target.value)}
              placeholder="CIK (e.g. 0000320193)"
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <Button type="submit">Add</Button>
            <Button type="button" variant="outline" disabled={evaluating} onClick={() => void evaluateNow()}>
              {evaluating ? "Evaluating…" : "Run check"}
            </Button>
          </form>

          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Entries</h2>
          {loading ? (
            <p className="mt-4 text-sm text-zinc-500">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No companies on the watchlist yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {entries.map((entry) => (
                <li
                  key={entry.cik}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 px-4 py-3"
                >
                  <div>
                    <Link href={`/company/${entry.cik}`} className="font-medium text-emerald-700 hover:underline">
                      CIK {entry.cik}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {entry.triggerConfig.triggers.length} trigger(s)
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void removeEntry(entry.cik)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {alerts.length > 0 ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Latest alerts</h2>
            <ul className="mt-4 space-y-2">
              {alerts.map((alert) => (
                <li key={alert.eventKey} className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <span className="font-medium uppercase">{alert.type}</span> · CIK {alert.cik}
                  {"accessionNumber" in alert ? ` · ${alert.accessionNumber}` : ""}
                  {"metric" in alert ? ` · ${alert.metric}=${alert.value}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
