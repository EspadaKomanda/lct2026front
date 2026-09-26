/**
 * In-memory состояние мока портала. Мутации (логин, сохранение черновика,
 * ответ на возражение, решение, настройки) меняют эти структуры.
 */
import type {
  AuditAction,
  AuditEntry,
  Decision,
  GenerationState,
  Group,
  PersonRef,
  PortalSettings,
  PortalUser,
  Questionnaire,
  Rehearsal,
  ResultLabels,
  TranscriptLine,
  TurnRecord,
  Version,
} from "../api/types";
import {
  ASSIGNMENTS,
  AUDIT_SEED,
  DECISIONS,
  GROUPS,
  IDS,
  PEOPLE,
  PROFILES,
  SCENARIOS,
  SETTINGS_SEED,
  SESSIONS,
  TEMPLATES,
  asScenarioDocument,
  type AssignmentFixture,
  type LineSpec,
  type MockScenarioDoc,
  type PersonFixture,
  type ProfileFixture,
  type ScenarioSeed,
  type SessionFixture,
} from "./fixtures";
import { ENGINE_VERSION, deepClone, fingerprintOf, genUuid, nowIso } from "./helpers";

export interface MockScenario {
  seed: ScenarioSeed;
  doc: MockScenarioDoc;
  draftRev: number;
  updatedAt: string;
  updatedByName: string | null;
  versions: Version[];
  generation: GenerationState | null;
  generationPolls: number;
  rehearsals: Rehearsal[];
}

export interface MockSession extends SessionFixture {
  person: PersonRef;
  transcript: TranscriptLine[];
  turns: TurnRecord[];
}

export interface MockState {
  users: Map<string, PortalUser>;
  people: Map<string, PersonFixture>;
  groups: Map<string, Group>;
  scenarios: Map<string, MockScenario>;
  assignments: Map<string, AssignmentFixture>;
  sessions: Map<string, MockSession>;
  decisions: Map<string, Decision>;
  profiles: Map<string, ProfileFixture>;
  templates: typeof TEMPLATES;
  audit: AuditEntry[];
  settings: PortalSettings;
  labels: Map<string, ResultLabels>;
}

function buildTranscript(dialog: LineSpec[]): { transcript: TranscriptLine[]; turns: TurnRecord[] } {
  const startedMs = 0;
  const transcript: TranscriptLine[] = [];
  const turns: TurnRecord[] = [];
  dialog.forEach((line, idx) => {
    const at_ms = startedMs + 20000 + idx * 45000;
    const reply_no = idx + 1;
    transcript.push({
      seq: idx,
      reply_no,
      speaker: line.sp,
      text: line.text,
      at_ms,
      offer: null,
      terms: null,
      stage: line.stage,
      markers: line.markers ?? [],
    });
    turns.push({
      seq: idx,
      reply_no,
      speaker: line.sp,
      text: line.text,
      at_ms,
      duration_ms: 5200,
      pause_ms: 1400,
      model_route: "openrouter",
      stage: line.stage,
      transition_to: undefined,
      move_type: line.move_type ?? undefined,
      move_source: "judge",
      judge_confidence: 0.86,
      evidence: undefined,
      interest: undefined,
      violations: [],
      judge: null,
      terms: null,
      trust: 55 + idx,
      pressure: 30,
      credibility: 60,
      patience: 50,
      credit: 0,
      revealed_facts: line.facts ?? [],
      engine_step: null,
      intent: undefined,
      offer: null,
      opponent_judge: null,
      opponent_violation: (line.violation_kinds?.length ?? 0) > 0,
      opponent_judge_comment: undefined,
      interrupted: false,
      received_at: new Date(at_ms).toISOString(),
    });
  });
  return { transcript, turns };
}

function buildLabels(doc: MockScenarioDoc): ResultLabels {
  const stages: Record<string, string> = {};
  for (const s of doc.stages) stages[String(s.id)] = String(s.title ?? s.id);
  const facts: Record<string, string> = {};
  for (const f of doc.facts) facts[String(f.id)] = String(f.label ?? f.id);
  const issues: Record<string, string> = {};
  for (const i of doc.issues) issues[String(i.id)] = String(i.label ?? i.id);
  const moves: Record<string, string> = {};
  for (const m of doc.custom_moves) moves[String(m.id)] = String(m.label ?? m.id);
  const finals: Record<string, string> = {};
  for (const f of doc.finals) finals[String(f.id)] = String(f.title ?? f.id);
  return { stages, facts, issues, moves, finals };
}

function buildInitialState(): MockState {
  const scenarios = new Map<string, MockScenario>();
  const labels = new Map<string, ResultLabels>();

  for (const seed of SCENARIOS) {
    const doc = deepClone(seed.doc);
    const fingerprint = fingerprintOf(doc);
    const versions: Version[] = seed.versions.map((v) => ({
      id: v.id,
      number: v.number,
      fingerprint,
      mode: seed.mode,
      published_at: v.published_at,
      title: seed.title,
      engine_version: ENGINE_VERSION,
      admission_rehearsals: null,
      admission_required: null,
      published_by_name: v.published_by_name,
      sessions_count: 0,
      document: asScenarioDocument(deepClone(doc)),
    }));
    const rehearsals: Rehearsal[] = seed.rehearsals.map((r) => ({
      ...r,
      fingerprint: r.fingerprint || fingerprint,
      record: r.record
        ? { ...r.record, fingerprint: r.record.fingerprint || fingerprint }
        : null,
    }));
    scenarios.set(seed.id, {
      seed,
      doc,
      draftRev: 1,
      updatedAt: seed.updated_at,
      updatedByName: seed.created_by_name,
      versions,
      generation: null,
      generationPolls: 0,
      rehearsals,
    });
    labels.set(seed.id, buildLabels(doc));
  }

  const sessions = new Map<string, MockSession>();
  for (const s of SESSIONS) {
    const scenario = scenarios.get(s.header.scenario_id);
    const version = scenario?.versions.find((v) => v.number === s.header.version_number);
    const header = { ...s.header, fingerprint: version?.fingerprint ?? fingerprintOf(scenario?.doc ?? {}) };
    const { transcript, turns } = buildTranscript(s.dialog);
    const personFixture = PEOPLE.find((p) => p.subject_id === s.person_id);
    const person: PersonRef = personFixture
      ? personRefOf(personFixture)
      : { subject_id: s.person_id, number: "N-000000", display_name: null, is_pseudonym: false };
    sessions.set(s.session_id, { ...s, person, header, transcript, turns });
  }

  return {
    users: new Map(USERS_LIST.map((u) => [u.id, { ...u }])),
    people: new Map(PEOPLE.map((p) => [p.subject_id, deepClone(p)])),
    groups: new Map(GROUPS.map((g) => {
      const copy: Group = { ...g };
      return [copy.id, copy] as [string, Group];
    })),
    scenarios,
    assignments: new Map(ASSIGNMENTS.map((a) => [a.id, deepClone(a)])),
    sessions,
    decisions: new Map(DECISIONS.map((d) => [d.id, deepClone(d)])),
    profiles: new Map(PROFILES.map((p) => [p.public.id, deepClone(p)])),
    templates: TEMPLATES,
    audit: AUDIT_SEED.map((a, i) => ({
      id: auditId(`a${String(i).padStart(4, "0")}`),
      rows_count: null,
      details: null,
      actor_user_id: null,
      actor_name: null,
      subject_number: null,
      session_id: null,
      group_id: null,
      group_name: null,
      ...a,
    })),
    settings: { ...SETTINGS_SEED },
    labels,
  };
}

const auditId = (tail: string) => `00000000-0000-4000-8000-${tail}`;

const USERS_LIST: PortalUser[] = [
  {
    id: IDS.users.gromova,
    login: "gromova",
    full_name: "Громова Наталья Сергеевна",
    role: "methodologist",
    is_active: true,
    group_ids: [IDS.groups.zakup, IDS.groups.managers, IDS.groups.reserve],
    last_login_at: "2026-09-25T16:40:00Z",
  },
  {
    id: IDS.users.lanskoy,
    login: "lanskoy",
    full_name: "Ланской Виктор Павлович",
    role: "admin",
    is_active: true,
    group_ids: [IDS.groups.zakup, IDS.groups.managers, IDS.groups.reserve],
    last_login_at: "2026-09-24T11:05:00Z",
  },
];

export const state: MockState = buildInitialState();

let auditCounter = 1000;

export function addAudit(entry: {
  actor_kind: "user" | "participant" | "system";
  actor_user_id?: string | null;
  actor_name?: string | null;
  action: AuditAction;
  outcome?: "ok" | "denied";
  subject_number?: string | null;
  session_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  rows_count?: number | null;
  details?: Record<string, unknown> | null;
  occurred_at?: string;
}): AuditEntry {
  auditCounter += 1;
  const full: AuditEntry = {
    id: auditId(`b${String(auditCounter).padStart(5, "0")}`),
    occurred_at: entry.occurred_at ?? nowIso(),
    actor_kind: entry.actor_kind,
    actor_user_id: entry.actor_user_id ?? null,
    actor_name: entry.actor_name ?? null,
    action: entry.action,
    outcome: entry.outcome ?? "ok",
    subject_number: entry.subject_number ?? null,
    session_id: entry.session_id ?? null,
    group_id: entry.group_id ?? null,
    group_name: entry.group_name ?? null,
    rows_count: entry.rows_count ?? null,
    details: entry.details ?? null,
  };
  state.audit.unshift(full);
  return full;
}

export function draftFingerprint(sc: MockScenario): string {
  return fingerprintOf(sc.doc);
}

export function etagOf(sc: MockScenario): string {
  return `"v${sc.draftRev}"`;
}

/** Допуск репетиций по отпечатку: засчитываются загруженные записи. */
export function admissionFor(sc: MockScenario, fingerprint: string): { fingerprint: string | null; done: number; required: number; reset?: boolean } {
  const done = sc.rehearsals.filter(
    (r) => r.fingerprint === fingerprint && r.uploaded_at !== null && r.counts_for_admission,
  ).length;
  return { fingerprint, done, required: state.settings.admission_rehearsals };
}

export function latestVersion(sc: MockScenario): Version | null {
  return sc.versions.length > 0 ? sc.versions[sc.versions.length - 1] : null;
}

export function findVersionById(scenarioVersionId: string): { scenario: MockScenario; version: Version } | null {
  for (const scenario of state.scenarios.values()) {
    const version = scenario.versions.find((v) => v.id === scenarioVersionId);
    if (version) return { scenario, version };
  }
  return null;
}

export function findPerson(subjectId: string): PersonFixture | null {
  return state.people.get(subjectId) ?? null;
}

export function personRefOf(person: PersonFixture): PersonRef {
  return {
    subject_id: person.subject_id,
    number: person.number,
    display_name: person.anonymized ? null : person.pseudonym ?? person.full_name,
    is_pseudonym: person.pseudonym !== null && person.full_name === null,
  };
}

export function newId(): string {
  return genUuid();
}

/** Заготовка состояния генерации для сценария из брифа. */
export function initialGeneration(scenarioId: string, questionnaire: Questionnaire): GenerationState {
  return {
    scenario_id: scenarioId,
    questionnaire,
    step: 1,
    status: "running",
    confirmed_steps: [],
    progress_text: "Генерация шага 1: человеческая часть…",
    result: null,
    check: null,
    error: null,
  };
}
