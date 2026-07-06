const inflightByKey = new Map<string, Promise<unknown>>();

/** Coalesce concurrent analyze requests for the same document on this server instance. */
export function runInflightAnalyze<T>(key: string, task: () => Promise<T>): Promise<T> {
  const pending = inflightByKey.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const work = task().finally(() => {
    if (inflightByKey.get(key) === work) {
      inflightByKey.delete(key);
    }
  });

  inflightByKey.set(key, work);
  return work;
}
