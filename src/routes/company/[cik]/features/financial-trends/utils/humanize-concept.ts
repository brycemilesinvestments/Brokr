export function humanizeConcept(concept: string): string {
  return concept
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Noncurrent/g, "Non-current")
    .replace(/Earnings Per Share/g, "EPS");
}
