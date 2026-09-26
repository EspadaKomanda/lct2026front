import type { CheckMessage, ScenarioDocument } from "@/lib/api/types";

export type Doc = ScenarioDocument;

export function asRec(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

export function asArr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

export function asStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return "";
  return String(v);
}

export function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function asStrArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => asStr(x)).filter((x) => x !== "") : [];
}

export function getPath(container: unknown, path: Array<string | number>): unknown {
  let cur = container;
  for (const p of path) {
    if (Array.isArray(cur)) cur = (cur as unknown[])[Number(p)];
    else if (typeof cur === "object" && cur !== null)
      cur = (cur as Record<string, unknown>)[String(p)];
    else return undefined;
  }
  return cur;
}

/** Неизменяемая запись значения по пути. value === undefined удаляет ключ. */
export function setPath(container: unknown, path: Array<string | number>, value: unknown): unknown {
  const [head, ...rest] = path;
  if (head === undefined) return container;
  const isArr = Array.isArray(container);
  const copy = isArr ? [...(container as unknown[])] : { ...asRec(container) };
  const slot = copy as Record<string | number, unknown>;
  const key: string | number = isArr ? Number(head) : String(head);
  if (rest.length === 0) {
    if (value === undefined) {
      if (isArr) (copy as unknown[]).splice(Number(head), 1);
      else delete slot[key];
    } else {
      slot[key] = value;
    }
    return copy;
  }
  slot[key] = setPath(slot[key], rest, value);
  return copy;
}

export function setDocPath(doc: Doc, path: Array<string | number>, value: unknown): Doc {
  return setPath(doc, path, value) as Doc;
}

/** Запись сразу в два пути (спека + легаси-раскладка мока). */
export function setDocPair(
  doc: Doc,
  pathA: Array<string | number>,
  pathB: Array<string | number>,
  value: unknown,
): Doc {
  return setDocPath(setDocPath(doc, pathA, value), pathB, value);
}

export function prettyJson(v: unknown): string {
  return JSON.stringify(v === undefined ? null : v, null, 2);
}

export function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Разделы редактора
// ---------------------------------------------------------------------------

export type SectionKey =
  | "passport"
  | "brief"
  | "opponent"
  | "issues"
  | "state"
  | "facts"
  | "custom-moves"
  | "evidence-weights"
  | "move-effects"
  | "stages"
  | "finals"
  | "difficulty"
  | "jailbreak"
  | "notes";

export interface SectionGroup {
  title: string;
  keys: SectionKey[];
}

export const SECTION_GROUPS: SectionGroup[] = [
  { title: "Основа", keys: ["passport", "brief", "opponent", "issues"] },
  { title: "Поведение оппонента", keys: ["state", "facts", "custom-moves"] },
  { title: "Ход разговора", keys: ["evidence-weights", "move-effects", "stages", "finals"] },
  { title: "Прочее", keys: ["difficulty", "jailbreak", "notes"] },
];

export const SECTION_LABEL: Record<SectionKey, string> = {
  passport: "Паспорт",
  brief: "Бриф участника",
  opponent: "Оппонент",
  issues: "Предметы торга",
  state: "Состояние",
  facts: "Скрытые факты",
  "custom-moves": "Типы ходов",
  "evidence-weights": "Веса доводов",
  "move-effects": "Последствия ходов",
  stages: "Этапы разговора",
  finals: "Финалы",
  difficulty: "Уровни сложности",
  jailbreak: "Попытки «сломать» оппонента",
  notes: "Заметки",
};

const PATH_TO_SECTION: Record<string, SectionKey> = {
  passport: "passport",
  brief: "brief",
  opponent: "opponent",
  issues: "issues",
  state: "state",
  flags: "state",
  facts: "facts",
  custom_moves: "custom-moves",
  evidence_weights: "evidence-weights",
  move_effects: "move-effects",
  stages: "stages",
  flow: "stages",
  finals: "finals",
  difficulty: "difficulty",
  jailbreak: "jailbreak",
  authoring: "notes",
};

/** Первый сегмент JSON-pointer → раздел; null если маппинга нет. */
export function sectionForPath(path: string): SectionKey | null {
  const seg = path.replace(/^\//, "").split("/")[0] ?? "";
  return PATH_TO_SECTION[seg] ?? null;
}

/** Индекс из пути вида /issues/3/... — для подсветки карточки. */
export function indexForPath(path: string): number | null {
  const seg = path.replace(/^\//, "").split("/")[1];
  if (seg === undefined) return null;
  const n = Number(seg);
  return Number.isInteger(n) ? n : null;
}

/** Счётчики блокирующих сообщений по разделам. */
export function blockingBySection(messages: CheckMessage[]): Partial<Record<SectionKey, number>> {
  const out: Partial<Record<SectionKey, number>> = {};
  for (const m of messages) {
    if (m.severity !== "blocking") continue;
    const sec = sectionForPath(m.path);
    if (!sec) continue;
    out[sec] = (out[sec] ?? 0) + 1;
  }
  return out;
}

export function shortFingerprint(fp: string): string {
  if (fp.length <= 13) return fp;
  return `${fp.slice(0, 8)}…${fp.slice(-4)}`;
}
