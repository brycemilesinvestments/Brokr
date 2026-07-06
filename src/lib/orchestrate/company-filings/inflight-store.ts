const inflightByKey = new Map<string, Promise<unknown>>();

/** Coalesce concurrent store requests for the same accession on this server instance. */
export function runInflightStore<T>(key: string, task: () => Promise<T>): Promise<T> {
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
