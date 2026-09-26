/**
 * Вспомогательные функции мока портала: Problem (RFC 9457), пагинация,
 * заглушка отпечатка sha256-like, проверка документа сценария, CSV, генераторы.
 */
import type { CheckMessage, CheckResult, FieldError, Paged, Problem } from "../api/types";
import type { MockPortalResponse } from "./router";

export const ENGINE_VERSION = "1.4.0";
export const CRITERIA_SET = "harvard_spin_v1";
export const ARENA_BASE_LINK = "https://arena.local/t/";

let problemCounter = 0;

export interface ProblemInput {
  status: number;
  type: string;
  title: string;
  detail?: string | null;
  errors?: FieldError[];
  data?: Record<string, unknown>;
  retryAfterSeconds?: number;
}

export function problem(input: ProblemInput): MockPortalResponse {
  const body: Problem = {
    type: input.type,
    title: input.title,
    status: input.status,
    instance: `mock-req-${String(++problemCounter).padStart(4, "0")}`,
  };
  if (input.detail !== undefined) body.detail = input.detail;
  if (input.errors) body.errors = input.errors;
  if (input.data) body.data = input.data;
  if (input.retryAfterSeconds !== undefined) body.retry_after_seconds = input.retryAfterSeconds;
  return { status: input.status, body };
}

export const notFound = (what = "Объект не найден") =>
  problem({ status: 404, type: "not_found", title: what });

export const invalidBody = (detail = "Тело запроса не разобрано") =>
  problem({ status: 400, type: "invalid_body", title: detail });

export const validationFailed = (errors: FieldError[], title = "Проверка не пройдена") =>
  problem({ status: 422, type: "validation_failed", title, errors });

// ---------------------------------------------------------------------------
// Пагинация
// ---------------------------------------------------------------------------

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function pageParams(query: URLSearchParams): { limit: number; offset: number } {
  return {
    limit: clampInt(query.get("limit"), 50, 1, 200),
    offset: clampInt(query.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function paginate<T>(items: T[], query: URLSearchParams): Paged<T> {
  const { limit, offset } = pageParams(query);
  return { items: items.slice(offset, offset + limit), page: { total: items.length, limit, offset } };
}

// ---------------------------------------------------------------------------
// Отпечаток документа — заглушка sha256-like (детерминированный 64 hex)
// ---------------------------------------------------------------------------

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const rec = value as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(rec[k])}`).join(",")}}`;
}

function mix(seed: number, text: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 2654435761) >>> 0;
    h = ((h << 13) | (h >>> 19)) >>> 0;
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function fingerprintOf(value: unknown): string {
  const text = canonicalize(value);
  let out = "";
  for (let round = 0; round < 8; round++) {
    out += mix(0x9e3779b9 ^ Math.imul(round + 1, 0x85ebca6b), `${round}:${text}`).toString(16).padStart(8, "0");
  }
  return out;
}

export const FINGERPRINT_RE = /^[0-9a-f]{64}$/;

// ---------------------------------------------------------------------------
// Проверка документа сценария (заглушка)
// ---------------------------------------------------------------------------

export function checkDocument(doc: unknown): CheckResult {
  const messages: CheckMessage[] = [];
  const rec = (doc ?? {}) as Record<string, unknown>;

  const issues = Array.isArray(rec.issues) ? (rec.issues as Array<Record<string, unknown>>) : [];
  issues.forEach((iss, i) => {
    if (iss.hidden === true) return;
    const opp = iss.opponent as Record<string, number> | undefined;
    const part = iss.participant as Record<string, number> | undefined;
    if (!opp || !part) return;
    if (typeof opp.limit !== "number" || typeof part.limit !== "number") return;
    // dir: куда выгодно участнику двигать шкалу. down (цена) — сделка в
    // [opp.limit, part.limit]; up (зарплата) — в [part.limit, opp.limit].
    const dirUp = iss.dir === "up";
    const noDealZone = dirUp ? part.limit > opp.limit : opp.limit > part.limit;
    if (noDealZone) {
      messages.push({
        rule: "deal_zone",
        severity: "blocking",
        message: `По пункту «${String(iss.label ?? i)}» нет зоны сделки: пределы сторон не пересекаются`,
        path: `/issues/${i}/opponent/limit`,
      });
    }
  });

  const stages = Array.isArray(rec.stages) ? (rec.stages as Array<Record<string, unknown>>) : [];
  const stageIds = new Set(stages.map((s) => String(s.id)));
  if (stages.length === 0) {
    messages.push({ rule: "stages", severity: "blocking", message: "Не задан ни один этап разговора", path: "/stages" });
  }
  const finals = Array.isArray(rec.finals) ? (rec.finals as Array<Record<string, unknown>>) : [];
  if (finals.length === 0) {
    messages.push({ rule: "finals", severity: "blocking", message: "Не задан ни один финал", path: "/finals" });
  }
  finals.forEach((f, i) => {
    const stage = f.stage;
    if (typeof stage === "string" && stage.length > 0 && !stageIds.has(stage)) {
      messages.push({
        rule: "flow",
        severity: "blocking",
        message: `До выхода «${String(f.title ?? stage)}» дойти нельзя: ни один переход не ведёт в него`,
        path: `/finals/${i}/stage`,
      });
    }
  });

  return {
    blocking: messages.filter((m) => m.severity === "blocking").length,
    engine_version: ENGINE_VERSION,
    messages,
  };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// Детерминированные генераторы (LCG)
// ---------------------------------------------------------------------------

const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford без O/I/L
let lcgState = 0x2f6e2b1;

function nextRand(): number {
  lcgState = (Math.imul(lcgState, 1664525) + 1013904223) >>> 0;
  return lcgState / 0x1_00_00_00_00;
}

function codePart(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[Math.floor(nextRand() * CODE_ALPHABET.length)];
  return out;
}

export function genCode(): string {
  return `ARENA-${codePart(4)}-${codePart(4)}-${codePart(3)}`;
}

export function codeLink(code: string): string {
  return `${ARENA_BASE_LINK}${code.replace(/^ARENA-/, "").replace(/-/g, "")}`;
}

export function genToken(len = 32): string {
  let out = "";
  while (out.length < len) out += Math.floor(nextRand() * 0x1_00_00).toString(16).padStart(4, "0");
  return out.slice(0, len);
}

let uuidCounter = 0x000001000000;

export function genUuid(): string {
  uuidCounter = (uuidCounter + 0x10_00_00) >>> 0;
  return `00000000-0000-4000-8000-${uuidCounter.toString(16).padStart(12, "0")}`;
}

// ---------------------------------------------------------------------------
// Прочее
// ---------------------------------------------------------------------------

export const nowIso = (): string => new Date().toISOString();

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function asStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((v) => typeof v === "string") ? (value as string[]) : null;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null && typeof sv === "object" && !Array.isArray(sv) &&
      tv !== null && typeof tv === "object" && !Array.isArray(tv)
    ) {
      deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      target[key] = sv;
    }
  }
  return target;
}

export function slugify(title: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const slug = title
    .toLowerCase()
    .split("")
    .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "scenario";
}
