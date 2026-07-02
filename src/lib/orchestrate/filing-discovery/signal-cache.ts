import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EDGAR_BUCKET } from "@/lib/edgar/client";
import { formatCik } from "@/lib/edgar/constants";
import type { QualitativeSignals } from "@/lib/ai/qualitative-types";

const CACHE_FILENAME = "qualitative-signals.json";

function storagePath(cik: string, accession: string): string {
  return `${formatCik(cik)}/${accession}/${CACHE_FILENAME}`;
}

export type SignalCache = {
  read(cik: string, accession: string): Promise<QualitativeSignals | null>;
  write(cik: string, accession: string, signals: QualitativeSignals): Promise<void>;
};

export function createSignalCache(options: {
  supabaseClient?: SupabaseClient;
  diskCacheDir?: string;
  bucketName?: string;
}): SignalCache {
  const bucketName = options.bucketName ?? EDGAR_BUCKET;
  const diskCacheDir = options.diskCacheDir ?? join(process.cwd(), ".cache", "edgar");

  async function readDisk(cik: string, accession: string): Promise<QualitativeSignals | null> {
    try {
      const path = join(diskCacheDir, formatCik(cik), accession, CACHE_FILENAME);
      const raw = await readFile(path, "utf8");
      return JSON.parse(raw) as QualitativeSignals;
    } catch {
      return null;
    }
  }

  async function writeDisk(
    cik: string,
    accession: string,
    signals: QualitativeSignals,
  ): Promise<void> {
    const dir = join(diskCacheDir, formatCik(cik), accession);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, CACHE_FILENAME), JSON.stringify(signals, null, 2));
  }

  return {
    async read(cik, accession) {
      if (options.supabaseClient) {
        const { data, error } = await options.supabaseClient.storage
          .from(bucketName)
          .download(storagePath(cik, accession));
        if (!error && data) {
          const text = await data.text();
          return JSON.parse(text) as QualitativeSignals;
        }
      }
      return readDisk(cik, accession);
    },

    async write(cik, accession, signals) {
      const payload = JSON.stringify(signals);
      if (options.supabaseClient) {
        await options.supabaseClient.storage
          .from(bucketName)
          .upload(storagePath(cik, accession), payload, {
            contentType: "application/json",
            upsert: true,
          });
      }
      await writeDisk(cik, accession, signals);
    },
  };
}
