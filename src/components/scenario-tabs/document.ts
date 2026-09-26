import type { FinalRank, ScenarioDocument } from "@/lib/api/types";

export type StageRow = "above" | "main" | "below";

export interface SchemeStageTransition {
  to: string | null;
  condition: Record<string, unknown>;
}

export interface SchemeStage {
  id: string;
  title: string;
  row: StageRow;
  instruction: string | null;
  fallbackReply: string | null;
  transitions: SchemeStageTransition[];
  exit: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

/** Метки этапов: либо map в document.labels.stages, либо title на самих этапах. */
function stageLabels(doc: Record<string, unknown>): Record<string, string> {
  const labels = asRecord(doc.labels);
  const stages = asRecord(labels.stages);
  return Object.fromEntries(Object.entries(stages).map(([k, v]) => [k, String(v)]));
}

export function parseStages(document: ScenarioDocument): SchemeStage[] {
  const doc = asRecord(document);
  const labels = stageLabels(doc);
  const endStages = new Set(
    Array.isArray(doc.end_stages) ? (doc.end_stages as unknown[]).map(String) : [],
  );
  return asArray(doc.stages)
    .map((s) => {
      const id = asString(s.id);
      if (!id) return null;
      const transitions: SchemeStageTransition[] = asArray(s.transitions).map((t) => {
        const { to, ...condition } = t;
        return { to: asString(to), condition };
      });
      const row = asString(s.row);
      return {
        id,
        title: asString(s.title) ?? labels[id] ?? id,
        row: row === "above" || row === "below" ? row : ("main" as StageRow),
        instruction: asString(s.instruction),
        fallbackReply: asString(s.fallback_reply),
        transitions,
        exit: transitions.length === 0 || endStages.has(id),
      };
    })
    .filter((s): s is SchemeStage => s !== null);
}

/** final_id -> title из document.finals. */
export function finalsIdMap(document: ScenarioDocument): Record<string, string> {
  const doc = asRecord(document);
  return Object.fromEntries(
    asArray(doc.finals).map((f) => {
      const id = asString(f.id);
      return [id ?? "", String(asString(f.title) ?? id ?? "")];
    }),
  );
}

/** result_rank -> title (первый финал с такой буквой) из document.finals. */
export function finalsRankMap(document: ScenarioDocument): Partial<Record<FinalRank, string>> {
  const doc = asRecord(document);
  const out: Partial<Record<FinalRank, string>> = {};
  for (const f of asArray(doc.finals)) {
    const rank = asString(f.rank);
    if (rank === "S" || rank === "A" || rank === "B" || rank === "C" || rank === "D" || rank === "F") {
      if (out[rank] === undefined) out[rank] = String(asString(f.title) ?? "");
    }
  }
  return out;
}

/** stage_id по индексу из пути вида /stages/{i}/… (для подсветки из диагностик). */
export function stageIdByPathIndex(document: ScenarioDocument, path: string): string | null {
  const doc = asRecord(document);
  const m = /^\/stages\/(\d+)/.exec(path);
  if (!m) return null;
  const stage = asArray(doc.stages)[Number(m[1])];
  return stage ? asString(stage.id) : null;
}

/** stage_id финала по индексу из пути вида /finals/{i}/stage. */
export function finalStageIdByPathIndex(document: ScenarioDocument, path: string): string | null {
  const doc = asRecord(document);
  const m = /^\/finals\/(\d+)\/stage/.exec(path);
  if (!m) return null;
  const fin = asArray(doc.finals)[Number(m[1])];
  return fin ? asString(fin.stage) : null;
}

export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}
