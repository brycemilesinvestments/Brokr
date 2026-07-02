import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { XbrlContext, XbrlFact, XbrlUnit } from "@/lib/edgar/xbrl/types";

function asElement(node: AnyNode): Element | null {
  return node.type === "tag" ? node : null;
}

function tagNameOf($: cheerio.CheerioAPI, el: AnyNode): string {
  const element = asElement(el);
  if (!element) return "";
  return ($(element).prop("tagName") as string | undefined)?.toUpperCase() ?? "";
}

function textContent($: cheerio.CheerioAPI, el: Element): string {
  return $(el).text().replace(/\s+/g, " ").trim();
}

function parseNumericValue(raw: string, scale?: string): number | undefined {
  const cleaned = raw.replace(/[,\s]/g, "");
  if (!cleaned || Number.isNaN(Number(cleaned))) return undefined;
  const base = Number(cleaned);
  const scaleDigits = scale ? Number(scale) : 0;
  if (Number.isNaN(scaleDigits)) return base;
  return base * 10 ** scaleDigits;
}

function splitConceptName(name: string): { taxonomy: string; concept: string } {
  const colon = name.indexOf(":");
  if (colon === -1) return { taxonomy: "", concept: name };
  return {
    taxonomy: name.slice(0, colon),
    concept: name.slice(colon + 1),
  };
}

function parseContexts($: cheerio.CheerioAPI): Map<string, XbrlContext> {
  const contexts = new Map<string, XbrlContext>();

  $("*").each((_, el) => {
    if (!tagNameOf($, el).endsWith("CONTEXT")) return;

    const id = $(el).attr("id");
    if (!id) return;

    const identifier = $(el).find("*").filter((__, child) => {
      const tag = tagNameOf($, child);
      return tag.endsWith("IDENTIFIER");
    }).first();
    const entityIdentifier = identifier.text().trim() || undefined;
    const entityScheme = identifier.attr("scheme") || undefined;

    const period = $(el).find("*").filter((__, child) => {
      return tagNameOf($, child).endsWith("PERIOD");
    }).first();

    const instant = period.find("*").filter((__, child) => {
      return tagNameOf($, child).endsWith("INSTANT");
    }).first().text().trim();
    const startDate = period.find("*").filter((__, child) => {
      return tagNameOf($, child).endsWith("STARTDATE");
    }).first().text().trim();
    const endDate = period.find("*").filter((__, child) => {
      return tagNameOf($, child).endsWith("ENDDATE");
    }).first().text().trim();

    if (instant) {
      contexts.set(id, {
        id,
        entityIdentifier,
        entityScheme,
        periodType: "instant",
        instant,
      });
      return;
    }

    contexts.set(id, {
      id,
      entityIdentifier,
      entityScheme,
      periodType: "duration",
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  });

  return contexts;
}

function parseUnits($: cheerio.CheerioAPI): Map<string, XbrlUnit> {
  const units = new Map<string, XbrlUnit>();

  $("*").each((_, el) => {
    if (!tagNameOf($, el).endsWith("UNIT")) return;

    const id = $(el).attr("id");
    if (!id) return;

    const measure = $(el).find("*").filter((__, child) => {
      const tag = tagNameOf($, child);
      return tag.endsWith("MEASURE") || tag.endsWith("DIVIDE");
    }).first().text().replace(/\s+/g, " ").trim();

    if (!measure) return;
    units.set(id, { id, measure });
  });

  return units;
}

function parseFacts(
  $: cheerio.CheerioAPI,
  contexts: Map<string, XbrlContext>,
  units: Map<string, XbrlUnit>,
): XbrlFact[] {
  const facts: XbrlFact[] = [];

  $("[name]").each((_, el) => {
    const element = asElement(el);
    if (!element) return;

    const tag = tagNameOf($, element);
    const isNumeric = tag.endsWith("NONFRACTION");
    const isNonNumeric = tag.endsWith("NONNUMERIC");
    if (!isNumeric && !isNonNumeric) return;

    const name = $(el).attr("name");
    const contextRef = $(el).attr("contextref") ?? $(el).attr("contextRef");
    if (!name || !contextRef) return;

    const { taxonomy, concept } = splitConceptName(name);
    const value = textContent($, element);
    const context = contexts.get(contextRef);
    const unitRef = $(el).attr("unitref") ?? $(el).attr("unitRef");
    const unit = unitRef ? units.get(unitRef)?.measure : undefined;

    facts.push({
      id: $(el).attr("id"),
      name,
      taxonomy,
      concept,
      value,
      numericValue: isNumeric
        ? parseNumericValue(value, $(el).attr("scale"))
        : undefined,
      contextRef,
      unitRef,
      decimals: $(el).attr("decimals"),
      scale: $(el).attr("scale"),
      format: $(el).attr("format"),
      context,
      unit,
    });
  });

  return facts;
}

export function extractIxbrl(markup: string): {
  contexts: XbrlContext[];
  units: XbrlUnit[];
  facts: XbrlFact[];
} {
  const $ = cheerio.load(markup, { xml: { xmlMode: true } });
  const contextMap = parseContexts($);
  const unitMap = parseUnits($);
  const facts = parseFacts($, contextMap, unitMap);

  return {
    contexts: [...contextMap.values()],
    units: [...unitMap.values()],
    facts,
  };
}
