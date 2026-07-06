export type PipelineRunOptions = {
  signal?: AbortSignal | null;
};

export class ClientDisconnectedError extends Error {
  constructor() {
    super("Client disconnected");
    this.name = "ClientDisconnectedError";
  }
}

export function throwIfAborted(signal?: AbortSignal | null): void {
  if (signal?.aborted) {
    throw new ClientDisconnectedError();
  }
}

export function isClientDisconnected(error: unknown): boolean {
  return error instanceof ClientDisconnectedError;
}
