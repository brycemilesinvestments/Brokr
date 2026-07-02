import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatCik, SEC_USER_AGENT } from "@/lib/edgar/constants";
import {
  companyFactsUrl,
  fetchJson,
  fetchText,
  filingIndexJsonUrl,
  resolveDocumentUrl,
  submissionsUrl,
} from "@/lib/edgar/endpoints";
import type { FilingDocument } from "@/lib/edgar/types";
import type {
  CompanyFactsResponse,
  EdgarSubmission,
  FilingRef,
} from "@/lib/edgar/types";
import { fetchFilingXbrl } from "@/lib/edgar/xbrl/fetch-filing-xbrl";
import type { FilingXbrlExtraction } from "@/lib/edgar/xbrl/types";

export const MIN_REQUEST_INTERVAL_MS = 110;
export const MAX_429_RETRIES = 5;
export const EDGAR_BUCKET = "edgar";

type SecSubmissionsResponse = {
  cik: string;
  name: string;
  filings: {
    recent: {
      accessionNumber: string[];
      form: string[];
      filingDate: string[];
      reportDate: string[];
      primaryDocument: string[];
      items?: string[];
    };
  };
};

export type EdgarClientOptions = {
  userAgent?: string;
  supabaseClient?: SupabaseClient;
  bucketName?: string;
  diskCacheDir?: string;
  minIntervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

function storagePath(cik: string | number, accession: string, filename: string): string {
  return `${formatCik(cik)}/${accession}/${filename}`;
}

/**
 * EdgarClient — throttled SEC EDGAR access with Supabase bucket + disk cache.
 * Respects SEC rate limit (≤9 req/s) and requires User-Agent header.
 */
export class EdgarClient {
  private userAgent: string;
  private supabaseClient?: SupabaseClient;
  private bucketName: string;
  private diskCacheDir: string;
  private minIntervalMs: number;
  private lastRequestAt = 0;
  private now: () => number;
  private sleep: (ms: number) => Promise<void>;

  constructor(options: EdgarClientOptions = {}) {
    this.userAgent = options.userAgent ?? SEC_USER_AGENT;
    if (!this.userAgent?.trim()) {
      throw new Error("SEC EDGAR User-Agent is required");
    }
    this.supabaseClient = options.supabaseClient;
    this.bucketName = options.bucketName ?? EDGAR_BUCKET;
    this.diskCacheDir = options.diskCacheDir ?? join(process.cwd(), ".cache", "edgar");
    this.minIntervalMs = options.minIntervalMs ?? MIN_REQUEST_INTERVAL_MS;
    this.now = options.now ?? (() => Date.now());
    this.sleep = options.sleep ?? defaultSleep;
  }

  getMinIntervalMs(): number {
    return this.minIntervalMs;
  }

  private async throttle(): Promise<void> {
    const elapsed = this.now() - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      await this.sleep(this.minIntervalMs - elapsed);
    }
    this.lastRequestAt = this.now();
  }

  private async fetchWithRetry(url: string, accept: string): Promise<Response> {
    let backoffMs = this.minIntervalMs;

    for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
      await this.throttle();

      const response = await fetch(url, {
        headers: {
          "User-Agent": this.userAgent,
          Accept: accept,
        },
      });

      if (response.status !== 429) {
        return response;
      }

      if (attempt === MAX_429_RETRIES) {
        return response;
      }

      await this.sleep(backoffMs);
      backoffMs *= 2;
    }

    throw new Error(`Failed to fetch ${url}`);
  }

  private diskCachePath(url: string): string {
    return join(this.diskCacheDir, hashUrl(url));
  }

  private async readDiskCache(url: string): Promise<string | null> {
    try {
      return await readFile(this.diskCachePath(url), "utf8");
    } catch {
      return null;
    }
  }

  private async writeDiskCache(url: string, content: string): Promise<void> {
    try {
      await mkdir(this.diskCacheDir, { recursive: true });
      await writeFile(this.diskCachePath(url), content, "utf8");
    } catch {
      // disk cache is best-effort
    }
  }

  private async readBucketCache(path: string): Promise<string | null> {
    if (!this.supabaseClient) return null;
    try {
      const { data, error } = await this.supabaseClient.storage
        .from(this.bucketName)
        .download(path);
      if (error || !data) return null;
      return data.text();
    } catch {
      return null;
    }
  }

  private async writeBucketCache(path: string, content: string, contentType: string): Promise<void> {
    if (!this.supabaseClient) return;
    try {
      await this.supabaseClient.storage.from(this.bucketName).upload(path, content, {
        contentType,
        upsert: true,
      });
    } catch {
      // bucket cache is best-effort
    }
  }

  async fetchJson<T>(url: string, options: { useCache?: boolean } = {}): Promise<T> {
    const useCache = options.useCache !== false;
    const cacheFilename = `${hashUrl(url)}.json`;

    if (useCache) {
      const bucketPath = storagePath("global", "json", cacheFilename);
      const fromBucket = await this.readBucketCache(bucketPath);
      if (fromBucket) {
        return JSON.parse(fromBucket) as T;
      }

      const fromDisk = await this.readDiskCache(url);
      if (fromDisk) {
        return JSON.parse(fromDisk) as T;
      }
    }

    const response = await this.fetchWithRetry(url, "application/json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }

    const text = await response.text();
    const parsed = JSON.parse(text) as T;

    if (useCache) {
      const bucketPath = storagePath("global", "json", cacheFilename);
      await this.writeBucketCache(bucketPath, text, "application/json");
      await this.writeDiskCache(url, text);
    }

    return parsed;
  }

  async fetchText(url: string, options: { useCache?: boolean; cik?: string; accession?: string; filename?: string } = {}): Promise<string> {
    const resolvedUrl = resolveDocumentUrl(url);
    const useCache = options.useCache !== false;

    if (useCache) {
      if (options.cik && options.accession && options.filename) {
        const bucketPath = storagePath(options.cik, options.accession, options.filename);
        const fromBucket = await this.readBucketCache(bucketPath);
        if (fromBucket) return fromBucket;
      }

      const fromDisk = await this.readDiskCache(resolvedUrl);
      if (fromDisk) return fromDisk;
    }

    const response = await this.fetchWithRetry(resolvedUrl, "text/html,application/xhtml+xml,*/*");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${resolvedUrl}`);
    }

    const text = await response.text();

    if (useCache) {
      if (options.cik && options.accession && options.filename) {
        const bucketPath = storagePath(options.cik, options.accession, options.filename);
        await this.writeBucketCache(bucketPath, text, "text/html");
      }
      await this.writeDiskCache(resolvedUrl, text);
    }

    return text;
  }

  async getCompanyFacts(cik: string | number): Promise<CompanyFactsResponse> {
    return this.fetchJson<CompanyFactsResponse>(companyFactsUrl(cik));
  }

  async getSubmissions(cik: string | number): Promise<EdgarSubmission> {
    const data = await this.fetchJson<SecSubmissionsResponse>(submissionsUrl(cik));
    const recent = data.filings.recent;
    const filings: FilingRef[] = [];

    for (let i = 0; i < recent.accessionNumber.length; i++) {
      filings.push({
        cik: formatCik(cik),
        accessionNumber: recent.accessionNumber[i],
        form: recent.form[i],
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate[i] || undefined,
        primaryDocument: recent.primaryDocument[i] || undefined,
        items: recent.items?.[i] || undefined,
      });
    }

    return {
      cik: formatCik(data.cik ?? cik),
      entityName: data.name,
      filings,
    };
  }

  async getFilingSummary(cik: string | number, accessionNumber: string): Promise<Record<string, unknown>> {
    return this.fetchJson<Record<string, unknown>>(filingIndexJsonUrl(cik, accessionNumber));
  }

  async fetchFilingXbrl(
    cik: number | string,
    accessionNumber: string,
    documents: FilingDocument[],
    options: { documentName?: string; useCache?: boolean } = {},
  ): Promise<FilingXbrlExtraction> {
    const useCache = options.useCache !== false;
    const cacheKey = storagePath(cik, accessionNumber, "xbrl-extraction.json");

    if (useCache && this.supabaseClient) {
      const cached = await this.readBucketCache(cacheKey);
      if (cached) {
        return JSON.parse(cached) as FilingXbrlExtraction;
      }
    }

    const client = this;
    const result = await fetchFilingXbrl(cik, accessionNumber, documents, {
      documentName: options.documentName,
      fetchMarkup: async (url, doc) => {
        return client.fetchText(url, {
          useCache,
          cik: String(cik),
          accession: accessionNumber,
          filename: doc.documentName,
        });
      },
    });

    if (useCache) {
      await this.writeBucketCache(cacheKey, JSON.stringify(result), "application/json");
    }

    return result;
  }
}

export function createEdgarClient(options?: EdgarClientOptions): EdgarClient {
  return new EdgarClient(options);
}
