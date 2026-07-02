export function formatBytes(size?: string): string {
  if (!size || size === "\u00a0" || size === "&nbsp;") return "—";
  const bytes = Number(size.replace(/,/g, ""));
  if (Number.isNaN(bytes)) return size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
