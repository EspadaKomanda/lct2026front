/**
 * Типы API «Арена переговоров» — перенесены из OpenAPI 3.1 (arena-api.yaml).
 * Два семейства адресов: /api/trainer/* (тренажёр, bearer-токен) и
 * /api/portal/* (портал HR, cookie arena_session). Этот файл — портал + общие
 * модели; trainer-модели внизу для полноты.
 */

// ---------------------------------------------------------------------------
// Enum'ы (точные значения из спеки)
// ---------------------------------------------------------------------------

export type Role = "methodologist" | "observer" | "admin";
export type Mode = "training" | "assessment";
export type Origin = "brief" | "template" | "copy" | "manual";
export type Difficulty = "easy" | "normal" | "hard";
export type FinalRank = "S" | "A" | "B" | "C" | "D" | "F";
export type SessionStatus =
  | "in_progress"
  | "completed"
  | "ended_by_participant"
  | "turn_limit"
  | "time_limit"
  | "connection_lost"
  | "abandoned";
export type ClosingStatus =
  | "completed"
  | "ended_by_participant"
  | "turn_limit"
  | "time_limit"
  | "connection_lost";
export type ProcessStatus = "pending" | "ok" | "not_received" | "too_short" | "not_scored";
export type ScoringProfile = "normal" | "short";
export type Speaker = "participant" | "opponent";
export type MoveSource = "judge" | "keywords";
export type ModelRoute = "openrouter" | "own_server" | "stub";
export type ConsentKind =
  | "notice_training"
  | "consent_assessment"
  | "consent_external_ai"
  | "notice_demo"
  | "written_assessment";
export type ConsentAnswerValue = "acknowledged" | "granted" | "refused";
export type Sphere =
  | "procurement"
  | "internal_promotion"
  | "internal_client"
  | "sales"
  | "contractor_deadline"
  | "resource_split"
  | "other";
export type NegotiationType = "distributive" | "integrative" | "mixed";
export type Criterion = "diagnosis" | "interests" | "criteria" | "alternative" | "discipline" | "conduct";
export type AssignmentStatus =
  | "not_started"
  | "in_progress"
  | "passed"
  | "abandoned"
  | "expired"
  | "cancelled"
  | "code_blocked";
export type RehearsalStatus = "link_issued" | "running" | "uploaded" | "expired";
export type AuditAction =
  | "login"
  | "login_failed"
  | "session_opened"
  | "session_reduced_opened"
  | "session_reviewed"
  | "export_created"
  | "audit_exported"
  | "assignment_created"
  | "assignment_cancelled"
  | "assignment_extended"
  | "code_issued"
  | "code_reissued"
  | "code_blocked"
  | "code_unblocked"
  | "decision_recorded"
  | "objection_submitted"
  | "objection_answered"
  | "profile_saved"
  | "profile_key_changed"
  | "user_saved"
  | "access_granted"
  | "access_revoked"
  | "person_saved"
  | "consent_withdrawn"
  | "external_ai_withdrawn"
  | "written_consent_recorded"
  | "group_saved"
  | "scenario_published"
  | "scenario_mode_changed"
  | "scenario_archived"
  | "settings_changed"
  | "session_closed_by_server"
  | "session_reopened";

/** Объект движка: непрозрачный JSON, НИКОГДА не отправлять ключ `emotion`. */
export type EngineObject = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Общие
// ---------------------------------------------------------------------------

/** RFC 9457 application/problem+json */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string | null;
  instance?: string;
  errors?: FieldError[];
  retry_after_seconds?: number;
  data?: Record<string, unknown>;
}

export interface FieldError {
  path: string;
  message: string;
  code?: string | null;
}

export interface PageMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface SmallSample {
  n: number;
  small: boolean;
}

export interface Paged<T> {
  items: T[];
  page: PageMeta;
}

// ---------------------------------------------------------------------------
// Пользователи и вход (портал)
// ---------------------------------------------------------------------------

export interface PortalUser {
  id: string;
  login: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  group_ids: string[];
  last_login_at: string | null;
}

export interface Me {
  user: PortalUser;
  demo_mode: boolean;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface UserCreate {
  login: string;
  full_name: string;
  role: Role;
  password: string;
}

export interface UserPatch {
  full_name?: string;
  role?: Role;
  is_active?: boolean;
  new_password?: string;
}

export interface GroupAccessPut {
  group_ids: string[];
}

// ---------------------------------------------------------------------------
// Сценарии
// ---------------------------------------------------------------------------

export type ScenarioStatus = "draft" | "published" | "archived";

export interface VersionSummary {
  id: string;
  number: number;
  fingerprint: string;
  mode: Mode;
  published_at: string;
  title?: string | null;
  engine_version?: string | null;
  admission_rehearsals?: number | null;
  admission_required?: number | null;
  published_by_name?: string | null;
  sessions_count?: number | null;
}

export interface ScenarioListItem {
  id: string;
  slug: string;
  title: string;
  mode: Mode;
  origin: Origin;
  sphere: Sphere;
  negotiation_type: NegotiationType;
  tags: string[];
  status: ScenarioStatus;
  latest_version: VersionSummary | null;
  draft_differs?: boolean;
  blocking_errors?: number | null;
  generating?: boolean;
}

export type ScenarioPage = Paged<ScenarioListItem>;

export interface Admission {
  fingerprint: string | null;
  done: number;
  required: number;
  reset?: boolean;
}

export interface ScenarioCard extends ScenarioListItem {
  mode_locked?: boolean;
  admission: Admission;
  versions_count?: number | null;
  archived_at?: string | null;
  copied_from?: { scenario_id: string; version: number } | null;
  created_at?: string;
  created_by_name?: string | null;
}

export interface Questionnaire {
  sphere: Sphere;
  topic: string;
  opponent_role?: string;
  opponent_goals?: string;
  participant_role?: string;
  opponent_character?: string;
  negotiation_type?: NegotiationType;
  difficulty?: Difficulty;
  time_limit_minutes?: number;
  comment?: string;
}

export interface CreateFromBrief {
  origin: "brief";
  mode: Mode;
  questionnaire: Questionnaire;
}
export interface CreateFromTemplate {
  origin: "template";
  mode: Mode;
  template_id: string;
  title?: string;
}
export interface CreateCopy {
  origin: "copy";
  mode: Mode;
  source_scenario_id: string;
  title: string;
  source_version?: number;
}
export interface CreateManual {
  origin: "manual";
  mode: Mode;
}
export type CreateScenarioRequest = CreateFromBrief | CreateFromTemplate | CreateCopy | CreateManual;

export interface ScenarioTemplate {
  id: string;
  title: string;
  description: string;
  sphere: Sphere;
  main_weights: Array<{ evidence: string; label: string; weight: number }>;
}

export interface ArchiveRequest {
  archived: boolean;
}

export interface CheckMessage {
  rule?: string;
  severity: "blocking" | "warning";
  message: string;
  path: string;
  difficulty?: Difficulty;
  stage_ids?: string[];
}

export interface CheckResult {
  blocking: number;
  engine_version: string;
  messages: CheckMessage[];
}

export interface Draft {
  scenario_id: string;
  document: ScenarioDocument;
  fingerprint: string;
  check: CheckResult;
  admission: Admission;
  updated_at: string;
  updated_by_name?: string | null;
}

export interface DraftSave {
  document: ScenarioDocument;
}

export interface DryRunCheck {
  check: CheckResult;
  fingerprint: string;
  resets_admission: boolean;
}

export interface PublishRequest {
  fingerprint: string;
}

export interface Version extends VersionSummary {
  document: ScenarioDocument;
}

/** Документ сценария формата arena-scenario/1 (структура — arena-scenario.schema.json) */
export type ScenarioDocument = EngineObject;

// ---------------------------------------------------------------------------
// Генерация из брифа
// ---------------------------------------------------------------------------

export interface GenerationState {
  scenario_id: string;
  questionnaire: Questionnaire;
  step: 1 | 2 | 3;
  status: "running" | "ready" | "failed" | "done";
  confirmed_steps: number[];
  progress_text?: string | null;
  result: EngineObject | null;
  check: CheckResult | null;
  error: { message: string; retry_after_seconds?: number } | null;
}

export interface GenerationConfirm {
  fields: EngineObject;
}

export interface GenerationRegenerate {
  questionnaire?: Questionnaire;
  comment?: string;
}

// ---------------------------------------------------------------------------
// Репетиции
// ---------------------------------------------------------------------------

export interface RehearsalCreate {
  difficulty: Difficulty;
  trainer_profile_id?: string | null;
}

export interface RehearsalLink {
  rehearsal_id: string;
  link: string;
  expires_at: string;
  fingerprint: string;
  difficulty: Difficulty;
  trainer_profile_id: string;
  trainer_profile_name?: string | null;
}

export interface RehearsalStep {
  reply_no: number;
  breakdown: EngineObject;
  model_errors: Array<{ model: "opponent" | "participant_judge" | "opponent_judge"; message: string }>;
}

export interface RehearsalRecordUpload {
  fingerprint: string;
  engine_version: string;
  status: ClosingStatus;
  turns: TurnEvent[];
  steps: RehearsalStep[];
  judge_attempts: number;
  final_id?: string;
  break_stage?: string;
  break_turn?: number;
  incidents?: IncidentEvent[];
  judge_answer?: JudgeAnswer;
  client_scores?: EngineObject;
}

export interface RehearsalListItem {
  id: string;
  fingerprint: string;
  difficulty: Difficulty;
  trainer_profile_name: string | null;
  status: RehearsalStatus;
  run_by_name: string | null;
  issued_at: string;
  uploaded_at: string | null;
  result_rank: FinalRank | null;
  counts_for_admission: boolean;
}

export interface RehearsalList {
  admission: Admission;
  items: RehearsalListItem[];
}

export interface Rehearsal extends RehearsalListItem {
  scenario_id: string;
  trainer_profile_id: string;
  profile_revision: number | null;
  link_expires_at: string;
  redeemed_at: string | null;
  engine_version: string | null;
  final_id: string | null;
  result: EngineObject | null;
  record: RehearsalRecordUpload | null;
}

// ---------------------------------------------------------------------------
// Сессии — общие части
// ---------------------------------------------------------------------------

export interface TurnEvent {
  type: "turn";
  seq: number;
  speaker: Speaker;
  reply_no: number;
  text: string;
  at_ms: number;
  duration_ms?: number;
  pause_ms?: number;
  model_route?: ModelRoute;
  stage: string;
  transition_to?: string;
  move_type?: string;
  move_source?: MoveSource;
  judge_confidence?: number;
  evidence?: string;
  interest?: string;
  violations?: string[];
  judge?: EngineObject | null;
  terms?: EngineObject | null;
  trust?: number;
  pressure?: number;
  credibility?: number;
  patience?: number;
  credit?: number | null;
  revealed_facts?: string[];
  engine_step?: EngineObject | null;
  intent?: string;
  offer?: EngineObject | null;
  opponent_judge?: EngineObject | null;
  opponent_violation?: boolean;
  opponent_judge_comment?: string;
  interrupted?: boolean;
}

export interface IncidentEvent {
  type: "incident";
  event_id: string;
  component:
    | "camera"
    | "asr"
    | "tts"
    | "model_route"
    | "stub"
    | "participant_judge"
    | "opponent_judge"
    | "portal_link";
  reply_no?: number;
  at_ms: number;
  route_to?: ModelRoute | null;
  detail?: string;
}

export interface TranscriptLine {
  seq: number;
  reply_no: number;
  speaker: Speaker;
  text: string | null;
  at_ms: number;
  offer?: EngineObject | null;
  terms?: EngineObject | null;
  stage?: string | null;
  markers?: Array<{ kind: string; label: string }>;
}

export interface ResultLabels {
  stages: Record<string, string>;
  facts: Record<string, string>;
  issues: Record<string, string>;
  moves: Record<string, string>;
  finals: Record<string, string>;
}

export interface Mark {
  kind:
    | "training"
    | "simplified"
    | "opponent_violations"
    | "lucky"
    | "demo"
    | "stub"
    | "abandoned"
    | "ended_by_participant"
    | "turn_limit"
    | "time_limit"
    | "connection_lost"
    | "short_session"
    | "unconfirmed_violation"
    | "judge_attempts"
    | "process_not_received"
    | "too_short";
  text: string;
  replies?: number[];
}

export interface SessionHeader {
  session_id: string;
  scenario_id: string;
  scenario_title: string;
  version_number: number;
  fingerprint?: string | null;
  difficulty: Difficulty;
  mode: Mode;
  started_at: string;
  ended_at?: string | null;
  duration_ms?: number | null;
  participant_turns: number;
  status: SessionStatus;
  scoring_profile?: ScoringProfile | null;
  criteria_set: string;
  is_demo: boolean;
}

export interface ScoreColumns {
  result_rank: FinalRank | null;
  final_id?: string | null;
  final_title?: string | null;
  result_number: number | null;
  result_max: number | null;
  process_status: ProcessStatus;
  process_number: number | null;
  criteria_bands: Record<Criterion, number> | null;
  lucky: boolean;
}

export interface JudgeAnswerEpisode {
  indicator: string;
  reply: number;
  speaker: Speaker;
  quote: string;
  context: { reply: number; speaker: Speaker; quote: string } | null;
  interest?: string | null;
  why: string;
}

export interface JudgeAnswerSummaryItem {
  kind: "strength" | "miss";
  observation: string;
  reply: number;
  speaker: Speaker;
  quote: string;
  instead: string;
}

export interface JudgeAnswer {
  criteria_set: string;
  episodes: JudgeAnswerEpisode[];
  summary: JudgeAnswerSummaryItem[];
}

// ---------------------------------------------------------------------------
// Портал — назначения, группы, люди
// ---------------------------------------------------------------------------

export interface PersonRef {
  subject_id: string;
  number: string;
  display_name: string | null;
  is_pseudonym: boolean;
}

export interface Assignment {
  id: string;
  person: PersonRef;
  group_id: string;
  scenario_id: string;
  scenario_version_id: string;
  version_number: number;
  mode: Mode;
  difficulty: Difficulty;
  trainer_profile_id: string;
  due_at: string;
  status: AssignmentStatus;
  scenario_title?: string;
  newer_version_exists?: boolean;
  trainer_profile_name?: string | null;
  batch_id?: string | null;
  last_attempt_at?: string | null;
  attempts?: number;
  break_point?: { stage: string; turn: number } | null;
  code?: { issued_at: string; failed_attempts: number; blocked_at: string | null };
  created_at?: string;
  created_by_name?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: "by_hr" | "consent_withdrawn" | null;
  running_session_at_cancel?: boolean;
}

export type AssignmentPage = Paged<Assignment>;

export interface AssignmentCreate {
  subject_ids: string[];
  scenario_version_id: string;
  difficulty: Difficulty;
  due_at: string;
  trainer_profile_id?: string | null;
}

export interface IssuedCode {
  assignment_id: string;
  person: PersonRef;
  code: string;
  link: string;
}

export interface AssignmentCreateResult {
  created: IssuedCode[];
  skipped: Array<{ subject_id: string; assignment_id: string | null; reason: string }>;
  batch_id?: string | null;
}

export interface ReissueRequest {
  assignment_ids: string[];
}

export interface AssignmentPatch {
  due_at: string;
}

export interface Group {
  id: string;
  name: string;
  has_access: boolean;
  department?: string | null;
  trainer_profile_id?: string | null;
  trainer_profile_name?: string | null;
  people_count?: number;
  archived_at?: string | null;
}

export interface GroupWrite {
  name?: string;
  department?: string;
  trainer_profile_id?: string | null;
  archived?: boolean;
}

export interface Person {
  subject_id: string;
  number: string;
  group_id: string;
  group_name?: string;
  full_name: string | null;
  pseudonym: string | null;
  personnel_no: string | null;
  job_title: string | null;
  external_ai_withdrawn_at?: string | null;
  written_consent_valid_until?: string | null;
  code_blocked?: boolean;
}

export type PersonPage = Paged<Person>;

export interface PersonWrite {
  group_id?: string;
  full_name?: string;
  pseudonym?: string;
  personnel_no?: string;
  job_title?: string;
}

export interface PersonCard {
  person: Person;
  assignments: Assignment[];
  consents: ConsentRecord[];
  objections: ParticipantObjection[];
  decisions: Decision[];
  results_visible: boolean;
  attempts_total?: number;
}

export interface ConsentRecord {
  id: string;
  kind: ConsentKind;
  answer: ConsentAnswerValue;
  text_version?: string | null;
  answered_at: string;
  document_ref?: string | null;
  document_channel?: "paper" | "edo" | null;
  signed_on?: string | null;
  valid_until?: string | null;
  recorded_by_name?: string | null;
}

export interface ProgressPoint {
  session_id: string;
  started_at: string;
  result_rank: FinalRank | null;
  result_number: number | null;
  process_number: number | null;
  criteria_bands: Record<Criterion, number> | null;
  simplified: boolean;
  opponent_violations: boolean;
}

export interface ProgressLine {
  scenario_version_id: string;
  scenario_title: string;
  version_number: number;
  difficulty: Difficulty;
  criteria_set: string;
  mode?: Mode;
  points: ProgressPoint[];
  criteria_without_growth?: Criterion[];
  sample: SmallSample;
}

export interface Progress {
  subject_id: string;
  lines: ProgressLine[];
}

export interface WrittenConsentCreate {
  document_ref: string;
  document_channel: "paper" | "edo";
  signed_on: string;
  valid_until?: string;
}

export interface ConsentWithdrawal {
  scope: "all" | "external_ai";
  document_ref: string;
  confirm_name?: string;
}

export interface ConsentWithdrawalResult {
  scope: "all" | "external_ai";
  number: string;
  cancelled_assignments?: number;
  running_session?: boolean;
  message?: string;
}

export interface DecisionCandidate {
  session: SessionListItem;
  eligible: boolean;
  reasons: string[];
  objections?: ParticipantObjection[];
}

// ---------------------------------------------------------------------------
// Портал — сессии
// ---------------------------------------------------------------------------

export interface SessionFlags {
  training?: boolean;
  simplified?: boolean;
  opponent_violation_count?: number;
  reviewed?: boolean;
  lucky?: boolean;
  stub_used?: boolean;
  has_objection?: boolean;
  reopened_count?: number;
  judge_attempts?: number;
}

export interface SessionListItem {
  session_id: string;
  person: PersonRef;
  group_id: string;
  header: SessionHeader;
  score_columns: ScoreColumns;
  flags: SessionFlags;
  assignment_id?: string | null;
}

export type SessionPage = Paged<SessionListItem>;

export interface Review {
  reviewed_at: string;
  reviewed_by_name: string;
  reviewed_violation_count: number;
}

export interface OpponentViolation {
  reply_no: number;
  kinds: Array<"out_of_role" | "beyond_limit" | "early_fact" | "wrong_number">;
  comment: string;
  correction_reply_no?: number | null;
}

export interface DecisionRef {
  id: string;
  decision: string;
  decided_at: string;
  decided_by_name: string;
}

export interface SessionResult {
  header: SessionHeader;
  person: PersonRef;
  marks: Mark[];
  score_columns: ScoreColumns;
  flags: SessionFlags;
  labels: ResultLabels;
  transcript: TranscriptLine[];
  objections: ParticipantObjection[];
  decisions: DecisionRef[];
  group_id: string;
  final_condition_text?: string | null;
  epilogue?: string | null;
  scores?: EngineObject | null;
  scored_at?: string | null;
  summary: JudgeAnswerSummaryItem[];
  opponent_violations: OpponentViolation[];
  simplified_replies: number[];
  review: Review | null;
  review_needed: boolean;
}

export interface TurnRecord extends TranscriptLine {
  duration_ms?: number;
  pause_ms?: number;
  model_route?: ModelRoute;
  transition_to?: string;
  move_type?: string;
  move_source?: MoveSource;
  judge_confidence?: number;
  evidence?: string;
  interest?: string;
  violations: string[];
  judge?: EngineObject | null;
  terms?: EngineObject | null;
  trust?: number;
  pressure?: number;
  credibility?: number;
  patience?: number;
  credit?: number;
  revealed_facts: string[];
  engine_step?: EngineObject | null;
  intent?: string;
  offer?: EngineObject | null;
  opponent_judge?: EngineObject | null;
  opponent_violation: boolean;
  opponent_judge_comment?: string;
  interrupted: boolean;
  received_at: string;
}

export interface SessionConditions {
  scenario_version_id: string;
  fingerprint: string;
  engine_version: string;
  criteria_set: string;
  trainer_profile_id: string;
  trainer_profile_name: string;
  profile_revision: number;
  profile_snapshot: TrainerProfileSettings;
  external_ai_allowed: boolean;
  judge_attempts: number;
  reopened_count: number;
}

export interface SessionRecord {
  header: SessionHeader;
  person: PersonRef;
  labels: ResultLabels;
  turns: TurnRecord[];
  incidents: IncidentEvent[];
  conditions: SessionConditions;
  final_condition_text?: string | null;
  audio_note?: string;
}

// ---------------------------------------------------------------------------
// Здоровье сценария / урезанный вид
// ---------------------------------------------------------------------------

export interface ScenarioHealth {
  scenario_version_id: string;
  sample: SmallSample;
  labels: ResultLabels;
  running_now?: number;
  by_status: Record<SessionStatus, number>;
  finals: Array<{ final_id: string; final_title: string; result_rank: FinalRank; n: number }>;
  stages_never_reached: Array<{ stage_id: string; title: string }>;
  facts_never_found: Array<{ fact_id: string; label: string }>;
  avg_participant_turns?: number | null;
  breaks: { share: number; points: Array<{ stage: string; n: number }> };
  by_difficulty: Array<{ difficulty: Difficulty; sample: SmallSample; ranks: Partial<Record<FinalRank, number>> }>;
  opponent_violations: { sessions_share: number; by_kind: Record<string, number> };
  empty_note?: string | null;
}

export interface HealthSessionItem {
  session_id: string;
  started_at: string;
  difficulty: Difficulty;
  status: SessionStatus;
  full_access: boolean;
  final_title?: string | null;
  result_rank?: FinalRank | null;
  break_stage?: string | null;
  opponent_violation_count?: number;
}

export type HealthSessionPage = Paged<HealthSessionItem>;

export interface ReducedSession {
  session_id: string;
  scenario_version_id: string;
  difficulty: Difficulty;
  status: SessionStatus;
  labels: ResultLabels;
  final_title?: string | null;
  final_condition_text?: string | null;
  result_rank?: FinalRank | null;
  break_stage?: string | null;
  turns: Array<{
    reply_no: number;
    speaker: Speaker;
    stage: string;
    transition_to?: string | null;
    move_type?: string | null;
    offer?: EngineObject | null;
    revealed_facts: string[];
    interrupted: boolean;
    opponent_violation_kinds: string[];
  }>;
}

// ---------------------------------------------------------------------------
// Аналитика
// ---------------------------------------------------------------------------

export interface ComparisonCondition {
  mode: Mode;
  scenario_version_id: string;
  difficulty: Difficulty;
  criteria_set: string;
  scoring_profile: ScoringProfile;
  sessions_n: number;
  scenario_id?: string;
  scenario_title?: string;
  version_number?: number;
}

export interface ComparisonRow {
  person: PersonRef;
  attempts: number;
  last_session_id: string;
  score_columns: ScoreColumns;
  flags: SessionFlags;
}

export interface ComparisonTable {
  complete: boolean;
  conditions: ComparisonCondition[];
  available_conditions: ComparisonCondition[];
  rows: ComparisonRow[];
  training_note?: string | null;
  sample?: SmallSample;
  simplified_excluded?: number;
  sort: "result" | "process";
}

export interface GroupAnalytics {
  group_id: string;
  group_name: string;
  sample: SmallSample;
  weak_criteria: Array<{ criterion: Criterion; label: string; avg_band: number; n: number }>;
  headline?: string | null;
  result_ranks: Partial<Record<FinalRank, number>>;
  result_numbers: number[];
  process_numbers: number[];
  empty_note?: string | null;
}

export interface CriterionSessionItem {
  session_id: string;
  person: PersonRef;
  started_at: string;
  band: number;
  example: { reply_no: number; quote: string; observation: string } | null;
}

export type CriterionSessionPage = Paged<CriterionSessionItem>;

// ---------------------------------------------------------------------------
// Выгрузки
// ---------------------------------------------------------------------------

export interface ExportFilters {
  from?: string;
  to?: string;
  group_ids?: string[];
  subject_id?: string;
  scenario_id?: string;
  scenario_version_id?: string;
  difficulty?: Difficulty;
  mode?: Mode;
  statuses?: SessionStatus[];
}

export interface ExportRequest {
  slice: "group" | "employee" | "scenario";
  table: "summary" | "turns";
  format: "csv" | "xlsx";
  filters: ExportFilters;
  dry_run?: boolean;
}

export interface ExportPreview {
  sessions: number;
  rows: number;
  groups: Array<{ id: string; name: string; rows: number }>;
}

// ---------------------------------------------------------------------------
// Решения и возражения
// ---------------------------------------------------------------------------

export interface DecisionCreate {
  subject_id: string;
  decision: string;
  grounds: string;
  session_ids: string[];
  supersedes_id?: string;
}

export interface Decision {
  id: string;
  subject_id: string;
  decision: string;
  grounds: string;
  decided_at: string;
  decided_by_name: string;
  session_ids: string[];
  person?: PersonRef;
  supersedes_id?: string | null;
  superseded_by_id?: string | null;
  objections?: ParticipantObjection[];
}

export interface ObjectionTarget {
  kind: "result" | "process" | "criterion" | "episode" | "reply" | "summary";
  criterion?: Criterion;
  reply_no?: number;
  indicator?: string;
  summary_index?: number;
}

export interface ParticipantObjection {
  id: string;
  text: string;
  target: ObjectionTarget | null;
  submitted_at: string;
  response: { text: string; responded_at: string } | null;
}

export interface Objection {
  id: string;
  session_id: string;
  person: PersonRef;
  text: string | null;
  submitted_at: string;
  mode: Mode;
  scenario_title?: string;
  target: ObjectionTarget | null;
  response: { text: string; responded_at: string; responded_by_name: string } | null;
  has_decision: boolean;
}

export type ObjectionPage = Paged<Objection>;

export interface ObjectionAnswer {
  text: string;
}

// ---------------------------------------------------------------------------
// Профили тренажёра
// ---------------------------------------------------------------------------

export interface ServiceUrl extends String {
  readonly __brand: "ServiceUrl";
}

export interface SpeechSettings {
  base_url: string;
  model?: string;
  voice?: string | null;
}

export interface ModelSettings {
  model: string;
  own_server_model?: string;
  context_window: number;
  max_tokens: number;
}

export interface TrainerProfileSettings {
  openrouter?: { base_url: string } | null;
  model_server?: { base_url: string } | null;
  primary_route?: ModelRoute;
  models?: {
    opponent?: ModelSettings;
    participant_judge?: ModelSettings;
    opponent_judge?: ModelSettings;
  };
  speech?: { asr?: SpeechSettings; tts?: SpeechSettings };
  input_mode?: "push_to_talk" | "open_mic" | "text";
  camera?: { enabled: boolean; emotion_labels_to_opponent: boolean };
  limits?: { max_turns?: number; session_minutes?: number };
  model_providers_note?: string;
}

export interface TrainerProfilePublic {
  id: string;
  name: string;
  is_default: boolean;
  revision: number;
  settings: TrainerProfileSettings;
  has_openrouter_key: boolean;
  has_model_server_token: boolean;
  archived_at?: string | null;
  updated_at?: string;
}

export interface TrainerProfileAdmin extends TrainerProfilePublic {
  openrouter_key_last4: string | null;
  model_server_token_last4: string | null;
  keys_changed_at?: string | null;
  keys_changed_by_name?: string | null;
  running_sessions?: number;
  same_key_profiles?: string[];
}

export type TrainerProfile = TrainerProfilePublic | TrainerProfileAdmin;

export interface TrainerProfileCreate {
  name: string;
  copy_from?: string;
  settings?: TrainerProfileSettings;
}

export interface TrainerProfilePatch {
  name?: string;
  settings?: TrainerProfileSettings;
}

export interface TrainerProfileKeys {
  openrouter_key?: string | null;
  model_server_token?: string | null;
}

export interface ProfileCheckResult {
  checked_at: string;
  rows: Array<{
    target: "opponent" | "participant_judge" | "opponent_judge" | "tts";
    route?: ModelRoute | null;
    ok: boolean;
    latency_ms?: number | null;
    slow?: boolean;
    message?: string | null;
  }>;
}

// ---------------------------------------------------------------------------
// Журнал и настройки
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  occurred_at: string;
  actor_kind: "user" | "participant" | "system";
  actor_user_id?: string | null;
  actor_name?: string | null;
  action: AuditAction;
  outcome: "ok" | "denied";
  subject_number?: string | null;
  session_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  rows_count?: number | null;
  details?: EngineObject | null;
}

export type AuditPage = Paged<AuditEntry>;

export interface AuditExportRequest {
  from?: string;
  to?: string;
  actor_user_id?: string;
  group_id?: string;
  subject_number?: string;
  action?: AuditAction;
}

export interface PortalSettings {
  demo_mode: boolean;
  admission_rehearsals: number;
  abandon_timeout_minutes: number;
  code_max_failed_attempts: number;
  updated_at?: string;
  updated_by_name?: string | null;
}

export interface PortalSettingsPatch {
  admission_rehearsals?: number;
  abandon_timeout_minutes?: number;
  code_max_failed_attempts?: number;
}

// ---------------------------------------------------------------------------
// Модели тренажёра (для полноты — тренажёр рисует другая команда)
// ---------------------------------------------------------------------------

export interface EnterRequest {
  code: string;
}

export interface EnterResponse {
  token: string;
  token_expires_at: string;
  is_demo?: boolean;
  participant: { number: string; display_name: string };
  assignment: { id: string; mode: Mode; difficulty: Difficulty; due_at: string } | null;
  next: "brief" | "resume" | "results";
  running_session_id: string | null;
  has_results: boolean;
  can_start_new?: boolean;
  settings: TrainerSettings;
}

export interface ScenarioPublicPart {
  fingerprint: string;
  passport: {
    id: string;
    version: number;
    title: string;
    mode: Mode;
    sphere: Sphere;
    negotiation_type: NegotiationType;
  };
  difficulty: Difficulty;
  brief: EngineObject;
  opponent_card: EngineObject;
  issues: EngineObject[];
}

export interface ConsentTextShown {
  kind: ConsentKind;
  text_id: string;
  version: string;
  title?: string;
  body: string;
  sha256: string;
  answers: ConsentAnswerValue[];
}

export interface ConsentScreen {
  variant: "A" | "B" | "V";
  texts: ConsentTextShown[];
  can_proceed: boolean;
  blocked_reason: string | null;
}

export interface TrainerSettings {
  format: string;
  engine_version: string;
  scenario: ScenarioPublicPart;
  profile: TrainerProfileForClient;
  consent_screen: ConsentScreen;
}

export interface TrainerProfileForClient {
  id: string;
  revision: number;
  settings: TrainerProfileSettings;
}

export interface ConsentAnswer {
  kind: ConsentKind;
  answer: ConsentAnswerValue;
  text_id: string;
  shown_text_sha256: string;
}

export interface ConsentsRequest {
  answers: ConsentAnswer[];
}

export interface ConsentsResponse {
  records: ConsentRecord[];
  can_start: boolean;
  external_ai_allowed: boolean;
  message: string | null;
}

export interface SessionStart {
  id: string;
  status: SessionStatus;
  started_at: string;
  mode: Mode;
  difficulty: Difficulty;
  is_demo: boolean;
  profile_revision?: number;
  criteria_set?: string;
  external_ai_allowed: boolean;
}

export interface ModelAccess {
  model_server_token: string | null;
  openrouter_key: string | null;
}

export interface RestoreState {
  turns: TurnEvent[];
  incidents: IncidentEvent[];
  elapsed_ms: number;
}

export interface SessionStartResponse {
  session: SessionStart;
  private_part: EngineObject;
  model_access: ModelAccess;
  profile: TrainerProfileForClient;
  restore: RestoreState;
}

export interface EventBatchResult {
  accepted: number;
  duplicates: number;
  contiguous_seq: number;
  missing_seqs?: number[];
  session_status: SessionStatus;
  reopened: boolean;
  note?: string | null;
}

export interface FinishRequest {
  status: ClosingStatus;
  last_seq: number;
  final_id?: string;
  break_stage?: string;
  break_turn?: number;
  judge_answer?: JudgeAnswer;
  judge_attempts: number;
  client_scores?: EngineObject;
}

export interface ParticipantIssueRow {
  issue_id: string;
  label: string;
  unit?: string | null;
  deal_value: string | number | null;
  target: string | number;
  limit: string | number;
  deal_reply_no?: number | null;
  not_scored_note?: string | null;
}

export interface SummaryItem {
  kind: "strength" | "miss";
  observation: string;
  reply: number;
  quote: string;
  instead: string;
  speaker?: Speaker;
  at_ms?: number;
}

export interface ParticipantResult {
  header: SessionHeader;
  marks: Mark[];
  score_columns: ScoreColumns;
  issues: ParticipantIssueRow[];
  hidden_unrevealed: Array<{ id: string; label: string }>;
  transcript: TranscriptLine[];
  objections: ParticipantObjection[];
  epilogue?: string | null;
  scores?: EngineObject | null;
  summary: SummaryItem[];
  can_retry_judge: boolean;
}

export interface ParticipantResultList {
  attempts: Array<{
    session_id: string;
    header: SessionHeader;
    score_columns: ScoreColumns;
    marks: Mark[];
    has_objection: boolean;
  }>;
  progress: ProgressLine[];
}

export interface JudgeRetryPack {
  session_id: string;
  criteria_set?: string;
  transcript: TranscriptLine[];
  judge_decisions: EngineObject[];
  offer_log: EngineObject[];
  code_episodes?: EngineObject[];
  opponent_interests: EngineObject[];
  revealed_facts: Array<{ id: string; text: string }>;
  participant_brief: EngineObject;
  model_access: ModelAccess;
  profile: TrainerProfileForClient;
}
