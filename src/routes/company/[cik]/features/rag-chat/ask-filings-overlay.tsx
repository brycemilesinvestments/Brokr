"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChatMessageBubble } from "./components/chat-message-bubble";
import { useRagChat } from "./hooks/use-rag-chat";
import { countIndexedFilings } from "./lib/count-indexed-filings";

type AskFilingsOverlayProps = {
  cik: string;
  companyName: string;
  ticker?: string;
  filings: Array<{ type: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.2V16H6.5A2.5 2.5 0 0 1 4 13.5z" />
      <line x1="8.5" y1="9" x2="15.5" y2="9" />
      <line x1="8.5" y1="12" x2="13" y2="12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <line x1="8" y1="13" x2="8" y2="3" />
      <polyline points="4 6.5 8 2.8 12 6.5" />
    </svg>
  );
}

function buildWelcomeMessage(companyName: string): string {
  const possessive = companyName.endsWith("s") ? `${companyName}'` : `${companyName}'s`;
  return `Ask anything about ${possessive} 10-K, 8-K and proxy filings. I'll cite the exact passage.`;
}

export function AskFilingsOverlay({
  cik,
  companyName,
  ticker,
  filings,
  open: openProp,
  onOpenChange,
}: AskFilingsOverlayProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;

  function setOpen(nextOpen: boolean) {
    if (onOpenChange) {
      onOpenChange(nextOpen);
      return;
    }
    setInternalOpen(nextOpen);
  }
  const inputId = useId();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, input, setInput, loading, error, send } = useRagChat(cik);

  const indexedCount = countIndexedFilings(filings);
  const subtitle = [
    ticker,
    `${indexedCount} document${indexedCount === 1 ? "" : "s"} indexed`,
  ]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  function handleSend() {
    void send();
  }

  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3.5">
      {open ? (
        <dialog
          open
          aria-label="Ask filings"
          className="pointer-events-auto fixed right-6 bottom-[calc(1.5rem+3.5rem+3.5rem)] m-0 flex h-[428px] w-[330px] flex-col overflow-hidden rounded-[18px] border border-zinc-200 bg-white p-0 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.32)]"
          onClose={() => setOpen(false)}
        >
          <div className="flex items-center gap-2.5 bg-emerald-600 px-4 py-3.5 text-white">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-white/20">
              <ChatIcon className="h-[15px] w-[15px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold">Ask filings</div>
              <div className="truncate text-[10px] opacity-85">{subtitle}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-md bg-white/15 text-[15px] leading-none text-white transition hover:bg-white/25"
              aria-label="Close ask filings"
            >
              ×
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-zinc-50 p-4">
            <div className="max-w-[82%] self-start rounded-xl rounded-bl-sm border border-zinc-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-zinc-700">
              {buildWelcomeMessage(companyName)}
            </div>

            {messages.map((message) => (
              <ChatMessageBubble key={message.id} cik={cik} message={message} />
            ))}

            {loading ? (
              <p className="text-xs text-zinc-500">Searching filings and assembling context…</p>
            ) : null}

            {error ? <p className="text-xs text-red-700">{error}</p> : null}

            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2.5">
            <label htmlFor={inputId} className="sr-only">
              Ask a question about this company&apos;s filings
            </label>
            <input
              id={inputId}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question…"
              disabled={loading}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
              className="h-[34px] flex-1 rounded-[10px] border border-zinc-200 bg-zinc-100 px-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white disabled:opacity-60"
            />
            <button
              type="button"
              disabled={loading || !input.trim()}
              onClick={handleSend}
              className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send question"
            >
              <SendIcon />
            </button>
          </div>
        </dialog>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="pointer-events-auto flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_10px_26px_-6px_rgba(5,150,105,0.6)] transition hover:bg-emerald-700"
        aria-label={open ? "Close ask filings" : "Open ask filings"}
        aria-expanded={open}
      >
        <ChatIcon />
      </button>
    </div>
  );
}
