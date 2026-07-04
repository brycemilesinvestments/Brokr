"use client";

import { useCallback, useState } from "react";
import type { RagChatMessage, RagChatResponse } from "../types";

export function useRagChat(cik: string) {
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

  return {
    messages,
    input,
    setInput,
    loading,
    error,
    send,
  };
}
