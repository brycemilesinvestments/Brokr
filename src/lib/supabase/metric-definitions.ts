import { createAdminClient } from "@/lib/supabase/admin";
import type { MetricPolarityDefinition } from "@/lib/metrics/polarity/types";

export type MetricDefinitionRow = {
  id: number;
  metric_key: string;
  display_name: string;
  polarity: MetricPolarityDefinition["polarity"];
  category: string | null;
  reasoning: string | null;
  classified_by: MetricPolarityDefinition["classifiedBy"];
  model: string | null;
  classified_at: string;
};

function rowToDefinition(row: MetricDefinitionRow): MetricPolarityDefinition {
  return {
    metricKey: row.metric_key,
    displayName: row.display_name,
    polarity: row.polarity,
    category: row.category ?? undefined,
    reasoning: row.reasoning ?? undefined,
    classifiedBy: row.classified_by,
  };
}

export async function getMetricDefinitionsByKeys(
  metricKeys: string[],
): Promise<MetricPolarityDefinition[]> {
  if (metricKeys.length === 0) return [];

  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("financial_metric_definitions")
    .select("*")
    .in("metric_key", metricKeys);

  if (error || !data) return [];

  return (data as MetricDefinitionRow[]).map(rowToDefinition);
}

export async function upsertMetricDefinitions(
  definitions: Array<
    MetricPolarityDefinition & {
      model?: string;
    }
  >,
): Promise<MetricPolarityDefinition[]> {
  if (definitions.length === 0) return [];

  const supabase = createAdminClient();
  if (!supabase) return definitions;

  const rows = definitions.map((definition) => ({
    metric_key: definition.metricKey,
    display_name: definition.displayName,
    polarity: definition.polarity,
    category: definition.category ?? null,
    reasoning: definition.reasoning ?? null,
    classified_by: definition.classifiedBy,
    model: definition.model ?? null,
    classified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("financial_metric_definitions")
    .upsert(rows, { onConflict: "metric_key" })
    .select("*");

  if (error || !data) return definitions;

  return (data as MetricDefinitionRow[]).map(rowToDefinition);
}

export async function linkStructuredMetricsToDefinitions(
  metricKeys: string[],
): Promise<void> {
  if (metricKeys.length === 0) return;

  const supabase = createAdminClient();
  if (!supabase) return;

  const { data, error } = await supabase
    .from("financial_metric_definitions")
    .select("id, metric_key")
    .in("metric_key", metricKeys);

  if (error || !data) return;

  await Promise.all(
    data.map((row) =>
      supabase
        .from("structured_metrics")
        .update({ metric_definition_id: row.id })
        .eq("metric_name", row.metric_key)
        .is("metric_definition_id", null),
    ),
  );
}
