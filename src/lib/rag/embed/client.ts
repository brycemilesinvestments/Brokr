import { VOYAGE_EMBEDDING_MODEL } from "@/lib/rag/constants";
import { embedTextLocal } from "@/lib/rag/embed/local-embed";

export type EmbeddingInputType = "document" | "query";

export type EmbeddingClient = {
  embed(text: string, inputType?: EmbeddingInputType): Promise<number[]>;
  embedBatch(texts: string[], inputType?: EmbeddingInputType): Promise<number[][]>;
};

export type EmbeddingClientOptions = {
  fetchFn?: typeof fetch;
  apiKey?: string;
  model?: string;
};

export function createLocalEmbeddingClient(): EmbeddingClient {
  return {
    async embed(text: string) {
      return embedTextLocal(text);
    },
    async embedBatch(texts: string[]) {
      return texts.map(embedTextLocal);
    },
  };
}

/** Voyage finance embeddings for SEC filing RAG (VOYAGE_API_KEY). */
export function createEmbeddingClient(options: EmbeddingClientOptions = {}): EmbeddingClient {
  const apiKey = options.apiKey ?? process.env.VOYAGE_API_KEY;
  const fetchFn = options.fetchFn ?? fetch;
  const model = options.model ?? process.env.VOYAGE_EMBEDDING_MODEL ?? VOYAGE_EMBEDDING_MODEL;

  if (!apiKey) {
    return createLocalEmbeddingClient();
  }

  return {
    async embed(text: string, inputType: EmbeddingInputType = "query") {
      const [vector] = await embedViaVoyage([text], apiKey, fetchFn, model, inputType);
      return vector;
    },
    async embedBatch(texts: string[], inputType: EmbeddingInputType = "document") {
      return embedViaVoyage(texts, apiKey, fetchFn, model, inputType);
    },
  };
}

async function embedViaVoyage(
  texts: string[],
  apiKey: string,
  fetchFn: typeof fetch,
  model: string,
  inputType: EmbeddingInputType,
): Promise<number[][]> {
  const response = await fetchFn("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    throw new Error(`Voyage embedding error (${response.status})`);
  }

  const payload = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  return payload.data.map((row) => row.embedding);
}
