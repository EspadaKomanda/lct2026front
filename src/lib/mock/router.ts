/**
 * In-memory мок всего API портала «Арена переговоров» (/api/portal/*).
 * Роутинг по method + path (без префикса /api/portal).
 *
 * Примечание: в контракте запроса нет заголовков, поэтому If-Match черновика
 * принимается query-параметром `if_match` (прокси передаёт значение заголовка).
 */
import type {
  Assignment,
  AssignmentCreateResult,
  AuditEntry,
  Criterion,
  Decision,
  DecisionCandidate,
  Difficulty,
  ExportPreview,
  FinalRank,
  GroupAnalytics,
  HealthSessionItem,
  IssuedCode,
  Me,
  Objection,
  Origin,
  Mode,
  Person,
  PortalUser,
  RehearsalLink,
  RehearsalList,
  RehearsalListItem,
  ReducedSession,
  ResultLabels,
  ScenarioCard,
  ScenarioHealth,
  ScenarioPage,
  ScenarioTemplate,
  SessionConditions,
  SessionFlags,
  SessionListItem,
  SessionRecord,
  SessionResult,
  SessionStatus,
  SmallSample,
  TrainerProfile,
  Version,
  VersionSummary,
  ComparisonCondition,
  ComparisonRow,
  PortalSettings,
  ProfileCheckResult,
  Questionnaire,
  Review,
} from "../api/types";
import { CRITERION_LABEL } from "../labels";
import {
  ENGINE_VERSION,
  FINGERPRINT_RE,
  asRecord,
  asString,
  asStringArray,
  checkDocument,
  codeLink,
  deepClone,
  deepMerge,
  fingerprintOf,
  genCode,
  genToken,
  invalidBody,
  notFound,
  nowIso,
  paginate,
  problem,
  slugify,
  toCsv,
  validationFailed,
} from "./helpers";
import {
  admissionFor,
  addAudit,
  draftFingerprint,
  etagOf,
  findPerson,
  findVersionById,
  initialGeneration,
  latestVersion,
  newId,
  personRefOf,
  state,
  type MockScenario,
  type MockSession,
} from "./state";
import { MOCK_PASSWORD, asScenarioDocument, skeletonDoc, type MockScenarioDoc, type PersonFixture, type AssignmentFixture } from "./fixtures";

export interface MockPortalRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  cookies: Record<string, string>;
}

export interface MockPortalResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Базовые ответы и доступ
// ---------------------------------------------------------------------------

const ok = (body: unknown, headers?: Record<string, string>): MockPortalResponse => ({ status: 200, body, headers });
const created = (body: unknown, headers?: Record<string, string>): MockPortalResponse => ({ status: 201, body, headers });
const noContent = (headers?: Record<string, string>): MockPortalResponse => ({ status: 204, headers });

const unauthenticated = () =>
  problem({ status: 401, type: "unauthenticated", title: "Нет входа в портал" });

const forbiddenRole = () =>
  problem({ status: 403, type: "forbidden_role", title: "Действие недоступно для вашей роли" });

const forbiddenGroup = () =>
  problem({ status: 403, type: "forbidden_group", title: "Нет доступа к группе" });

function userFromRequest(req: MockPortalRequest): PortalUser | null {
  const raw = req.cookies["arena_session"];
  if (!raw) return null;
  return state.users.get(raw) ?? null;
}

function hasGroupAccess(user: PortalUser, groupId: string): boolean {
  return user.group_ids.includes(groupId);
}

// ---------------------------------------------------------------------------
// Сборщики ответных моделей
// ---------------------------------------------------------------------------

function labelsOf(scenarioId: string): ResultLabels {
  return state.labels.get(scenarioId) ?? { stages: {}, facts: {}, issues: {}, moves: {}, finals: {} };
}

function scenarioCardOf(sc: MockScenario): ScenarioCard {
  const { seed } = sc;
  const latest = latestVersion(sc);
  const fingerprint = draftFingerprint(sc);
  const check = checkDocument(sc.doc);
  return {
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    mode: seed.mode,
    origin: seed.origin,
    sphere: seed.sphere,
    negotiation_type: seed.negotiation_type,
    tags: [...seed.tags],
    status: seed.status,
    latest_version: latest ? versionSummaryOf(sc, latest) : null,
    draft_differs: latest ? latest.fingerprint !== fingerprint : true,
    blocking_errors: check.blocking,
    generating: sc.generation?.status === "running",
    mode_locked: sc.versions.length > 0,
    admission: admissionFor(sc, fingerprint),
    versions_count: sc.versions.length,
    archived_at: seed.archived_at,
    copied_from: seed.copied_from,
    created_at: seed.created_at,
    created_by_name: seed.created_by_name,
  };
}

function versionSummaryOf(sc: MockScenario, v: Version): VersionSummary {
  let sessionsCount = 0;
  for (const s of state.sessions.values()) {
    if (s.header.scenario_id === sc.seed.id && s.header.version_number === v.number && !s.header.is_demo) sessionsCount++;
  }
  return {
    id: v.id,
    number: v.number,
    fingerprint: v.fingerprint,
    mode: v.mode,
    published_at: v.published_at,
    title: v.title,
    engine_version: v.engine_version,
    admission_rehearsals: v.admission_rehearsals,
    admission_required: v.admission_required,
    published_by_name: v.published_by_name,
    sessions_count: sessionsCount,
  };
}

function assignmentOut(a: AssignmentFixture): Assignment {
  const { access_code, code_issued_at, code_failed_attempts, code_blocked_at, ...rest } = a;
  void access_code;
  return {
    ...rest,
    code: { issued_at: code_issued_at, failed_attempts: code_failed_attempts, blocked_at: code_blocked_at },
  };
}

function sessionListItemOf(s: MockSession): SessionListItem {
  return {
    session_id: s.session_id,
    person: s.person,
    group_id: s.group_id,
    header: s.header,
    score_columns: s.score_columns,
    flags: s.flags,
    assignment_id: s.assignment_id,
  };
}

function profileView(user: PortalUser, id: string): TrainerProfile | null {
  const p = state.profiles.get(id);
  if (!p) return null;
  const base: TrainerProfile = { ...p.public, settings: deepClone(p.public.settings) };
  if (user.role !== "admin") return base;
  return {
    ...base,
    openrouter_key_last4: p.admin.openrouter_key_last4,
    model_server_token_last4: p.admin.model_server_token_last4,
    keys_changed_at: p.admin.keys_changed_at,
    keys_changed_by_name: p.admin.keys_changed_by_name,
    running_sessions: p.admin.running_sessions,
    same_key_profiles: [...p.admin.same_key_profiles],
  };
}

// ---------------------------------------------------------------------------
// Роутинг
// ---------------------------------------------------------------------------

type Params = Record<string, string>;
type Handler = (req: MockPortalRequest, params: Params, user: PortalUser) => MockPortalResponse;

interface Route {
  method: string;
  pattern: string;
  public?: boolean;
  admin?: boolean;
  handler: Handler;
}

function matchSegs(segs: string[], pattern: string): Params | null {
  const parts = pattern.split("/").filter(Boolean);
  if (parts.length !== segs.length) return null;
  const params: Params = {};
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith("{")) params[parts[i].slice(1, -1)] = segs[i];
    else if (parts[i] !== segs[i]) return null;
  }
  return params;
}

function getScenario(idParam: string): MockScenario | null {
  return state.scenarios.get(idParam) ?? null;
}

function getSession(idParam: string): MockSession | null {
  return state.sessions.get(idParam) ?? null;
}

function groupName(groupId: string): string | null {
  return state.groups.get(groupId)?.name ?? null;
}

function parseDate(value: string | null): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

// ---------------------------------------------------------------------------
// Обработчики: auth
// ---------------------------------------------------------------------------

const loginHandler: Handler = (req) => {
  const body = asRecord(req.body);
  const login = body ? asString(body.login) : null;
  const password = body ? asString(body.password) : null;
  if (!login || !password) return invalidBody("Ожидались поля login и password");
  const user = [...state.users.values()].find((u) => u.login === login);
  if (!user || !user.is_active || password !== MOCK_PASSWORD) {
    addAudit({ actor_kind: "user", actor_name: login, action: "login_failed", outcome: "denied" });
    return problem({ status: 401, type: "unauthenticated", title: "Неверный логин или пароль" });
  }
  user.last_login_at = nowIso();
  addAudit({ actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name, action: "login" });
  const me: Me = { user: deepClone(user), demo_mode: state.settings.demo_mode };
  return ok(me, {
    "set-cookie": `arena_session=${user.id}; HttpOnly; Path=/api/portal; SameSite=Strict; Max-Age=28800`,
  });
};

const logoutHandler: Handler = () =>
  noContent({ "set-cookie": "arena_session=; HttpOnly; Path=/api/portal; SameSite=Strict; Max-Age=0" });

const meHandler: Handler = (_req, _params, user) =>
  ok({ user: deepClone(user), demo_mode: state.settings.demo_mode } satisfies Me);

// ---------------------------------------------------------------------------
// Обработчики: сценарии
// ---------------------------------------------------------------------------

const listScenariosHandler: Handler = (req) => {
  const q = (req.query.get("q") ?? "").toLowerCase();
  const sphere = req.query.get("sphere");
  const mode = req.query.get("mode");
  const status = req.query.get("status");
  const negotiationType = req.query.get("negotiation_type");
  const tag = req.query.get("tag");
  let items = [...state.scenarios.values()].map(scenarioCardOf);
  if (q) items = items.filter((c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  if (sphere) items = items.filter((c) => c.sphere === sphere);
  if (mode) items = items.filter((c) => c.mode === mode);
  if (status) items = items.filter((c) => c.status === status);
  if (negotiationType) items = items.filter((c) => c.negotiation_type === negotiationType);
  if (tag) items = items.filter((c) => c.tags.includes(tag));
  const page = paginate(items, req.query);
  const result: ScenarioPage = { items: page.items, page: page.page };
  return ok(result);
};

function buildScenarioFromDoc(input: {
  origin: Origin;
  mode: Mode;
  doc: MockScenarioDoc;
  title: string;
  copiedFrom?: { scenario_id: string; version: number } | null;
}): MockScenario {
  const id = newId();
  const seed = {
    id,
    slug: input.doc.passport.id,
    title: input.title,
    mode: input.mode,
    origin: input.origin,
    sphere: input.doc.passport.sphere,
    negotiation_type: input.doc.passport.negotiation_type,
    tags: [],
    status: "draft" as const,
    created_at: nowIso(),
    created_by_name: null as string | null,
    doc: input.doc,
    versions: [],
    archived_at: null,
    copied_from: input.copiedFrom ?? null,
    rehearsals: [],
    updated_at: nowIso(),
  };
  const sc: MockScenario = {
    seed,
    doc: input.doc,
    draftRev: 1,
    updatedAt: nowIso(),
    updatedByName: null,
    versions: [],
    generation: null,
    generationPolls: 0,
    rehearsals: [],
  };
  state.scenarios.set(id, sc);
  state.labels.set(id, {
    stages: Object.fromEntries(input.doc.stages.map((s) => [String(s.id), String(s.title ?? s.id)])),
    facts: Object.fromEntries(input.doc.facts.map((f) => [String(f.id), String(f.label ?? f.id)])),
    issues: Object.fromEntries(input.doc.issues.map((i) => [String(i.id), String(i.label ?? i.id)])),
    moves: Object.fromEntries(input.doc.custom_moves.map((m) => [String(m.id), String(m.label ?? m.id)])),
    finals: Object.fromEntries(input.doc.finals.map((f) => [String(f.id), String(f.title ?? f.id)])),
  });
  return sc;
}

const createScenarioHandler: Handler = (req, _params, user) => {
  const body = asRecord(req.body);
  if (!body) return invalidBody();
  const origin = asString(body.origin);
  const mode = asString(body.mode);
  if (!origin || !mode || (mode !== "training" && mode !== "assessment")) {
    return validationFailed([{ path: "/origin", message: "Нужны поля origin и mode" }]);
  }
  if (origin === "brief") {
    const qRec = asRecord(body.questionnaire);
    const sphere = qRec ? asString(qRec.sphere) : null;
    const topic = qRec ? asString(qRec.topic) : null;
    if (!qRec || !sphere || !topic) {
      return validationFailed([
        { path: "/questionnaire/sphere", message: "Сфера обязательна" },
        { path: "/questionnaire/topic", message: "Тема обязательна" },
      ]);
    }
    const questionnaire: Questionnaire = {
      sphere: sphere as Questionnaire["sphere"],
      topic,
      opponent_role: asString(qRec.opponent_role) ?? undefined,
      opponent_goals: asString(qRec.opponent_goals) ?? undefined,
      participant_role: asString(qRec.participant_role) ?? undefined,
      opponent_character: asString(qRec.opponent_character) ?? undefined,
      negotiation_type: qRec.negotiation_type === "integrative" || qRec.negotiation_type === "mixed" || qRec.negotiation_type === "distributive" ? qRec.negotiation_type : undefined,
      difficulty: qRec.difficulty === "easy" || qRec.difficulty === "normal" || qRec.difficulty === "hard" ? qRec.difficulty : undefined,
      time_limit_minutes: typeof qRec.time_limit_minutes === "number" ? qRec.time_limit_minutes : undefined,
      comment: asString(qRec.comment) ?? undefined,
    };
    const doc = skeletonDoc(mode, questionnaire.sphere, topic);
    doc.brief = { ...doc.brief, situation: topic, participant_role: questionnaire.participant_role ?? "" };
    doc.opponent.card = {
      ...doc.opponent.card,
      name: questionnaire.opponent_role ?? "",
      goals: questionnaire.opponent_goals ? [questionnaire.opponent_goals] : [],
      character: questionnaire.opponent_character ?? "",
    };
    const sc = buildScenarioFromDoc({ origin: "brief", mode, doc, title: topic });
    sc.seed.created_by_name = user.full_name;
    sc.updatedByName = user.full_name;
    sc.generation = initialGeneration(sc.seed.id, questionnaire);
    return created(scenarioCardOf(sc));
  }
  if (origin === "template") {
    const templateId = asString(body.template_id);
    const template = state.templates.find((t) => t.id === templateId);
    if (!template) return notFound("Шаблон не найден");
    const title = asString(body.title) ?? template.title;
    const doc = deepClone(template.doc);
    doc.passport.id = `${slugify(title)}-2026`;
    doc.passport.title = title;
    doc.passport.mode = mode;
    doc.passport.sphere = template.sphere;
    const sc = buildScenarioFromDoc({ origin: "template", mode, doc, title });
    sc.seed.created_by_name = user.full_name;
    sc.updatedByName = user.full_name;
    return created(scenarioCardOf(sc));
  }
  if (origin === "copy") {
    const sourceId = asString(body.source_scenario_id);
    const source = sourceId ? getScenario(sourceId) : null;
    if (!source) return notFound("Исходный сценарий не найден");
    const title = asString(body.title);
    if (!title) return validationFailed([{ path: "/title", message: "Нужно название копии" }]);
    const sourceVersion = typeof body.source_version === "number" ? body.source_version : null;
    const version = source.versions.find((v) => v.number === sourceVersion) ?? latestVersion(source);
    if (!version) return validationFailed([{ path: "/source_version", message: "У исходника нет версий" }]);
    const doc = deepClone(version.document) as unknown as MockScenarioDoc;
    doc.passport.id = `${slugify(title)}-2026`;
    doc.passport.title = title;
    doc.passport.mode = mode;
    const sc = buildScenarioFromDoc({
      origin: "copy",
      mode,
      doc,
      title,
      copiedFrom: { scenario_id: source.seed.id, version: version.number },
    });
    sc.seed.created_by_name = user.full_name;
    sc.updatedByName = user.full_name;
    return created(scenarioCardOf(sc));
  }
  if (origin === "manual") {
    const doc = skeletonDoc(mode, "other", "Новый сценарий");
    const sc = buildScenarioFromDoc({ origin: "manual", mode, doc, title: "Новый сценарий" });
    sc.seed.created_by_name = user.full_name;
    sc.updatedByName = user.full_name;
    return created(scenarioCardOf(sc));
  }
  return validationFailed([{ path: "/origin", message: "Неизвестный origin" }]);
};

const listTemplatesHandler: Handler = () => {
  const templates: ScenarioTemplate[] = state.templates.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    sphere: t.sphere,
    main_weights: deepClone(t.main_weights),
  }));
  return ok(templates);
};

const importScenarioHandler: Handler = (req, _params, user) => {
  const docRaw = asRecord(req.body);
  if (!docRaw) return invalidBody("Ожидался документ сценария");
  const passport = asRecord(docRaw.passport);
  const title = passport ? asString(passport.title) : null;
  const passportId = passport ? asString(passport.id) : null;
  const sphere = passport?.sphere;
  const negotiationType = passport?.negotiation_type;
  if (!title || !passportId) {
    return validationFailed([{ path: "/passport", message: "В документе нет passport.title / passport.id" }], "Файл не похож на сценарий");
  }
  const doc = docRaw as unknown as MockScenarioDoc;
  doc.passport = {
    id: passportId,
    version: 1,
    title,
    mode: doc.passport.mode === "assessment" ? "assessment" : "training",
    sphere: typeof sphere === "string" ? (sphere as MockScenarioDoc["passport"]["sphere"]) : "other",
    negotiation_type: negotiationType === "integrative" || negotiationType === "mixed" ? negotiationType : "distributive",
  };
  const sc = buildScenarioFromDoc({ origin: "manual", mode: doc.passport.mode, doc, title });
  sc.seed.created_by_name = user.full_name;
  sc.updatedByName = user.full_name;
  return created(scenarioCardOf(sc));
};

const getScenarioHandler: Handler = (_req, params) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  return ok(scenarioCardOf(sc));
};

function draftBody(sc: MockScenario) {
  const fingerprint = draftFingerprint(sc);
  return {
    scenario_id: sc.seed.id,
    document: asScenarioDocument(deepClone(sc.doc)),
    fingerprint,
    check: checkDocument(sc.doc),
    admission: admissionFor(sc, fingerprint),
    updated_at: sc.updatedAt,
    updated_by_name: sc.updatedByName,
  };
}

const getDraftHandler: Handler = (_req, params) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  return ok(draftBody(sc), { etag: etagOf(sc) });
};

const putDraftHandler: Handler = (req, params, user) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  const ifMatch = req.query.get("if_match") ?? req.query.get("If-Match");
  if (ifMatch !== null && ifMatch !== etagOf(sc)) {
    return problem({ status: 412, type: "draft_changed", title: "Черновик изменён другим пользователем" });
  }
  const body = asRecord(req.body);
  const document = body ? body.document : null;
  const docRec = asRecord(document);
  if (!docRec) return invalidBody("Ожидалось поле document");
  const mode = docRec.mode ?? asRecord(docRec.passport)?.mode;
  if (sc.versions.length > 0 && (mode === "training" || mode === "assessment") && mode !== sc.seed.mode) {
    return problem({ status: 409, type: "mode_locked", title: "После публикации режим сценария не меняется" });
  }
  sc.doc = document as unknown as MockScenarioDoc;
  sc.draftRev += 1;
  sc.updatedAt = nowIso();
  sc.updatedByName = user.full_name;
  const doc = sc.doc as unknown as Record<string, unknown>;
  const list = (v: unknown): Array<Record<string, unknown>> => (Array.isArray(v) ? (v as Array<Record<string, unknown>>) : []);
  const labelMap = (items: Array<Record<string, unknown>>) =>
    Object.fromEntries(items.map((it) => [String(it.id), String(it.label ?? it.id)]));
  state.labels.set(sc.seed.id, {
    stages: labelMap(list(doc.stages)),
    facts: labelMap(list(doc.facts)),
    issues: labelMap(list(doc.issues)),
    moves: labelMap(list(doc.custom_moves)),
    finals: labelMap(list(doc.finals)),
  });
  return ok(draftBody(sc), { etag: etagOf(sc) });
};

const draftCheckHandler: Handler = (req, params) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  const body = asRecord(req.body);
  const document = body?.document;
  if (!document) return invalidBody("Ожидалось поле document");
  const fingerprint = fingerprintOf(document);
  return ok({
    check: checkDocument(document),
    fingerprint,
    resets_admission: fingerprint !== draftFingerprint(sc),
  });
};

const publishHandler: Handler = (req, params, user) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  const body = asRecord(req.body);
  const fingerprint = body ? asString(body.fingerprint) : null;
  if (!fingerprint || !FINGERPRINT_RE.test(fingerprint)) {
    return validationFailed([{ path: "/fingerprint", message: "Отпечаток должен быть 64 hex" }]);
  }
  const draftFp = draftFingerprint(sc);
  if (fingerprint !== draftFp) {
    return problem({ status: 409, type: "fingerprint_changed", title: "Отпечаток не совпал с текущим черновиком" });
  }
  const check = checkDocument(sc.doc);
  if (check.blocking > 0) {
    return problem({
      status: 422,
      type: "scenario_check_failed",
      title: `Проверка не пройдена: ${check.blocking} блокирующих ошибок`,
      errors: check.messages.filter((m) => m.severity === "blocking").map((m) => ({ path: m.path, message: m.message, code: m.rule ?? null })),
    });
  }
  if (sc.seed.mode === "assessment") {
    const admission = admissionFor(sc, draftFp);
    if (admission.done < admission.required) {
      return problem({
        status: 409,
        type: "admission_insufficient",
        title: `Проведено ${admission.done} из ${admission.required} репетиций`,
        data: { done: admission.done, required: admission.required },
      });
    }
  }
  const latest = latestVersion(sc);
  if (latest && latest.fingerprint === fingerprint) {
    return problem({ status: 409, type: "nothing_changed", title: "Черновик совпадает с опубликованной версией" });
  }
  const admission = admissionFor(sc, draftFp);
  const version: Version = {
    id: newId(),
    number: latest ? latest.number + 1 : 1,
    fingerprint,
    mode: sc.seed.mode,
    published_at: nowIso(),
    title: sc.seed.title,
    engine_version: ENGINE_VERSION,
    admission_rehearsals: admission.done,
    admission_required: admission.required,
    published_by_name: user.full_name,
    sessions_count: 0,
    document: asScenarioDocument(deepClone(sc.doc)),
  };
  sc.versions.push(version);
  sc.seed.status = "published";
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "scenario_published", details: { scenario_id: sc.seed.id, version: version.number },
  });
  return created(versionSummaryOf(sc, version));
};

const listVersionsHandler: Handler = (_req, params) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  return ok([...sc.versions].reverse().map((v) => versionSummaryOf(sc, v)));
};

const getVersionHandler: Handler = (_req, params, user) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  if (user.role === "observer") return forbiddenRole();
  const version = sc.versions.find((v) => v.number === Number(params.n));
  if (!version) return notFound("Версия не найдена");
  return ok({ ...versionSummaryOf(sc, version), document: version.document });
};

const exportScenarioHandler: Handler = (req, params) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  const versionParam = req.query.get("version");
  if (versionParam !== null) {
    const version = sc.versions.find((v) => v.number === Number(versionParam));
    if (!version) return notFound("Версия не найдена");
    return ok(version.document, {
      "content-disposition": `attachment; filename="${sc.seed.slug}-v${version.number}.json"`,
    });
  }
  return ok(asScenarioDocument(deepClone(sc.doc)), {
    "content-disposition": `attachment; filename="${sc.seed.slug}-draft.json"`,
  });
};

const archiveScenarioHandler: Handler = (req, params, user) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  const body = asRecord(req.body);
  const archived = body?.archived === true;
  sc.seed.archived_at = archived ? nowIso() : null;
  sc.seed.status = archived ? "archived" : sc.versions.length > 0 ? "published" : "draft";
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "scenario_archived", details: { scenario_id: sc.seed.id, archived },
  });
  return ok(scenarioCardOf(sc));
};

// ---------------------------------------------------------------------------
// Обработчики: генерация из брифа
// ---------------------------------------------------------------------------

function generationStepResult(sc: MockScenario): Record<string, unknown> {
  const q = sc.generation?.questionnaire;
  if (sc.generation?.step === 1) {
    return {
      passport: { title: q?.topic ?? sc.seed.title },
      brief: {
        situation: q?.topic ?? "",
        participant_role: q?.participant_role ?? "",
        opponent_role: q?.opponent_role ?? "",
      },
      opponent: {
        card: {
          name: q?.opponent_role ?? "Оппонент",
          character: q?.opponent_character ?? "",
          goals: q?.opponent_goals ? [q.opponent_goals] : [],
        },
      },
    };
  }
  if (sc.generation?.step === 2) {
    return {
      issues: deepClone(sc.doc.issues.length > 0 ? sc.doc.issues : skeletonDoc(sc.seed.mode, q?.sphere ?? "other", sc.seed.title).issues),
      state: { trust: 50, patience: 50, pressure: 25, credit: 0 },
      facts: deepClone(sc.doc.facts),
    };
  }
  return {
    stages: deepClone(sc.doc.stages.length > 0 ? sc.doc.stages : skeletonDoc(sc.seed.mode, q?.sphere ?? "other", sc.seed.title).stages),
    finals: deepClone(sc.doc.finals.length > 0 ? sc.doc.finals : skeletonDoc(sc.seed.mode, q?.sphere ?? "other", sc.seed.title).finals),
    difficulty: deepClone(sc.doc.difficulty),
  };
}

const getGenerationHandler: Handler = (_req, params) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  if (!sc.generation) return notFound("Генерация не запускалась");
  sc.generationPolls += 1;
  if (sc.generation.status === "running" && sc.generationPolls >= 2) {
    sc.generation.status = "ready";
    sc.generation.progress_text = null;
    sc.generation.result = generationStepResult(sc);
  }
  return ok(deepClone(sc.generation));
};

const confirmGenerationHandler: Handler = (req, params) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  if (!sc.generation) return notFound("Генерация не запускалась");
  const step = Number(params.step);
  if (step !== 1 && step !== 2 && step !== 3) return notFound("Шаг не найден");
  const body = asRecord(req.body);
  const fields = body ? asRecord(body.fields) : null;
  if (!fields) return invalidBody("Ожидалось поле fields");
  const stepKeys: Record<number, string[]> = {
    1: ["passport", "brief", "opponent"],
    2: ["issues", "state", "facts", "evidence_weights"],
    3: ["stages", "finals", "difficulty", "custom_moves", "move_effects"],
  };
  const patch: Record<string, unknown> = {};
  for (const key of stepKeys[step]) {
    if (fields[key] !== undefined) patch[key] = fields[key];
  }
  deepMerge(sc.doc as unknown as Record<string, unknown>, patch);
  if (!sc.generation.confirmed_steps.includes(step)) sc.generation.confirmed_steps.push(step);
  if (step < 3) {
    sc.generation.step = (step + 1) as 1 | 2 | 3;
    sc.generation.status = "running";
    sc.generation.progress_text = `Генерация шага ${step + 1}…`;
    sc.generation.result = null;
    sc.generationPolls = 0;
  } else {
    sc.generation.status = "done";
    sc.generation.progress_text = null;
    sc.generation.result = null;
    sc.generation.check = checkDocument(sc.doc);
  }
  sc.draftRev += 1;
  sc.updatedAt = nowIso();
  return ok(deepClone(sc.generation));
};

const regenerateGenerationHandler: Handler = (req, params) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  if (!sc.generation) return notFound("Генерация не запускалась");
  void asRecord(req.body);
  sc.generation.status = "running";
  sc.generation.progress_text = `Повторная генерация шага ${sc.generation.step}…`;
  sc.generation.result = null;
  sc.generationPolls = 0;
  return { status: 202, body: deepClone(sc.generation) };
};

// ---------------------------------------------------------------------------
// Обработчики: репетиции
// ---------------------------------------------------------------------------

const listRehearsalsHandler: Handler = (req, params) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  const fingerprintFilter = req.query.get("fingerprint");
  const fingerprint = fingerprintFilter ?? draftFingerprint(sc);
  const items: RehearsalListItem[] = sc.rehearsals
    .filter((r) => !fingerprintFilter || r.fingerprint === fingerprintFilter)
    .map((r) => ({
      id: r.id,
      fingerprint: r.fingerprint,
      difficulty: r.difficulty,
      trainer_profile_name: r.trainer_profile_name,
      status: r.status,
      run_by_name: r.run_by_name,
      issued_at: r.issued_at,
      uploaded_at: r.uploaded_at,
      result_rank: r.result_rank,
      counts_for_admission: r.counts_for_admission,
    }));
  const list: RehearsalList = { admission: admissionFor(sc, fingerprint), items };
  return ok(list);
};

const createRehearsalHandler: Handler = (req, params, user) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  if (sc.seed.status === "archived") {
    return problem({ status: 409, type: "archived", title: "Архивный сценарий недоступен для репетиций" });
  }
  const check = checkDocument(sc.doc);
  if (check.blocking > 0) {
    return problem({ status: 422, type: "scenario_check_failed", title: "Проверка сценария не пройдена" });
  }
  const body = asRecord(req.body);
  const difficulty = body ? asString(body.difficulty) : null;
  if (difficulty !== "easy" && difficulty !== "normal" && difficulty !== "hard") {
    return validationFailed([{ path: "/difficulty", message: "Нужен difficulty" }]);
  }
  const profileId = (body && asString(body.trainer_profile_id)) || defaultProfileId();
  const profile = state.profiles.get(profileId);
  if (!profile) return notFound("Профиль тренажёра не найден");
  const fingerprint = draftFingerprint(sc);
  const rehearsal = {
    id: newId(),
    scenario_id: sc.seed.id,
    fingerprint,
    difficulty: difficulty as Difficulty,
    trainer_profile_id: profile.public.id,
    trainer_profile_name: profile.public.name,
    status: "link_issued" as const,
    run_by_name: user.full_name,
    issued_at: nowIso(),
    uploaded_at: null,
    result_rank: null as FinalRank | null,
    counts_for_admission: false,
    profile_revision: profile.public.revision,
    link_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    redeemed_at: null,
    engine_version: null,
    final_id: null,
    result: null,
    record: null,
  };
  sc.rehearsals.unshift(rehearsal);
  const link: RehearsalLink = {
    rehearsal_id: rehearsal.id,
    link: `http://localhost:3000/t/#rehearsal=${genToken(32)}`,
    expires_at: rehearsal.link_expires_at,
    fingerprint,
    difficulty: rehearsal.difficulty,
    trainer_profile_id: profile.public.id,
    trainer_profile_name: profile.public.name,
  };
  return created(link);
};

function defaultProfileId(): string {
  for (const p of state.profiles.values()) if (p.public.is_default) return p.public.id;
  return [...state.profiles.keys()][0];
}

const getRehearsalHandler: Handler = (_req, params) => {
  for (const sc of state.scenarios.values()) {
    const rehearsal = sc.rehearsals.find((r) => r.id === params.rehearsalId);
    if (rehearsal) return ok(deepClone(rehearsal));
  }
  return notFound("Репетиция не найдена");
};

// ---------------------------------------------------------------------------
// Обработчики: здоровье сценария
// ---------------------------------------------------------------------------

const ALL_STATUSES: SessionStatus[] = ["in_progress", "completed", "ended_by_participant", "turn_limit", "time_limit", "connection_lost", "abandoned"];

function versionSessions(sc: MockScenario, versionNumber: number): MockSession[] {
  return [...state.sessions.values()].filter(
    (s) => s.header.scenario_id === sc.seed.id && s.header.version_number === versionNumber,
  );
}

const healthHandler: Handler = (req, params) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  const version = sc.versions.find((v) => v.number === Number(params.n));
  if (!version) return notFound("Версия не найдена");
  const difficulty = req.query.get("difficulty");
  let sessions = versionSessions(sc, version.number);
  if (difficulty) sessions = sessions.filter((s) => s.header.difficulty === difficulty);
  const n = sessions.length;
  const labels = labelsOf(sc.seed.id);

  const by_status = Object.fromEntries(ALL_STATUSES.map((st) => [st, 0])) as Record<SessionStatus, number>;
  const finalsMap = new Map<string, { final_id: string; final_title: string; result_rank: FinalRank; n: number }>();
  const byDifficulty = new Map<Difficulty, Partial<Record<FinalRank, number>>>();
  const breakPoints = new Map<string, number>();
  const violationKinds = new Map<string, number>();
  let violationSessions = 0;
  let turnsSum = 0;
  const stagesReached = new Set<string>();
  const factsRevealed = new Set<string>();

  for (const s of sessions) {
    by_status[s.header.status] += 1;
    turnsSum += s.header.participant_turns;
    const rank = s.score_columns.result_rank;
    if (s.score_columns.final_id && rank) {
      const key = s.score_columns.final_id;
      const current = finalsMap.get(key);
      if (current) current.n += 1;
      else finalsMap.set(key, { final_id: key, final_title: s.score_columns.final_title ?? labels.finals[key] ?? key, result_rank: rank, n: 1 });
    }
    if (rank) {
      const map = byDifficulty.get(s.header.difficulty) ?? {};
      map[rank] = (map[rank] ?? 0) + 1;
      byDifficulty.set(s.header.difficulty, map);
    }
    if (s.break_stage) breakPoints.set(s.break_stage, (breakPoints.get(s.break_stage) ?? 0) + 1);
    if ((s.flags.opponent_violation_count ?? 0) > 0) {
      violationSessions += 1;
      for (const v of s.opponent_violations) for (const k of v.kinds) violationKinds.set(k, (violationKinds.get(k) ?? 0) + 1);
    }
    for (const st of s.stages_reached) stagesReached.add(st);
    for (const f of s.facts_revealed) factsRevealed.add(f);
  }

  const doc = sc.versions.find((v) => v.number === version.number)?.document as unknown as MockScenarioDoc | undefined;
  const stagesNever = (doc?.stages ?? [])
    .map((s) => ({ stage_id: String(s.id), title: String(s.title ?? s.id) }))
    .filter((s) => !stagesReached.has(s.stage_id));
  const factsNever = (doc?.facts ?? [])
    .filter((f) => f.hidden === true)
    .map((f) => ({ fact_id: String(f.id), label: String(f.label ?? f.id) }))
    .filter((f) => !factsRevealed.has(f.fact_id));

  const health: ScenarioHealth = {
    scenario_version_id: version.id,
    sample: { n, small: n < 30 } satisfies SmallSample,
    labels,
    running_now: sessions.filter((s) => s.header.status === "in_progress").length,
    by_status,
    finals: [...finalsMap.values()].sort((a, b) => (a.result_rank < b.result_rank ? -1 : 1)),
    stages_never_reached: stagesNever,
    facts_never_found: factsNever,
    avg_participant_turns: n > 0 ? Math.round(turnsSum / n) : null,
    breaks: {
      share: n > 0 ? breakPoints.size / n : 0,
      points: [...breakPoints.entries()].map(([stage, cnt]) => ({ stage, n: cnt })),
    },
    by_difficulty: [...byDifficulty.entries()].map(([d, ranks]) => ({
      difficulty: d,
      sample: { n: Object.values(ranks).reduce((a, b) => a + (b ?? 0), 0), small: true } satisfies SmallSample,
      ranks,
    })),
    opponent_violations: {
      sessions_share: n > 0 ? violationSessions / n : 0,
      by_kind: Object.fromEntries(violationKinds.entries()),
    },
    empty_note: n === 0 ? "По этой версии ещё нет сессий." : null,
  };
  return ok(health);
};

const healthSessionsHandler: Handler = (req, params) => {
  const sc = getScenario(params.id);
  if (!sc) return notFound("Сценарий не найден");
  const version = sc.versions.find((v) => v.number === Number(params.n));
  if (!version) return notFound("Версия не найдена");
  let sessions = versionSessions(sc, version.number);
  const finalId = req.query.get("final_id");
  const breakStage = req.query.get("break_stage");
  const withViolations = req.query.get("with_violations");
  const difficulty = req.query.get("difficulty");
  if (finalId) sessions = sessions.filter((s) => s.score_columns.final_id === finalId);
  if (breakStage) sessions = sessions.filter((s) => s.break_stage === breakStage);
  if (withViolations === "true") sessions = sessions.filter((s) => (s.flags.opponent_violation_count ?? 0) > 0);
  if (difficulty) sessions = sessions.filter((s) => s.header.difficulty === difficulty);
  const labels = labelsOf(sc.seed.id);
  const items: HealthSessionItem[] = sessions.map((s) => ({
    session_id: s.session_id,
    started_at: s.header.started_at,
    difficulty: s.header.difficulty,
    status: s.header.status,
    full_access: true,
    final_title: s.score_columns.final_title ?? (s.score_columns.final_id ? labels.finals[s.score_columns.final_id] ?? null : null),
    result_rank: s.score_columns.result_rank,
    break_stage: s.break_stage,
    opponent_violation_count: s.flags.opponent_violation_count ?? 0,
  }));
  return ok(paginate(items, req.query));
};

// ---------------------------------------------------------------------------
// Обработчики: сессии
// ---------------------------------------------------------------------------

function applySessionFilters(req: MockPortalRequest, items: MockSession[]): MockSession[] {
  const groupId = req.query.get("group_id");
  const subjectId = req.query.get("subject_id");
  const assignmentId = req.query.get("assignment_id");
  const scenarioId = req.query.get("scenario_id");
  const scenarioVersionId = req.query.get("scenario_version_id");
  const difficulty = req.query.get("difficulty");
  const criteriaSet = req.query.get("criteria_set");
  const scoringProfile = req.query.get("scoring_profile");
  const mode = req.query.get("mode");
  const status = req.query.get("status");
  const flag = req.query.get("flag");
  const from = parseDate(req.query.get("from"));
  const to = parseDate(req.query.get("to"));
  let out = items;
  if (groupId) out = out.filter((s) => s.group_id === groupId);
  if (subjectId) out = out.filter((s) => s.person.subject_id === subjectId);
  if (assignmentId) out = out.filter((s) => s.assignment_id === assignmentId);
  if (scenarioId) out = out.filter((s) => s.header.scenario_id === scenarioId);
  if (scenarioVersionId) {
    out = out.filter((s) => {
      const sc = state.scenarios.get(s.header.scenario_id);
      const v = sc?.versions.find((vv) => vv.number === s.header.version_number);
      return v?.id === scenarioVersionId;
    });
  }
  if (difficulty) out = out.filter((s) => s.header.difficulty === difficulty);
  if (criteriaSet) out = out.filter((s) => s.header.criteria_set === criteriaSet);
  if (scoringProfile) out = out.filter((s) => s.header.scoring_profile === scoringProfile);
  if (mode) out = out.filter((s) => s.header.mode === mode);
  if (status) out = out.filter((s) => s.header.status === status);
  if (flag) {
    out = out.filter((s) => {
      switch (flag) {
        case "simplified": return s.flags.simplified === true;
        case "opponent_violation": return (s.flags.opponent_violation_count ?? 0) > 0;
        case "unreviewed": return s.review_needed && !s.flags.reviewed;
        case "lucky": return s.flags.lucky === true;
        case "objection": return s.flags.has_objection === true;
        default: return true;
      }
    });
  }
  if (from !== null) out = out.filter((s) => Date.parse(s.header.started_at) >= from);
  if (to !== null) out = out.filter((s) => Date.parse(s.header.started_at) < to);
  const sort = req.query.get("sort") ?? "started_at_desc";
  out = [...out].sort((a, b) =>
    sort === "started_at_asc"
      ? Date.parse(a.header.started_at) - Date.parse(b.header.started_at)
      : Date.parse(b.header.started_at) - Date.parse(a.header.started_at),
  );
  return out;
}

const listSessionsHandler: Handler = (req, _params, user) => {
  const groupFilter = req.query.get("group_id");
  if (groupFilter && !hasGroupAccess(user, groupFilter)) return forbiddenGroup();
  const filtered = applySessionFilters(req, [...state.sessions.values()]);
  return ok(paginate(filtered.map(sessionListItemOf), req.query));
};

function sessionResultOf(s: MockSession): SessionResult {
  const decisions = [
    ...s.decisions.map((d) => ({ id: d.id, decision: d.decision, decided_at: d.decided_at, decided_by_name: d.decided_by_name })),
    ...[...state.decisions.values()]
      .filter((d) => d.session_ids.includes(s.session_id) && !s.decisions.some((sd) => sd.id === d.id))
      .map((d) => ({ id: d.id, decision: d.decision, decided_at: d.decided_at, decided_by_name: d.decided_by_name })),
  ];
  return {
    header: deepClone(s.header),
    person: deepClone(s.person),
    marks: deepClone(s.marks),
    score_columns: deepClone(s.score_columns),
    flags: deepClone(s.flags),
    labels: labelsOf(s.header.scenario_id),
    transcript: deepClone(s.transcript),
    objections: deepClone(s.objections),
    decisions,
    group_id: s.group_id,
    final_condition_text: s.final_condition_text,
    epilogue: s.epilogue,
    scores: deepClone(s.scores),
    scored_at: s.header.ended_at,
    summary: deepClone(s.summary),
    opponent_violations: deepClone(s.opponent_violations),
    simplified_replies: [...s.simplified_replies],
    review: deepClone(s.review),
    review_needed: s.review_needed,
  };
}

function checkSessionAccess(user: PortalUser, s: MockSession): MockPortalResponse | null {
  if (!hasGroupAccess(user, s.group_id)) return forbiddenGroup();
  return null;
}

const getSessionHandler: Handler = (req, params, user) => {
  const s = getSession(params.sessionId);
  if (!s) return notFound("Сессия не найдена");
  const denied = checkSessionAccess(user, s);
  if (denied) return denied;
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "session_opened", session_id: s.session_id, group_id: s.group_id, group_name: groupName(s.group_id),
    subject_number: s.person.number,
  });
  return ok(sessionResultOf(s));
};

const getSessionRecordHandler: Handler = (_req, params, user) => {
  const s = getSession(params.sessionId);
  if (!s) return notFound("Сессия не найдена");
  const denied = checkSessionAccess(user, s);
  if (denied) return denied;
  const profile = state.profiles.get(s.profile_id);
  const conditions: SessionConditions = {
    scenario_version_id:
      state.scenarios.get(s.header.scenario_id)?.versions.find((v) => v.number === s.header.version_number)?.id ?? "",
    fingerprint: s.header.fingerprint ?? "",
    engine_version: ENGINE_VERSION,
    criteria_set: s.header.criteria_set,
    trainer_profile_id: s.profile_id,
    trainer_profile_name: profile?.public.name ?? "",
    profile_revision: profile?.public.revision ?? 0,
    profile_snapshot: deepClone(profile?.public.settings ?? {}),
    external_ai_allowed: s.external_ai_allowed,
    judge_attempts: s.flags.judge_attempts ?? 0,
    reopened_count: s.flags.reopened_count ?? 0,
  };
  const record: SessionRecord = {
    header: deepClone(s.header),
    person: deepClone(s.person),
    labels: labelsOf(s.header.scenario_id),
    turns: deepClone(s.turns),
    incidents: deepClone(s.incidents),
    conditions,
    final_condition_text: s.final_condition_text,
    audio_note: "Голос в первой версии не записывается.",
  };
  return ok(record);
};

const reviewSessionHandler: Handler = (_req, params, user) => {
  const s = getSession(params.sessionId);
  if (!s) return notFound("Сессия не найдена");
  const denied = checkSessionAccess(user, s);
  if (denied) return denied;
  if (s.header.status === "in_progress") {
    return problem({ status: 409, type: "not_reviewable", title: "Сессия ещё идёт — отметить нельзя" });
  }
  if (s.flags.reviewed) {
    return problem({ status: 409, type: "already_reviewed", title: "Сессия уже отмечена как просмотренная" });
  }
  const review: Review = {
    reviewed_at: nowIso(),
    reviewed_by_name: user.full_name,
    reviewed_violation_count: s.flags.opponent_violation_count ?? 0,
  };
  s.review = review;
  s.flags.reviewed = true;
  s.review_needed = false;
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "session_reviewed", session_id: s.session_id, group_id: s.group_id, group_name: groupName(s.group_id),
  });
  return ok(deepClone(review));
};

const reducedSessionHandler: Handler = (_req, params, user) => {
  const s = getSession(params.sessionId);
  if (!s) return notFound("Сессия не найдена");
  const denied = checkSessionAccess(user, s);
  if (denied) return denied;
  if (s.header.is_demo) return notFound("Демо-сессия недоступна");
  const reduced: ReducedSession = {
    session_id: s.session_id,
    scenario_version_id:
      state.scenarios.get(s.header.scenario_id)?.versions.find((v) => v.number === s.header.version_number)?.id ?? "",
    difficulty: s.header.difficulty,
    status: s.header.status,
    labels: labelsOf(s.header.scenario_id),
    final_title: s.score_columns.final_title,
    final_condition_text: s.final_condition_text,
    result_rank: s.score_columns.result_rank,
    break_stage: s.break_stage,
    turns: s.turns.map((t) => ({
      reply_no: t.reply_no,
      speaker: t.speaker,
      stage: t.stage ?? "",
      transition_to: t.transition_to ?? null,
      move_type: t.move_type ?? null,
      offer: t.offer ?? null,
      revealed_facts: t.revealed_facts ?? [],
      interrupted: t.interrupted ?? false,
      opponent_violation_kinds: t.opponent_violation ? ["beyond_limit"] : [],
    })),
  };
  return ok(reduced);
};

// ---------------------------------------------------------------------------
// Обработчики: назначения
// ---------------------------------------------------------------------------

const listAssignmentsHandler: Handler = (req, _params, user) => {
  const groupFilter = req.query.get("group_id");
  if (groupFilter && !hasGroupAccess(user, groupFilter)) return forbiddenGroup();
  let items = [...state.assignments.values()];
  const idFilter = req.query.get("id");
  const subjectId = req.query.get("subject_id");
  const scenarioId = req.query.get("scenario_id");
  const status = req.query.get("status");
  const batchId = req.query.get("batch_id");
  const dueBefore = parseDate(req.query.get("due_before"));
  if (idFilter) items = items.filter((a) => a.id === idFilter);
  if (groupFilter) items = items.filter((a) => a.group_id === groupFilter);
  if (subjectId) items = items.filter((a) => a.person.subject_id === subjectId);
  if (scenarioId) items = items.filter((a) => a.scenario_id === scenarioId);
  if (status) items = items.filter((a) => a.status === status);
  if (batchId) items = items.filter((a) => a.batch_id === batchId);
  if (dueBefore !== null) items = items.filter((a) => Date.parse(a.due_at) < dueBefore);
  items = [...items].sort((a, b) => Date.parse(b.created_at ?? a.due_at) - Date.parse(a.created_at ?? b.due_at));
  return ok(paginate(items.map(assignmentOut), req.query));
};

function assignmentCreateResult(createdList: IssuedCode[], skipped: Array<{ subject_id: string; assignment_id: string | null; reason: string }>, batchId: string | null): AssignmentCreateResult {
  return { created: createdList, skipped, batch_id: batchId };
}

const createAssignmentsHandler: Handler = (req, _params, user) => {
  const body = asRecord(req.body);
  const subjectIds = body ? asStringArray(body.subject_ids) : null;
  const scenarioVersionId = body ? asString(body.scenario_version_id) : null;
  const difficulty = body ? asString(body.difficulty) : null;
  const dueAt = body ? asString(body.due_at) : null;
  if (!subjectIds || subjectIds.length === 0 || !scenarioVersionId || !dueAt) {
    return validationFailed([
      { path: "/subject_ids", message: "Нужны subject_ids, scenario_version_id, due_at" },
    ]);
  }
  if (difficulty !== "easy" && difficulty !== "normal" && difficulty !== "hard") {
    return validationFailed([{ path: "/difficulty", message: "Нужен difficulty" }]);
  }
  const found = findVersionById(scenarioVersionId);
  if (!found) return notFound("Версия сценария не найдена");
  const { scenario, version } = found;
  const batchId = newId();
  const createdList: IssuedCode[] = [];
  const skipped: Array<{ subject_id: string; assignment_id: string | null; reason: string }> = [];
  for (const subjectId of subjectIds.slice(0, 500)) {
    const person = findPerson(subjectId);
    if (!person) {
      skipped.push({ subject_id: subjectId, assignment_id: null, reason: "сотрудник не найден" });
      continue;
    }
    if (scenario.seed.mode === "assessment" && !person.full_name) {
      skipped.push({ subject_id: subjectId, assignment_id: null, reason: "не назначено — нет ФИО" });
      continue;
    }
    const group = state.groups.get(person.group_id);
    const profileId = (body && asString(body.trainer_profile_id)) || group?.trainer_profile_id || defaultProfileId();
    const code = genCode();
    const assignment: AssignmentFixture = {
      id: newId(),
      access_code: code,
      code_issued_at: nowIso(),
      code_failed_attempts: 0,
      code_blocked_at: null,
      person: personRefOf(person),
      group_id: person.group_id,
      scenario_id: scenario.seed.id,
      scenario_version_id: version.id,
      version_number: version.number,
      mode: scenario.seed.mode,
      difficulty: difficulty as Difficulty,
      trainer_profile_id: profileId,
      due_at: dueAt,
      status: "not_started",
      scenario_title: scenario.seed.title,
      trainer_profile_name: state.profiles.get(profileId)?.public.name ?? null,
      batch_id: batchId,
      created_at: nowIso(),
      created_by_name: user.full_name,
    };
    state.assignments.set(assignment.id, assignment);
    createdList.push({ assignment_id: assignment.id, person: personRefOf(person), code, link: codeLink(code) });
  }
  if (createdList.length === 0) {
    return validationFailed([{ path: "/subject_ids", message: "Никто не назначен" }], "Никого не назначено");
  }
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "assignment_created", group_id: createdList[0] ? state.assignments.get(createdList[0].assignment_id)?.group_id ?? null : null,
    group_name: createdList[0] ? groupName(state.assignments.get(createdList[0].assignment_id)?.group_id ?? "") : null,
    details: { batch_id: batchId, count: createdList.length },
  });
  for (const c of createdList) {
    addAudit({
      actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
      action: "code_issued", subject_number: c.person.number, group_id: state.assignments.get(c.assignment_id)?.group_id ?? null,
      group_name: groupName(state.assignments.get(c.assignment_id)?.group_id ?? ""),
    });
  }
  return created(assignmentCreateResult(createdList, skipped, batchId));
};

const reissueCodesHandler: Handler = (req, _params, user) => {
  const body = asRecord(req.body);
  const ids = body ? asStringArray(body.assignment_ids) : null;
  if (!ids || ids.length === 0) return invalidBody("Ожидалось поле assignment_ids");
  const createdList: IssuedCode[] = [];
  for (const assignmentId of ids.slice(0, 500)) {
    const assignment = state.assignments.get(assignmentId);
    if (!assignment) return notFound(`Назначение ${assignmentId} не найдено`);
    const code = genCode();
    assignment.access_code = code;
    assignment.code_issued_at = nowIso();
    assignment.code_failed_attempts = 0;
    assignment.code_blocked_at = null;
    if (assignment.status === "code_blocked") assignment.status = "not_started";
    createdList.push({ assignment_id: assignment.id, person: deepClone(assignment.person), code, link: codeLink(code) });
    addAudit({
      actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
      action: "code_reissued", subject_number: assignment.person.number, group_id: assignment.group_id, group_name: groupName(assignment.group_id),
    });
  }
  return ok(assignmentCreateResult(createdList, [], null));
};

const patchAssignmentHandler: Handler = (req, params, user) => {
  const assignment = state.assignments.get(params.assignmentId);
  if (!assignment) return notFound("Назначение не найдено");
  const body = asRecord(req.body);
  const dueAt = body ? asString(body.due_at) : null;
  if (!dueAt) return validationFailed([{ path: "/due_at", message: "Нужен due_at" }]);
  assignment.due_at = dueAt;
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "assignment_extended", subject_number: assignment.person.number, group_id: assignment.group_id, group_name: groupName(assignment.group_id),
  });
  return ok(assignmentOut(assignment));
};

const cancelAssignmentHandler: Handler = (_req, params, user) => {
  const assignment = state.assignments.get(params.assignmentId);
  if (!assignment) return notFound("Назначение не найдено");
  if (assignment.status === "cancelled") {
    return problem({ status: 409, type: "nothing_changed", title: "Назначение уже отменено" });
  }
  const running = [...state.sessions.values()].some(
    (s) => s.assignment_id === assignment.id && s.header.status === "in_progress",
  );
  assignment.status = "cancelled";
  assignment.cancelled_at = nowIso();
  assignment.cancel_reason = "by_hr";
  assignment.running_session_at_cancel = running;
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "assignment_cancelled", subject_number: assignment.person.number, group_id: assignment.group_id, group_name: groupName(assignment.group_id),
    details: { running_session: running },
  });
  return ok(assignmentOut(assignment));
};

const unblockCodeHandler: Handler = (_req, params, user) => {
  const assignment = state.assignments.get(params.assignmentId);
  if (!assignment) return notFound("Назначение не найдено");
  assignment.code_failed_attempts = 0;
  assignment.code_blocked_at = null;
  if (assignment.status === "code_blocked") assignment.status = "not_started";
  const person = findPerson(assignment.person.subject_id);
  if (person) person.code_blocked = false;
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "code_unblocked", subject_number: assignment.person.number, group_id: assignment.group_id, group_name: groupName(assignment.group_id),
  });
  return ok(assignmentOut(assignment));
};

// ---------------------------------------------------------------------------
// Обработчики: группы и сотрудники
// ---------------------------------------------------------------------------

const listGroupsHandler: Handler = (req) => {
  const includeArchived = req.query.get("include_archived") === "true";
  let groups = [...state.groups.values()];
  if (!includeArchived) groups = groups.filter((g) => !g.archived_at);
  for (const g of groups) g.people_count = [...state.people.values()].filter((p) => p.group_id === g.id).length;
  return ok(groups.map((g) => deepClone(g)));
};

const createGroupHandler: Handler = (req, _params, user) => {
  const body = asRecord(req.body);
  const name = body ? asString(body.name) : null;
  if (!name || name.trim().length === 0) return validationFailed([{ path: "/name", message: "Нужно название группы" }]);
  const group = {
    id: newId(),
    name,
    has_access: true,
    department: body ? asString(body.department) : null,
    trainer_profile_id: body && asString(body.trainer_profile_id) ? asString(body.trainer_profile_id) : null,
    trainer_profile_name: null,
    people_count: 0,
    archived_at: null,
  };
  state.groups.set(group.id, group);
  addAudit({ actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name, action: "group_saved", group_id: group.id, group_name: group.name });
  return created(deepClone(group));
};

const patchGroupHandler: Handler = (req, params, user) => {
  const group = state.groups.get(params.groupId);
  if (!group) return notFound("Группа не найдена");
  const body = asRecord(req.body);
  if (!body) return invalidBody();
  if (body.name !== undefined) {
    const name = asString(body.name);
    if (!name) return validationFailed([{ path: "/name", message: "Название не может быть пустым" }]);
    group.name = name;
  }
  if (body.department !== undefined) group.department = asString(body.department);
  if (body.trainer_profile_id !== undefined) {
    const profileId = asString(body.trainer_profile_id);
    group.trainer_profile_id = profileId;
    group.trainer_profile_name = profileId ? state.profiles.get(profileId)?.public.name ?? null : null;
  }
  if (body.archived !== undefined) group.archived_at = body.archived === true ? nowIso() : null;
  addAudit({ actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name, action: "group_saved", group_id: group.id, group_name: group.name });
  return ok(deepClone(group));
};

const listPeopleHandler: Handler = (req, _params, user) => {
  const groupFilter = req.query.get("group_id");
  if (groupFilter && !hasGroupAccess(user, groupFilter)) return forbiddenGroup();
  const q = (req.query.get("q") ?? "").toLowerCase();
  let people = [...state.people.values()];
  if (groupFilter) people = people.filter((p) => p.group_id === groupFilter);
  if (q) {
    people = people.filter((p) =>
      [p.full_name, p.pseudonym, p.personnel_no, p.number].some((v) => v !== null && v.toLowerCase().includes(q)),
    );
  }
  const items: Person[] = people.map((p) => {
    const { consents, anonymized, ...person } = p;
    void consents; void anonymized;
    return deepClone(person) as Person;
  });
  return ok(paginate(items, req.query));
};

const createPersonHandler: Handler = (req, _params, user) => {
  const body = asRecord(req.body);
  if (!body) return invalidBody();
  const fullName = asString(body.full_name);
  const pseudonym = asString(body.pseudonym);
  if (!fullName && !pseudonym) {
    return validationFailed([{ path: "/full_name", message: "Нужно ФИО или псевдоним" }]);
  }
  const groupId = asString(body.group_id);
  if (!groupId || !state.groups.has(groupId)) return validationFailed([{ path: "/group_id", message: "Группа не найдена" }]);
  const person: PersonFixture = {
    subject_id: newId(),
    number: genNumber(),
    group_id: groupId,
    group_name: state.groups.get(groupId)?.name ?? undefined,
    full_name: fullName,
    pseudonym,
    personnel_no: asString(body.personnel_no),
    job_title: asString(body.job_title),
    code_blocked: false,
    consents: [],
    anonymized: false,
  };
  state.people.set(person.subject_id, person);
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "person_saved", subject_number: person.number, group_id: groupId, group_name: groupName(groupId),
  });
  const { consents, anonymized, ...out } = person;
  void consents; void anonymized;
  return created(deepClone(out));
};

function genNumber(): string {
  return `N-${genToken(6).toUpperCase().replace(/[^0-9A-Z]/g, "X")}`;
}

const getPersonHandler: Handler = (_req, params, user) => {
  const person = findPerson(params.subjectId);
  if (!person) return notFound("Сотрудник не найден");
  if (!hasGroupAccess(user, person.group_id)) return forbiddenGroup();
  const assignments = [...state.assignments.values()]
    .filter((a) => a.person.subject_id === person.subject_id)
    .sort((a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""))
    .map(assignmentOut);
  const objections = [...state.sessions.values()]
    .filter((s) => s.person.subject_id === person.subject_id)
    .flatMap((s) => s.objections.map((o) => deepClone(o)));
  const decisions = [...state.decisions.values()].filter((d) => d.subject_id === person.subject_id).map((d) => deepClone(d));
  const attemptsTotal = [...state.sessions.values()].filter((s) => s.person.subject_id === person.subject_id).length;
  const { consents, anonymized, ...personOut } = person;
  void anonymized;
  return ok({
    person: deepClone(personOut),
    assignments,
    consents: deepClone(consents),
    objections,
    decisions,
    results_visible: true,
    attempts_total: attemptsTotal,
  });
};

const patchPersonHandler: Handler = (req, params, user) => {
  const person = findPerson(params.subjectId);
  if (!person) return notFound("Сотрудник не найден");
  const body = asRecord(req.body);
  if (!body) return invalidBody();
  if (body.group_id !== undefined) {
    const groupId = asString(body.group_id);
    if (!groupId || !state.groups.has(groupId)) return validationFailed([{ path: "/group_id", message: "Группа не найдена" }]);
    person.group_id = groupId;
    person.group_name = state.groups.get(groupId)?.name ?? undefined;
  }
  if (body.full_name !== undefined) person.full_name = asString(body.full_name);
  if (body.pseudonym !== undefined) person.pseudonym = asString(body.pseudonym);
  if (body.personnel_no !== undefined) person.personnel_no = asString(body.personnel_no);
  if (body.job_title !== undefined) person.job_title = asString(body.job_title);
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "person_saved", subject_number: person.number, group_id: person.group_id, group_name: groupName(person.group_id),
  });
  const { consents, anonymized, ...out } = person;
  void consents; void anonymized;
  return ok(deepClone(out));
};

const personProgressHandler: Handler = (_req, params, user) => {
  const person = findPerson(params.subjectId);
  if (!person) return notFound("Сотрудник не найден");
  if (!hasGroupAccess(user, person.group_id)) return forbiddenGroup();
  const sessions = [...state.sessions.values()]
    .filter((s) => s.person.subject_id === person.subject_id && s.header.status !== "in_progress")
    .sort((a, b) => Date.parse(a.header.started_at) - Date.parse(b.header.started_at));
  const lineMap = new Map<string, MockSession[]>();
  for (const s of sessions) {
    const sc = state.scenarios.get(s.header.scenario_id);
    const v = sc?.versions.find((vv) => vv.number === s.header.version_number);
    const key = `${v?.id ?? s.header.scenario_id}:${s.header.difficulty}`;
    const arr = lineMap.get(key) ?? [];
    arr.push(s);
    lineMap.set(key, arr);
  }
  const lines = [...lineMap.entries()].map(([key, arr]) => {
    const first = arr[0];
    const criteriaWithoutGrowth: Criterion[] = [];
    if (arr.length >= 3 && first.score_columns.criteria_bands && arr[arr.length - 1].score_columns.criteria_bands) {
      for (const c of Object.keys(first.score_columns.criteria_bands) as Criterion[]) {
        const a0 = first.score_columns.criteria_bands[c];
        const a1 = arr[arr.length - 1].score_columns.criteria_bands?.[c];
        if (a0 !== undefined && a1 !== undefined && a1 <= a0) criteriaWithoutGrowth.push(c);
      }
    }
    const [versionId] = key.split(":");
    return {
      scenario_version_id: versionId,
      scenario_title: first.header.scenario_title,
      version_number: first.header.version_number,
      difficulty: first.header.difficulty,
      criteria_set: first.header.criteria_set,
      mode: first.header.mode,
      points: arr.map((s) => ({
        session_id: s.session_id,
        started_at: s.header.started_at,
        result_rank: s.score_columns.result_rank,
        result_number: s.score_columns.result_number,
        process_number: s.score_columns.process_number,
        criteria_bands: s.score_columns.criteria_bands ? deepClone(s.score_columns.criteria_bands) : null,
        simplified: s.flags.simplified === true,
        opponent_violations: (s.flags.opponent_violation_count ?? 0) > 0,
      })),
      criteria_without_growth: criteriaWithoutGrowth,
      sample: { n: arr.length, small: arr.length < 3 } satisfies SmallSample,
    };
  });
  return ok({ subject_id: person.subject_id, lines });
};

const writtenConsentHandler: Handler = (req, params, user) => {
  const person = findPerson(params.subjectId);
  if (!person) return notFound("Сотрудник не найден");
  const body = asRecord(req.body);
  const documentRef = body ? asString(body.document_ref) : null;
  const channel = body ? asString(body.document_channel) : null;
  const signedOn = body ? asString(body.signed_on) : null;
  if (!documentRef || (channel !== "paper" && channel !== "edo") || !signedOn) {
    return validationFailed([{ path: "/document_ref", message: "Нужны document_ref, document_channel, signed_on" }]);
  }
  const channelTyped: "paper" | "edo" = channel;
  const record = {
    id: newId(),
    kind: "written_assessment" as const,
    answer: "granted" as const,
    text_version: null,
    answered_at: nowIso(),
    document_ref: documentRef,
    document_channel: channelTyped,
    signed_on: signedOn,
    valid_until: body ? asString(body.valid_until) : null,
    recorded_by_name: user.full_name,
  };
  person.consents.push(record);
  person.written_consent_valid_until = record.valid_until;
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "written_consent_recorded", subject_number: person.number, group_id: person.group_id, group_name: groupName(person.group_id),
  });
  return created(deepClone(record));
};

const consentWithdrawalHandler: Handler = (req, params, user) => {
  const person = findPerson(params.subjectId);
  if (!person) return notFound("Сотрудник не найден");
  const body = asRecord(req.body);
  const scope = body ? asString(body.scope) : null;
  const documentRef = body ? asString(body.document_ref) : null;
  if ((scope !== "all" && scope !== "external_ai") || !documentRef) {
    return validationFailed([{ path: "/scope", message: "Нужны scope (all|external_ai) и document_ref" }]);
  }
  if (scope === "all" && asString(body?.confirm_name) !== person.full_name) {
    return validationFailed([{ path: "/confirm_name", message: "Имя не совпадает с ФИО сотрудника" }], "Подтвердите ФИО для полного отзыва согласия");
  }
  const running = [...state.sessions.values()].some(
    (s) => s.person.subject_id === person.subject_id && s.header.status === "in_progress",
  );
  let cancelled = 0;
  if (scope === "all") {
    person.anonymized = true;
    person.full_name = null;
    person.pseudonym = null;
    for (const a of state.assignments.values()) {
      if (a.person.subject_id === person.subject_id && (a.status === "not_started" || a.status === "in_progress")) {
        a.status = "cancelled";
        a.cancelled_at = nowIso();
        a.cancel_reason = "consent_withdrawn";
        cancelled++;
      }
    }
    for (const s of state.sessions.values()) {
      if (s.person.subject_id !== person.subject_id) continue;
      for (const t of s.transcript) t.text = null;
      for (const t of s.turns) t.text = null;
      for (const o of s.objections) (o as { text: string | null }).text = null;
    }
  } else {
    person.external_ai_withdrawn_at = nowIso();
  }
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: scope === "all" ? "consent_withdrawn" : "external_ai_withdrawn",
    subject_number: person.number, group_id: person.group_id, group_name: groupName(person.group_id),
    details: { document_ref: documentRef },
  });
  return ok({
    scope,
    number: person.number,
    cancelled_assignments: scope === "all" ? cancelled : undefined,
    running_session: running,
    message: scope === "all" ? "Согласие отозвано. Связь с сотрудником уничтожена" : "Согласие на внешнюю нейросеть отозвано",
  });
};

const decisionCandidatesHandler: Handler = (_req, params, user) => {
  const person = findPerson(params.subjectId);
  if (!person) return notFound("Сотрудник не найден");
  if (!hasGroupAccess(user, person.group_id)) return forbiddenGroup();
  const sessions = [...state.sessions.values()]
    .filter((s) => s.person.subject_id === person.subject_id)
    .sort((a, b) => Date.parse(b.header.started_at) - Date.parse(a.header.started_at));
  const candidates: DecisionCandidate[] = sessions.map((s) => {
    const reasons: string[] = [];
    if (s.header.mode !== "assessment") reasons.push("сессия в режиме тренировки");
    if (s.header.status === "in_progress") reasons.push("сессия ещё идёт");
    if (s.flags.simplified) reasons.push("упрощённая сессия");
    if (s.score_columns.result_rank === null) reasons.push("сессия без результата");
    if ((s.flags.opponent_violation_count ?? 0) > 0 && !s.flags.reviewed) reasons.push("есть непроверенные нарушения оппонента");
    return {
      session: sessionListItemOf(s),
      eligible: reasons.length === 0,
      reasons,
      objections: deepClone(s.objections),
    };
  });
  return ok(candidates);
};

// ---------------------------------------------------------------------------
// Обработчики: аналитика
// ---------------------------------------------------------------------------

const CRITERIA: Criterion[] = ["diagnosis", "interests", "criteria", "alternative", "discipline", "conduct"];

function conditionsOf(sessions: MockSession[]): ComparisonCondition[] {
  const map = new Map<string, ComparisonCondition>();
  for (const s of sessions) {
    const sc = state.scenarios.get(s.header.scenario_id);
    const v = sc?.versions.find((vv) => vv.number === s.header.version_number);
    const key = `${s.header.mode}:${v?.id ?? ""}:${s.header.difficulty}:${s.header.criteria_set}:${s.header.scoring_profile ?? ""}`;
    const current = map.get(key);
    if (current) current.sessions_n += 1;
    else {
      map.set(key, {
        mode: s.header.mode,
        scenario_version_id: v?.id ?? "",
        difficulty: s.header.difficulty,
        criteria_set: s.header.criteria_set,
        scoring_profile: s.header.scoring_profile ?? "normal",
        sessions_n: 1,
        scenario_id: sc?.seed.id,
        scenario_title: sc?.seed.title,
        version_number: s.header.version_number,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.sessions_n - a.sessions_n);
}

const RANK_VALUE: Record<string, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };

const comparisonHandler: Handler = (req, _params, user) => {
  const groupId = req.query.get("group_id");
  if (!groupId) return validationFailed([{ path: "/group_id", message: "Нужен group_id" }]);
  if (!hasGroupAccess(user, groupId)) return forbiddenGroup();
  const scenarioVersionId = req.query.get("scenario_version_id");
  const difficulty = req.query.get("difficulty");
  const criteriaSet = req.query.get("criteria_set");
  const scoringProfile = req.query.get("scoring_profile");
  const sort = req.query.get("sort") === "process" ? "process" : "result";
  const includeSimplified = req.query.get("include_simplified") === "true";

  const groupSessions = [...state.sessions.values()].filter((s) => s.group_id === groupId && !s.header.is_demo);
  const available = conditionsOf(groupSessions);
  let matching = groupSessions;
  if (scenarioVersionId) {
    matching = matching.filter((s) => state.scenarios.get(s.header.scenario_id)?.versions.find((v) => v.number === s.header.version_number)?.id === scenarioVersionId);
  }
  if (difficulty) matching = matching.filter((s) => s.header.difficulty === difficulty);
  if (criteriaSet) matching = matching.filter((s) => s.header.criteria_set === criteriaSet);
  if (scoringProfile) matching = matching.filter((s) => s.header.scoring_profile === scoringProfile);

  const combos = conditionsOf(matching);
  const complete = Boolean(scenarioVersionId && difficulty && combos.length === 1);
  if (!complete) {
    const table = {
      complete: false,
      conditions: [],
      available_conditions: scenarioVersionId && difficulty ? combos : available,
      rows: [],
      training_note: null,
      sample: { n: 0, small: true } satisfies SmallSample,
      simplified_excluded: 0,
      sort,
    };
    return ok(table);
  }

  let rowsSessions = matching;
  let simplifiedExcluded = 0;
  if (!includeSimplified) {
    rowsSessions = matching.filter((s) => {
      if (s.flags.simplified) {
        simplifiedExcluded++;
        return false;
      }
      return true;
    });
  }
  const byPerson = new Map<string, MockSession[]>();
  for (const s of rowsSessions) {
    const arr = byPerson.get(s.person.subject_id) ?? [];
    arr.push(s);
    byPerson.set(s.person.subject_id, arr);
  }
  const rows: ComparisonRow[] = [...byPerson.entries()].map(([subjectId, arr]) => {
    const sorted = [...arr].sort((a, b) => Date.parse(b.header.started_at) - Date.parse(a.header.started_at));
    const best = [...sorted].sort((a, b) => {
      if (sort === "process") return (b.score_columns.process_number ?? -1) - (a.score_columns.process_number ?? -1);
      const ra = a.score_columns.result_rank ? RANK_VALUE[a.score_columns.result_rank] ?? 0 : 0;
      const rb = b.score_columns.result_rank ? RANK_VALUE[b.score_columns.result_rank] ?? 0 : 0;
      if (rb !== ra) return rb - ra;
      return (b.score_columns.result_number ?? -1) - (a.score_columns.result_number ?? -1);
    })[0];
    const flags: SessionFlags = {
      lucky: sorted.some((s) => s.flags.lucky),
      simplified: sorted.some((s) => s.flags.simplified),
      has_objection: sorted.some((s) => s.flags.has_objection),
      opponent_violation_count: Math.max(...sorted.map((s) => s.flags.opponent_violation_count ?? 0)),
      reviewed: sorted.every((s) => s.flags.reviewed),
      training: sorted[0]?.header.mode === "training",
    };
    void subjectId;
    return {
      person: deepClone(sorted[0].person),
      attempts: sorted.length,
      last_session_id: sorted[0].session_id,
      score_columns: deepClone(best.score_columns),
      flags,
    };
  });
  rows.sort((a, b) => {
    if (sort === "process") return (b.score_columns.process_number ?? -1) - (a.score_columns.process_number ?? -1);
    const ra = a.score_columns.result_rank ? RANK_VALUE[a.score_columns.result_rank] ?? 0 : 0;
    const rb = b.score_columns.result_rank ? RANK_VALUE[b.score_columns.result_rank] ?? 0 : 0;
    if (rb !== ra) return rb - ra;
    return (b.score_columns.result_number ?? -1) - (a.score_columns.result_number ?? -1);
  });
  const table = {
    complete: true,
    conditions: combos,
    available_conditions: [],
    rows,
    training_note: combos[0]?.mode === "training" ? "Тренировочные сессии не используются для кадровых решений." : null,
    sample: { n: rowsSessions.length, small: rowsSessions.length < 30 } satisfies SmallSample,
    simplified_excluded: simplifiedExcluded,
    sort,
  };
  return ok(table);
};

function filterAnalyticsSessions(req: MockPortalRequest, groupIds: string[]): MockSession[] {
  const from = parseDate(req.query.get("from"));
  const to = parseDate(req.query.get("to"));
  const scenarioId = req.query.get("scenario_id");
  const scenarioVersionId = req.query.get("scenario_version_id");
  const difficulty = req.query.get("difficulty");
  const mode = req.query.get("mode");
  const status = req.query.get("status");
  let sessions = [...state.sessions.values()].filter((s) => groupIds.includes(s.group_id));
  if (from !== null) sessions = sessions.filter((s) => Date.parse(s.header.started_at) >= from);
  if (to !== null) sessions = sessions.filter((s) => Date.parse(s.header.started_at) < to);
  if (scenarioId) sessions = sessions.filter((s) => s.header.scenario_id === scenarioId);
  if (scenarioVersionId) {
    sessions = sessions.filter((s) => state.scenarios.get(s.header.scenario_id)?.versions.find((v) => v.number === s.header.version_number)?.id === scenarioVersionId);
  }
  if (difficulty) sessions = sessions.filter((s) => s.header.difficulty === difficulty);
  if (mode) sessions = sessions.filter((s) => s.header.mode === mode);
  if (status) sessions = sessions.filter((s) => s.header.status === status);
  return sessions;
}

const groupsAnalyticsHandler: Handler = (req, _params, user) => {
  const groupIds = req.query.getAll("group_id");
  if (groupIds.length === 0) return validationFailed([{ path: "/group_id", message: "Нужен хотя бы один group_id" }]);
  if (groupIds.length > 5) return validationFailed([{ path: "/group_id", message: "Не больше 5 групп" }]);
  for (const gid of groupIds) if (!hasGroupAccess(user, gid)) return forbiddenGroup();
  if (groupIds.length >= 2 && (!req.query.get("scenario_version_id") || !req.query.get("difficulty"))) {
    return validationFailed([{ path: "/scenario_version_id", message: "Для сравнения групп нужны scenario_version_id и difficulty" }]);
  }
  const sessions = filterAnalyticsSessions(req, groupIds);
  const result: GroupAnalytics[] = groupIds.map((gid) => {
    const group = state.groups.get(gid);
    const gs = sessions.filter((s) => s.group_id === gid && s.header.status !== "in_progress");
    const n = gs.length;
    const weak: Array<{ criterion: Criterion; label: string; avg_band: number; n: number }> = CRITERIA.map((c) => {
      const withBand = gs.filter((s) => s.score_columns.criteria_bands);
      const values = withBand.map((s) => s.score_columns.criteria_bands?.[c]).filter((v): v is number => typeof v === "number");
      return {
        criterion: c,
        label: CRITERION_LABEL[c],
        avg_band: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        n: values.length,
      };
    })
      .filter((w) => w.n > 0)
      .sort((a, b) => a.avg_band - b.avg_band);
    const ranks: Partial<Record<FinalRank, number>> = {};
    for (const s of gs) if (s.score_columns.result_rank) ranks[s.score_columns.result_rank] = (ranks[s.score_columns.result_rank] ?? 0) + 1;
    const bins = (nums: Array<number | null>) => {
      const out = Array.from({ length: 10 }, () => 0);
      for (const v of nums) if (v !== null) out[Math.min(9, Math.floor(v / 10))] += 1;
      return out;
    };
    const headline = weak.length > 0 ? `Слабее всего — «${weak[0].label}» (средняя полоса ${weak[0].avg_band.toFixed(1)})` : null;
    return {
      group_id: gid,
      group_name: group?.name ?? gid,
      sample: { n, small: n < 30 } satisfies SmallSample,
      weak_criteria: weak.slice(0, 6).map((w) => ({ ...w, avg_band: Math.round(w.avg_band * 10) / 10 })),
      headline,
      result_ranks: ranks,
      result_numbers: bins(gs.map((s) => s.score_columns.result_number)),
      process_numbers: bins(gs.map((s) => s.score_columns.process_number)),
      empty_note: n === 0 ? "По выбранным условиям нет сессий." : null,
    };
  });
  return ok(result);
};

const criterionSessionsHandler: Handler = (req, params, user) => {
  const criterion = params.criterion as Criterion;
  if (!CRITERIA.includes(criterion)) return notFound("Критерий не найден");
  const groupIds = req.query.getAll("group_id");
  if (groupIds.length === 0) return validationFailed([{ path: "/group_id", message: "Нужен group_id" }]);
  for (const gid of groupIds) if (!hasGroupAccess(user, gid)) return forbiddenGroup();
  const maxBand = Number(req.query.get("max_band") ?? "1");
  const sessions = filterAnalyticsSessions(req, groupIds)
    .filter((s) => s.score_columns.criteria_bands && typeof s.score_columns.criteria_bands[criterion] === "number")
    .filter((s) => (s.score_columns.criteria_bands?.[criterion] ?? 99) <= maxBand)
    .sort((a, b) => Date.parse(b.header.started_at) - Date.parse(a.header.started_at));
  const items = sessions.map((s) => {
    const miss = s.summary.find((m) => m.kind === "miss");
    return {
      session_id: s.session_id,
      person: deepClone(s.person),
      started_at: s.header.started_at,
      band: s.score_columns.criteria_bands?.[criterion] ?? 0,
      example: miss ? { reply_no: miss.reply, quote: miss.quote, observation: miss.observation } : null,
    };
  });
  return ok(paginate(items, req.query));
};

// ---------------------------------------------------------------------------
// Обработчики: выгрузки
// ---------------------------------------------------------------------------

function exportSelect(body: Record<string, unknown>): MockSession[] {
  const filters = asRecord(body.filters) ?? {};
  const from = parseDate(asString(filters.from));
  const to = parseDate(asString(filters.to));
  const groupIds = asStringArray(filters.group_ids) ?? [];
  const subjectId = asString(filters.subject_id);
  const scenarioId = asString(filters.scenario_id);
  const scenarioVersionId = asString(filters.scenario_version_id);
  const difficulty = asString(filters.difficulty);
  const mode = asString(filters.mode);
  const statuses = asStringArray(filters.statuses) ?? [];
  let sessions = [...state.sessions.values()];
  if (from !== null) sessions = sessions.filter((s) => Date.parse(s.header.started_at) >= from);
  if (to !== null) sessions = sessions.filter((s) => Date.parse(s.header.started_at) < to);
  if (groupIds.length > 0) sessions = sessions.filter((s) => groupIds.includes(s.group_id));
  if (subjectId) sessions = sessions.filter((s) => s.person.subject_id === subjectId);
  if (scenarioId) sessions = sessions.filter((s) => s.header.scenario_id === scenarioId);
  if (scenarioVersionId) {
    sessions = sessions.filter((s) => state.scenarios.get(s.header.scenario_id)?.versions.find((v) => v.number === s.header.version_number)?.id === scenarioVersionId);
  }
  if (difficulty) sessions = sessions.filter((s) => s.header.difficulty === difficulty);
  if (mode) sessions = sessions.filter((s) => s.header.mode === mode);
  if (statuses.length > 0) sessions = sessions.filter((s) => statuses.includes(s.header.status));
  return sessions;
}

type CsvRow = Array<string | number | null>;

function exportRows(sessions: MockSession[], table: string): CsvRow[] {
  if (table === "turns") {
    const rows: CsvRow[] = [["session_id", "reply_no", "speaker", "stage", "move_type", "text", "at_ms"]];
    for (const s of sessions) {
      for (const t of s.turns) rows.push([s.session_id, t.reply_no, t.speaker, t.stage ?? "", t.move_type ?? "", t.text ?? "", t.at_ms]);
    }
    return rows;
  }
  const rows: CsvRow[] = [["session_id", "group", "person", "scenario", "version", "difficulty", "mode", "status", "rank", "result", "process", "started_at"]];
  for (const s of sessions) {
    rows.push([
      s.session_id,
      groupName(s.group_id) ?? s.group_id,
      s.person.display_name ?? s.person.number,
      s.header.scenario_title,
      s.header.version_number,
      s.header.difficulty,
      s.header.mode,
      s.header.status,
      s.score_columns.result_rank ?? "",
      s.score_columns.result_number ?? "",
      s.score_columns.process_number ?? "",
      s.header.started_at,
    ]);
  }
  return rows;
}

const exportsHandler: Handler = (req, _params, user) => {
  const body = asRecord(req.body);
  const slice = body ? asString(body.slice) : null;
  const table = body ? asString(body.table) : null;
  const format = body ? asString(body.format) : null;
  if (slice !== "group" && slice !== "employee" && slice !== "scenario") {
    return validationFailed([{ path: "/slice", message: "slice должен быть group|employee|scenario" }]);
  }
  if (table !== "summary" && table !== "turns") {
    return validationFailed([{ path: "/table", message: "table должен быть summary|turns" }]);
  }
  if (format !== "csv" && format !== "xlsx") {
    return validationFailed([{ path: "/format", message: "format должен быть csv|xlsx" }]);
  }
  if (!body || !asRecord(body.filters)) return validationFailed([{ path: "/filters", message: "Нужен объект filters" }]);
  const sessions = exportSelect(body);
  const rows = exportRows(sessions, table as string);
  const dataRows = Math.max(0, rows.length - 1);
  const dryRun = body.dry_run === true;
  if (dryRun) {
    const byGroup = new Map<string, number>();
    for (const s of sessions) byGroup.set(s.group_id, (byGroup.get(s.group_id) ?? 0) + 1);
    const preview: ExportPreview = {
      sessions: sessions.length,
      rows: dataRows,
      groups: [...byGroup.entries()].map(([gid, n]) => ({ id: gid, name: groupName(gid) ?? gid, rows: n })),
    };
    return ok(preview);
  }
  const firstGroup = sessions[0]?.group_id ?? null;
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "export_created", group_id: firstGroup, group_name: firstGroup ? groupName(firstGroup) : null,
    rows_count: dataRows, details: { slice, table, format },
  });
  const date = nowIso().slice(0, 10).replace(/-/g, "");
  return {
    status: 200,
    body: toCsv(rows),
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="arena-${slice}-${date}.${format === "xlsx" ? "xlsx" : "csv"}"`,
      "x-rows-count": String(dataRows),
    },
  };
};

// ---------------------------------------------------------------------------
// Обработчики: решения и возражения
// ---------------------------------------------------------------------------

function sessionEligibility(s: MockSession): string[] {
  const reasons: string[] = [];
  if (s.header.mode !== "assessment") reasons.push("сессия в режиме тренировки");
  if (s.header.status === "in_progress") reasons.push("сессия ещё идёт");
  if (s.flags.simplified) reasons.push("упрощённая сессия");
  if (s.score_columns.result_rank === null) reasons.push("сессия без результата");
  if ((s.flags.opponent_violation_count ?? 0) > 0 && !s.flags.reviewed) reasons.push("есть непроверенные нарушения оппонента");
  return reasons;
}

const createDecisionHandler: Handler = (req, _params, user) => {
  const body = asRecord(req.body);
  const subjectId = body ? asString(body.subject_id) : null;
  const decisionText = body ? asString(body.decision) : null;
  const grounds = body ? asString(body.grounds) : null;
  const sessionIds = body ? asStringArray(body.session_ids) : null;
  if (!subjectId || !decisionText || !grounds || !sessionIds || sessionIds.length === 0) {
    return validationFailed([
      { path: "/decision", message: "Нужны subject_id, decision, grounds, session_ids" },
    ]);
  }
  const person = findPerson(subjectId);
  if (!person) return notFound("Сотрудник не найден");
  if (!hasGroupAccess(user, person.group_id)) return forbiddenGroup();
  const errors: Array<{ path: string; message: string; code: null }> = [];
  for (const sessionId of sessionIds) {
    const s = getSession(sessionId);
    if (!s) {
      errors.push({ path: `/session_ids/${sessionId}`, message: "сессия не найдена", code: null });
      continue;
    }
    if (s.person.subject_id !== subjectId) {
      errors.push({ path: `/session_ids/${sessionId}`, message: "сессия другого сотрудника", code: null });
      continue;
    }
    const reasons = sessionEligibility(s);
    if (reasons.length > 0) {
      errors.push({ path: `/session_ids/${sessionId}`, message: reasons.join("; "), code: null });
    }
  }
  if (errors.length > 0) {
    return problem({ status: 422, type: "decision_ineligible", title: "Часть сессий непригодна для кадрового решения", errors });
  }
  const supersedesId = body ? asString(body.supersedes_id) : null;
  const decision: Decision = {
    id: newId(),
    subject_id: subjectId,
    decision: decisionText,
    grounds,
    decided_at: nowIso(),
    decided_by_name: user.full_name,
    session_ids: sessionIds,
    person: personRefOf(person),
    supersedes_id: supersedesId,
    superseded_by_id: null,
    objections: [],
  };
  if (supersedesId) {
    const old = state.decisions.get(supersedesId);
    if (old) old.superseded_by_id = decision.id;
  }
  state.decisions.set(decision.id, decision);
  for (const sessionId of sessionIds) {
    const s = getSession(sessionId);
    if (s) s.decisions.push({ id: decision.id, decision: decisionText, decided_at: decision.decided_at, decided_by_name: user.full_name });
  }
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "decision_recorded", subject_number: person.number, session_id: sessionIds[0] ?? null,
    group_id: person.group_id, group_name: groupName(person.group_id),
  });
  return created(deepClone(decision));
};

function portalObjections(): Objection[] {
  const out: Objection[] = [];
  for (const s of state.sessions.values()) {
    for (const o of s.objections) {
      out.push({
        id: o.id,
        session_id: s.session_id,
        person: deepClone(s.person),
        text: o.text,
        submitted_at: o.submitted_at,
        mode: s.header.mode,
        scenario_title: s.header.scenario_title,
        target: o.target ? deepClone(o.target) : null,
        response: o.response
          ? { text: o.response.text, responded_at: o.response.responded_at, responded_by_name: "Громова Наталья Сергеевна" }
          : null,
        has_decision: s.decisions.length > 0 || [...state.decisions.values()].some((d) => d.session_ids.includes(s.session_id)),
      });
    }
  }
  return out.sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));
}

const listObjectionsHandler: Handler = (req, _params, user) => {
  const groupFilter = req.query.get("group_id");
  if (groupFilter && !hasGroupAccess(user, groupFilter)) return forbiddenGroup();
  const status = req.query.get("status") ?? "open";
  const idFilter = req.query.get("id");
  let items = portalObjections();
  if (idFilter) items = items.filter((o) => o.id === idFilter);
  if (groupFilter) {
    const sessions = new Set(
      [...state.sessions.values()].filter((s) => s.group_id === groupFilter).map((s) => s.session_id),
    );
    items = items.filter((o) => sessions.has(o.session_id));
  }
  if (status === "open") items = items.filter((o) => o.response === null);
  else if (status === "answered") items = items.filter((o) => o.response !== null);
  return ok(paginate(items, req.query));
};

const respondObjectionHandler: Handler = (req, params, user) => {
  const body = asRecord(req.body);
  const text = body ? asString(body.text) : null;
  if (!text) return validationFailed([{ path: "/text", message: "Нужен текст ответа" }]);
  for (const s of state.sessions.values()) {
    const objection = s.objections.find((o) => o.id === params.objectionId);
    if (!objection) continue;
    if (!hasGroupAccess(user, s.group_id)) return forbiddenGroup();
    if (objection.response) {
      return problem({ status: 409, type: "already_answered", title: "На возражение уже дан ответ" });
    }
    objection.response = { text, responded_at: nowIso() };
    addAudit({
      actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
      action: "objection_answered", subject_number: s.person.number, session_id: s.session_id,
      group_id: s.group_id, group_name: groupName(s.group_id),
    });
    const portal = portalObjections().find((o) => o.id === objection.id);
    return ok(portal ?? deepClone(objection));
  }
  return notFound("Возражение не найдено");
};

// ---------------------------------------------------------------------------
// Обработчики: профили тренажёра
// ---------------------------------------------------------------------------

const listProfilesHandler: Handler = (req, _params, user) => {
  const includeArchived = req.query.get("include_archived") === "true";
  const keyLast4 = req.query.get("key_last4");
  if (keyLast4 !== null && user.role !== "admin") return forbiddenRole();
  let profiles = [...state.profiles.values()];
  if (!includeArchived) profiles = profiles.filter((p) => !p.public.archived_at);
  if (keyLast4 !== null) {
    profiles = profiles.filter(
      (p) => p.admin.openrouter_key_last4 === keyLast4 || p.admin.model_server_token_last4 === keyLast4,
    );
  }
  profiles = [...profiles].sort((a, b) => Number(b.public.is_default) - Number(a.public.is_default) || a.public.name.localeCompare(b.public.name, "ru"));
  return ok(profiles.map((p) => profileView(user, p.public.id)).filter((v): v is TrainerProfile => v !== null));
};

const createProfileHandler: Handler = (req, _params, user) => {
  const body = asRecord(req.body);
  const name = body ? asString(body.name) : null;
  if (!name || name.trim().length === 0) return validationFailed([{ path: "/name", message: "Нужно название профиля" }]);
  const sourceId = body ? asString(body.copy_from) : null;
  const source = sourceId ? state.profiles.get(sourceId) : null;
  if (sourceId && !source) return notFound("Профиль-источник не найден");
  const fixture = {
    public: {
      id: newId(),
      name,
      is_default: false,
      revision: 1,
      settings: deepClone(source?.public.settings ?? {}),
      has_openrouter_key: false,
      has_model_server_token: false,
      archived_at: null,
      updated_at: nowIso(),
    },
    admin: {
      openrouter_key_last4: null,
      model_server_token_last4: null,
      keys_changed_at: null,
      keys_changed_by_name: null,
      running_sessions: 0,
      same_key_profiles: [],
    },
    openrouter_key: null,
    model_server_token: null,
  };
  state.profiles.set(fixture.public.id, fixture);
  addAudit({ actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name, action: "profile_saved", details: { profile_id: fixture.public.id } });
  return created(profileView(user, fixture.public.id));
};

const getProfileHandler: Handler = (_req, params, user) => {
  const view = profileView(user, params.profileId);
  if (!view) return notFound("Профиль не найден");
  return ok(view);
};

const patchProfileHandler: Handler = (req, params, user) => {
  const p = state.profiles.get(params.profileId);
  if (!p) return notFound("Профиль не найден");
  const body = asRecord(req.body);
  if (!body) return invalidBody();
  if (body.name !== undefined) {
    const name = asString(body.name);
    if (!name) return validationFailed([{ path: "/name", message: "Название не может быть пустым" }]);
    p.public.name = name;
  }
  if (body.settings !== undefined) {
    const settings = asRecord(body.settings);
    if (!settings) return validationFailed([{ path: "/settings", message: "Нужен объект settings" }]);
    deepMerge(p.public.settings as unknown as Record<string, unknown>, settings);
  }
  p.public.revision += 1;
  p.public.updated_at = nowIso();
  addAudit({ actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name, action: "profile_saved", details: { profile_id: p.public.id } });
  return ok(profileView(user, p.public.id));
};

const putProfileKeysHandler: Handler = (req, params, user) => {
  const p = state.profiles.get(params.profileId);
  if (!p) return notFound("Профиль не найден");
  const body = asRecord(req.body);
  if (!body || (body.openrouter_key === undefined && body.model_server_token === undefined)) {
    return validationFailed([{ path: "/keys", message: "Нужен хотя бы один ключ" }]);
  }
  const errors: Array<{ path: string; message: string }> = [];
  const checkKey = (value: unknown, path: string): string | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string" || value.length < 8 || value.length > 500) {
      errors.push({ path, message: "Ключ: строка 8–500 символов или null" });
      return undefined;
    }
    return value;
  };
  const orKey = checkKey(body.openrouter_key, "/openrouter_key");
  const msToken = checkKey(body.model_server_token, "/model_server_token");
  if (errors.length > 0) return validationFailed(errors);
  if (orKey !== undefined) {
    p.openrouter_key = orKey;
    p.admin.openrouter_key_last4 = orKey ? orKey.slice(-4) : null;
    p.public.has_openrouter_key = orKey !== null;
  }
  if (msToken !== undefined) {
    p.model_server_token = msToken;
    p.admin.model_server_token_last4 = msToken ? msToken.slice(-4) : null;
    p.public.has_model_server_token = msToken !== null;
  }
  p.admin.keys_changed_at = nowIso();
  p.admin.keys_changed_by_name = user.full_name;
  addAudit({ actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name, action: "profile_key_changed", details: { profile_id: p.public.id } });
  return ok(profileView(user, p.public.id));
};

const checkProfileHandler: Handler = (_req, params) => {
  const p = state.profiles.get(params.profileId);
  if (!p) return notFound("Профиль не найден");
  const route = p.public.settings.primary_route ?? "stub";
  const result: ProfileCheckResult = {
    checked_at: nowIso(),
    rows: [
      { target: "opponent", route, ok: true, latency_ms: 840, slow: false, message: null },
      { target: "participant_judge", route, ok: true, latency_ms: 1120, slow: false, message: null },
      { target: "opponent_judge", route, ok: true, latency_ms: 760, slow: false, message: null },
      { target: "tts", route: null, ok: p.public.settings.speech?.tts !== undefined, latency_ms: 430, slow: false, message: null },
    ],
  };
  return ok(result);
};

const archiveProfileHandler: Handler = (_req, params, user) => {
  const p = state.profiles.get(params.profileId);
  if (!p) return notFound("Профиль не найден");
  if (p.public.is_default) {
    return problem({ status: 409, type: "archived", title: "Профиль по умолчанию нельзя архивировать" });
  }
  p.public.archived_at = nowIso();
  addAudit({ actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name, action: "profile_saved", details: { profile_id: p.public.id, archived: true } });
  return ok(profileView(user, p.public.id));
};

// ---------------------------------------------------------------------------
// Обработчики: пользователи, журнал, настройки
// ---------------------------------------------------------------------------

const LOGIN_RE = /^[a-z0-9._-]{3,64}$/;

const listUsersHandler: Handler = () => ok([...state.users.values()].map((u) => deepClone(u)));

const createUserHandler: Handler = (req, _params, user) => {
  const body = asRecord(req.body);
  const login = body ? asString(body.login) : null;
  const fullName = body ? asString(body.full_name) : null;
  const role = body ? asString(body.role) : null;
  const password = body ? asString(body.password) : null;
  if (!login || !LOGIN_RE.test(login)) return validationFailed([{ path: "/login", message: "Логин: строчная латиница, 3–64 символа" }]);
  if (!fullName) return validationFailed([{ path: "/full_name", message: "Нужно ФИО" }]);
  if (role !== "methodologist" && role !== "observer" && role !== "admin") {
    return validationFailed([{ path: "/role", message: "Роль: methodologist|observer|admin" }]);
  }
  if (!password || password.length < 10) return validationFailed([{ path: "/password", message: "Пароль от 10 символов" }]);
  if ([...state.users.values()].some((u) => u.login === login)) {
    return problem({ status: 409, type: "nothing_changed", title: "Пользователь с таким логином уже есть" });
  }
  const newUser: PortalUser = {
    id: newId(),
    login,
    full_name: fullName,
    role,
    is_active: true,
    group_ids: [],
    last_login_at: null,
  };
  state.users.set(newUser.id, newUser);
  addAudit({ actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name, action: "user_saved", details: { login } });
  return created(deepClone(newUser));
};

const patchUserHandler: Handler = (req, params, user) => {
  const target = state.users.get(params.userId);
  if (!target) return notFound("Пользователь не найден");
  const body = asRecord(req.body);
  if (!body) return invalidBody();
  if (body.full_name !== undefined) {
    const v = asString(body.full_name);
    if (!v) return validationFailed([{ path: "/full_name", message: "ФИО не может быть пустым" }]);
    target.full_name = v;
  }
  if (body.role !== undefined) {
    const role = asString(body.role);
    if (role !== "methodologist" && role !== "observer" && role !== "admin") {
      return validationFailed([{ path: "/role", message: "Роль: methodologist|observer|admin" }]);
    }
    target.role = role;
  }
  if (body.is_active !== undefined) target.is_active = body.is_active === true;
  if (body.new_password !== undefined) {
    const pwd = asString(body.new_password);
    if (!pwd || pwd.length < 10) return validationFailed([{ path: "/new_password", message: "Пароль от 10 символов" }]);
  }
  addAudit({ actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name, action: "user_saved", details: { login: target.login } });
  return ok(deepClone(target));
};

const putGroupAccessHandler: Handler = (req, params, user) => {
  const target = state.users.get(params.userId);
  if (!target) return notFound("Пользователь не найден");
  const body = asRecord(req.body);
  const groupIds = body ? asStringArray(body.group_ids) : null;
  if (!groupIds) return validationFailed([{ path: "/group_ids", message: "Нужен массив group_ids" }]);
  const before = new Set(target.group_ids);
  target.group_ids = [...new Set(groupIds)];
  const granted = target.group_ids.filter((g) => !before.has(g));
  const revoked = [...before].filter((g) => !target.group_ids.includes(g));
  for (const gid of granted) {
    addAudit({ actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name, action: "access_granted", group_id: gid, group_name: groupName(gid), details: { user: target.login } });
  }
  for (const gid of revoked) {
    addAudit({ actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name, action: "access_revoked", group_id: gid, group_name: groupName(gid), details: { user: target.login } });
  }
  return ok(deepClone(target));
};

const listAuditHandler: Handler = (req) => {
  let items = state.audit;
  const from = parseDate(req.query.get("from"));
  const to = parseDate(req.query.get("to"));
  const actorUserId = req.query.get("actor_user_id");
  const groupId = req.query.get("group_id");
  const subjectNumber = req.query.get("subject_number");
  const action = req.query.get("action");
  const outcome = req.query.get("outcome");
  if (from !== null) items = items.filter((a) => Date.parse(a.occurred_at) >= from);
  if (to !== null) items = items.filter((a) => Date.parse(a.occurred_at) < to);
  if (actorUserId) items = items.filter((a) => a.actor_user_id === actorUserId);
  if (groupId) items = items.filter((a) => a.group_id === groupId);
  if (subjectNumber) items = items.filter((a) => a.subject_number === subjectNumber);
  if (action) items = items.filter((a) => a.action === action);
  if (outcome === "ok" || outcome === "denied") items = items.filter((a) => a.outcome === outcome);
  return ok(paginate(items.map((a) => deepClone(a)), req.query));
};

const auditExportHandler: Handler = (req, _params, user) => {
  const body = asRecord(req.body) ?? {};
  const from = parseDate(asString(body.from));
  const to = parseDate(asString(body.to));
  const actorUserId = asString(body.actor_user_id);
  const groupId = asString(body.group_id);
  const subjectNumber = asString(body.subject_number);
  const action = asString(body.action);
  let items: AuditEntry[] = state.audit;
  if (from !== null) items = items.filter((a) => Date.parse(a.occurred_at) >= from);
  if (to !== null) items = items.filter((a) => Date.parse(a.occurred_at) < to);
  if (actorUserId) items = items.filter((a) => a.actor_user_id === actorUserId);
  if (groupId) items = items.filter((a) => a.group_id === groupId);
  if (subjectNumber) items = items.filter((a) => a.subject_number === subjectNumber);
  if (action) items = items.filter((a) => a.action === action);
  const rows: CsvRow[] = [["occurred_at", "actor", "action", "outcome", "subject_number", "session_id", "group_name", "rows_count"]];
  for (const a of items) {
    rows.push([a.occurred_at, a.actor_name ?? a.actor_kind, a.action, a.outcome, a.subject_number ?? "", a.session_id ?? "", a.group_name ?? "", a.rows_count ?? ""]);
  }
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "audit_exported", rows_count: Math.max(0, rows.length - 1),
  });
  const date = nowIso().slice(0, 10).replace(/-/g, "");
  return {
    status: 200,
    body: toCsv(rows),
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="arena-journal-${date}.csv"`,
    },
  };
};

const getSettingsHandler: Handler = () => ok(deepClone(state.settings));

const patchSettingsHandler: Handler = (req, _params, user) => {
  const body = asRecord(req.body);
  if (!body || Object.keys(body).length === 0) return invalidBody("Пустой PATCH настроек");
  const errors: Array<{ path: string; message: string }> = [];
  const patch: Partial<PortalSettings> = {};
  if (body.admission_rehearsals !== undefined) {
    const v = Number(body.admission_rehearsals);
    if (!Number.isInteger(v) || v < 1 || v > 20) errors.push({ path: "/admission_rehearsals", message: "1–20" });
    else patch.admission_rehearsals = v;
  }
  if (body.abandon_timeout_minutes !== undefined) {
    const v = Number(body.abandon_timeout_minutes);
    if (!Number.isInteger(v) || v < 2 || v > 120) errors.push({ path: "/abandon_timeout_minutes", message: "2–120" });
    else patch.abandon_timeout_minutes = v;
  }
  if (body.code_max_failed_attempts !== undefined) {
    const v = Number(body.code_max_failed_attempts);
    if (!Number.isInteger(v) || v < 3 || v > 50) errors.push({ path: "/code_max_failed_attempts", message: "3–50" });
    else patch.code_max_failed_attempts = v;
  }
  if (errors.length > 0) return validationFailed(errors);
  Object.assign(state.settings, patch);
  state.settings.updated_at = nowIso();
  state.settings.updated_by_name = user.full_name;
  addAudit({
    actor_kind: "user", actor_user_id: user.id, actor_name: user.full_name,
    action: "settings_changed", details: patch as Record<string, unknown>,
  });
  return ok(deepClone(state.settings));
};

// ---------------------------------------------------------------------------
// Таблица маршрутов
// ---------------------------------------------------------------------------

const ROUTES: Route[] = [
  { method: "POST", pattern: "auth/login", public: true, handler: loginHandler },
  { method: "POST", pattern: "auth/logout", handler: logoutHandler },
  { method: "GET", pattern: "auth/me", handler: meHandler },
  { method: "GET", pattern: "scenarios", handler: listScenariosHandler },
  { method: "POST", pattern: "scenarios", handler: createScenarioHandler },
  { method: "GET", pattern: "scenario-templates", handler: listTemplatesHandler },
  { method: "POST", pattern: "scenarios/import", handler: importScenarioHandler },
  { method: "GET", pattern: "scenarios/{id}", handler: getScenarioHandler },
  { method: "GET", pattern: "scenarios/{id}/draft", handler: getDraftHandler },
  { method: "PUT", pattern: "scenarios/{id}/draft", handler: putDraftHandler },
  { method: "POST", pattern: "scenarios/{id}/draft/check", handler: draftCheckHandler },
  { method: "POST", pattern: "scenarios/{id}/publish", handler: publishHandler },
  { method: "GET", pattern: "scenarios/{id}/versions", handler: listVersionsHandler },
  { method: "GET", pattern: "scenarios/{id}/versions/{n}", handler: getVersionHandler },
  { method: "GET", pattern: "scenarios/{id}/export", handler: exportScenarioHandler },
  { method: "POST", pattern: "scenarios/{id}/archive", handler: archiveScenarioHandler },
  { method: "GET", pattern: "scenarios/{id}/generation", handler: getGenerationHandler },
  { method: "POST", pattern: "scenarios/{id}/generation/steps/{step}/confirm", handler: confirmGenerationHandler },
  { method: "POST", pattern: "scenarios/{id}/generation/steps/{step}/regenerate", handler: regenerateGenerationHandler },
  { method: "GET", pattern: "scenarios/{id}/rehearsals", handler: listRehearsalsHandler },
  { method: "POST", pattern: "scenarios/{id}/rehearsals", handler: createRehearsalHandler },
  { method: "GET", pattern: "rehearsals/{rehearsalId}", handler: getRehearsalHandler },
  { method: "GET", pattern: "scenarios/{id}/versions/{n}/health", handler: healthHandler },
  { method: "GET", pattern: "scenarios/{id}/versions/{n}/health/sessions", handler: healthSessionsHandler },
  { method: "GET", pattern: "sessions", handler: listSessionsHandler },
  { method: "GET", pattern: "sessions/{sessionId}", handler: getSessionHandler },
  { method: "GET", pattern: "sessions/{sessionId}/record", handler: getSessionRecordHandler },
  { method: "POST", pattern: "sessions/{sessionId}/review", handler: reviewSessionHandler },
  { method: "GET", pattern: "sessions/{sessionId}/reduced", handler: reducedSessionHandler },
  { method: "GET", pattern: "assignments", handler: listAssignmentsHandler },
  { method: "POST", pattern: "assignments", handler: createAssignmentsHandler },
  { method: "POST", pattern: "assignments/reissue-codes", handler: reissueCodesHandler },
  { method: "PATCH", pattern: "assignments/{assignmentId}", handler: patchAssignmentHandler },
  { method: "POST", pattern: "assignments/{assignmentId}/cancel", handler: cancelAssignmentHandler },
  { method: "POST", pattern: "assignments/{assignmentId}/unblock-code", admin: true, handler: unblockCodeHandler },
  { method: "GET", pattern: "groups", handler: listGroupsHandler },
  { method: "POST", pattern: "groups", admin: true, handler: createGroupHandler },
  { method: "PATCH", pattern: "groups/{groupId}", admin: true, handler: patchGroupHandler },
  { method: "GET", pattern: "people", handler: listPeopleHandler },
  { method: "POST", pattern: "people", admin: true, handler: createPersonHandler },
  { method: "GET", pattern: "people/{subjectId}", handler: getPersonHandler },
  { method: "PATCH", pattern: "people/{subjectId}", admin: true, handler: patchPersonHandler },
  { method: "GET", pattern: "people/{subjectId}/progress", handler: personProgressHandler },
  { method: "POST", pattern: "people/{subjectId}/written-consents", handler: writtenConsentHandler },
  { method: "POST", pattern: "people/{subjectId}/consent-withdrawal", admin: true, handler: consentWithdrawalHandler },
  { method: "GET", pattern: "people/{subjectId}/decision-candidates", handler: decisionCandidatesHandler },
  { method: "GET", pattern: "analytics/comparison", handler: comparisonHandler },
  { method: "GET", pattern: "analytics/groups", handler: groupsAnalyticsHandler },
  { method: "GET", pattern: "analytics/criteria/{criterion}/sessions", handler: criterionSessionsHandler },
  { method: "POST", pattern: "exports", handler: exportsHandler },
  { method: "POST", pattern: "decisions", handler: createDecisionHandler },
  { method: "GET", pattern: "objections", handler: listObjectionsHandler },
  { method: "POST", pattern: "objections/{objectionId}/response", handler: respondObjectionHandler },
  { method: "GET", pattern: "trainer-profiles", handler: listProfilesHandler },
  { method: "POST", pattern: "trainer-profiles", admin: true, handler: createProfileHandler },
  { method: "GET", pattern: "trainer-profiles/{profileId}", handler: getProfileHandler },
  { method: "PATCH", pattern: "trainer-profiles/{profileId}", admin: true, handler: patchProfileHandler },
  { method: "PUT", pattern: "trainer-profiles/{profileId}/keys", admin: true, handler: putProfileKeysHandler },
  { method: "POST", pattern: "trainer-profiles/{profileId}/check", admin: true, handler: checkProfileHandler },
  { method: "POST", pattern: "trainer-profiles/{profileId}/archive", admin: true, handler: archiveProfileHandler },
  { method: "GET", pattern: "users", admin: true, handler: listUsersHandler },
  { method: "POST", pattern: "users", admin: true, handler: createUserHandler },
  { method: "PATCH", pattern: "users/{userId}", admin: true, handler: patchUserHandler },
  { method: "PUT", pattern: "users/{userId}/group-access", admin: true, handler: putGroupAccessHandler },
  { method: "GET", pattern: "audit-log", admin: true, handler: listAuditHandler },
  { method: "POST", pattern: "audit-log/export", admin: true, handler: auditExportHandler },
  { method: "GET", pattern: "settings", handler: getSettingsHandler },
  { method: "PATCH", pattern: "settings", admin: true, handler: patchSettingsHandler },
];

export function handleMockPortalRequest(req: MockPortalRequest): MockPortalResponse;
export function handleMockPortalRequest(req: MockPortalRequest): MockPortalResponse | Promise<MockPortalResponse> {
  let segs: string[];
  try {
    segs = req.path.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  } catch {
    return invalidBody("Путь не разобран");
  }
  for (const route of ROUTES) {
    const params = matchSegs(segs, route.pattern);
    if (!params) continue;
    if (route.method !== req.method) continue;
    if (route.public) return route.handler(req, params, null as unknown as PortalUser);
    const user = userFromRequest(req);
    if (!user) return unauthenticated();
    if (route.admin && user.role !== "admin") return forbiddenRole();
    return route.handler(req, params, user);
  }
  return notFound("Адрес API не найден");
}

/** Алиасы для совместимости с прокси-route. */
export type MockRequest = MockPortalRequest;
export type MockResponse = MockPortalResponse;
