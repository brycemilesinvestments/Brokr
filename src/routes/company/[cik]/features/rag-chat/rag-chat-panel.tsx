"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RagChatMessage, RagChatPanelProps, RagChatResponse } from "./types";

function citationHref(cik: string, accession: string) {
  const normalized = accession.replace(/-/g, "");
  return `/company/${cik}/filing/${normalized}`;
}

export function RagChatPanel({ cik, companyName }: RagChatPanelProps) {
  const [messages, setMessages] = useState<RagChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;

    const userMessage: RagChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/company/${cik}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const payload = (await response.json()) as RagChatResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Chat request failed");
      }

      const assistantMessage: RagChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: payload.answer,
        citations: payload.citations,
        refused: payload.refused,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }, [cik, input, loading]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-5">
        <h2 className="text-lg font-semibold text-zinc-900">Ask filings</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Grounded answers from {companyName ?? "this company"}&apos;s SEC filings — numbers from
          structured metrics, narrative with citations.
        </p>
      </div>

      <div className="flex h-[28rem] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Try: &quot;What was Q3 revenue?&quot; or &quot;What risks did management disclose?&quot;
            </p>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-8 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
                  : "mr-8 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800"
              }
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.citations && message.citations.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-zinc-200 pt-2 text-xs text-zinc-600">
                  {message.citations.map((citation, index) => (
                    <li key={`${citation.accession}-${index}`}>
                      <a
                        href={citationHref(cik, citation.accession)}
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        {citation.sectionType}
                      </a>
                      {citation.periodEnd ? ` · ${citation.periodEnd}` : ""}
                      {citation.claim ? ` — ${citation.claim}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}

          {loading ? (
            <p className="text-sm text-zinc-500">Searching filings and assembling context…</p>
          ) : null}

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>

        <form
          className="border-t border-zinc-100 px-6 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about this company's filings…"
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              Send
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
