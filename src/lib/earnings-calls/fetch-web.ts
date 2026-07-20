import { BROKR_USER_AGENT } from "@/lib/earnings-calls/constants";

export type FetchWebOptions = {
  signal?: AbortSignal;
  accept?: string;
  timeoutMs?: number;
};

export async function fetchWebPage(
  url: string,
  options: FetchWebOptions = {},
): Promise<{ url: string; html: string; contentType: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);

  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROKR_USER_AGENT,
        Accept: options.accept ?? "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    const html = await response.text();
    return {
      url: response.url,
      html,
      contentType: response.headers.get("content-type"),
    };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}
