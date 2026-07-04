import type { RagChatMessage } from "../types";
import { citationHref } from "../utils/citation-href";
import { formatCitationLabel } from "../utils/format-citation-label";

type ChatMessageBubbleProps = {
  cik: string;
  message: RagChatMessage;
};

export function ChatMessageBubble({ cik, message }: ChatMessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="max-w-[82%] self-end rounded-xl rounded-br-sm bg-emerald-600 px-3 py-2.5 text-xs leading-relaxed text-white">
        {message.content}
      </div>
    );
  }

  return (
    <div className="max-w-[82%] self-start rounded-xl rounded-bl-sm border border-zinc-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-zinc-700">
      <p className="whitespace-pre-wrap">{message.content}</p>
      {message.citations && message.citations.length > 0 ? (
        <p className="mt-1.5">
          {message.citations.map((citation, index) => (
            <span key={`${citation.accession}-${index}`}>
              {index > 0 ? " " : null}
              <a
                href={citationHref(cik, citation.accession)}
                className="font-semibold text-emerald-600 hover:underline"
              >
                {formatCitationLabel(citation)}
              </a>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
