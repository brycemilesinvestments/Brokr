import { SEC_USER_AGENT } from "@/lib/edgar/constants";

/** SEC fair access allows 10 req/s per IP; target 8 req/s for headroom. */
export const SEC_MIN_REQUEST_INTERVAL_MS = 125;

const SEC_MAX_RATE_LIMIT_RETRIES = 8;

const RATE_LIMIT_STATUSES = new Set([403, 429]);
const INITIAL_RATE_LIMIT_BACKOFF_MS = 1_000;
const MAX_RATE_LIMIT_BACKOFF_MS = 60_000;

export type SecRequestQueueOptions = {
  minIntervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

type FetchSecOptions = RequestInit & {
  userAgent?: string;
  maxRetries?: number;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveUserAgent(userAgent?: string): string {
  const agent = userAgent ?? SEC_USER_AGENT;
  if (!agent.trim()) {
    throw new Error("SEC EDGAR User-Agent is required (set EDGAR_USER_AGENT or SEC_EDGAR_USER_AGENT)");
  }
  return agent;
}

export function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;

  const seconds = Number(header);
  if (!Number.isNaN(seconds)) {
    return Math.max(seconds * 1_000, 0);
  }

  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) {
    return Math.max(dateMs - Date.now(), 0);
  }

  return null;
}

class SecRequestQueue {
  private lastRequestAt = 0;
  private chain: Promise<void> = Promise.resolve();
  private readonly minIntervalMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: SecRequestQueueOptions = {}) {
    this.minIntervalMs = options.minIntervalMs ?? SEC_MIN_REQUEST_INTERVAL_MS;
    this.now = options.now ?? (() => Date.now());
    this.sleep = options.sleep ?? defaultSleep;
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(task);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async waitForSlot(): Promise<void> {
    const elapsed = this.now() - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      await this.sleep(this.minIntervalMs - elapsed);
    }
    this.lastRequestAt = this.now();
  }
}

let queueInstance: SecRequestQueue | null = null;

export function getSecRequestQueue(options?: SecRequestQueueOptions): SecRequestQueue {
  if (options) {
    queueInstance = new SecRequestQueue(options);
    return queueInstance;
  }

  if (!queueInstance) {
    queueInstance = new SecRequestQueue();
  }

  return queueInstance;
}

export function resetSecRequestQueue(): void {
  queueInstance = null;
}

async function fetchSecWithRetry(url: string, options: FetchSecOptions): Promise<Response> {
  const { userAgent, maxRetries = SEC_MAX_RATE_LIMIT_RETRIES, ...init } = options;
  const agent = resolveUserAgent(userAgent);
  const queue = getSecRequestQueue();
  let backoffMs = INITIAL_RATE_LIMIT_BACKOFF_MS;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await queue.waitForSlot();

    const response = await fetch(url, {
      ...init,
      headers: {
        "User-Agent": agent,
        ...init.headers,
      },
    });

    if (!RATE_LIMIT_STATUSES.has(response.status)) {
      return response;
    }

    if (attempt === maxRetries) {
      return response;
    }

    const retryAfterMs = parseRetryAfterMs(response.headers.get("Retry-After"));
    const delayMs = retryAfterMs ?? backoffMs;
    await defaultSleep(delayMs);
    backoffMs = Math.min(backoffMs * 2, MAX_RATE_LIMIT_BACKOFF_MS);
  }

  throw new Error(`Failed to fetch ${url}`);
}

/**
 * Rate-limited fetch for all SEC EDGAR traffic. Serializes requests process-wide
 * and retries on HTTP 403/429 per SEC fair access policy.
 */
export async function fetchSec(url: string, options: FetchSecOptions = {}): Promise<Response> {
  return getSecRequestQueue().enqueue(() => fetchSecWithRetry(url, options));
}
