import { api, buildQuery } from "../client";
import type {
  Difficulty,
  Mode,
  ReducedSession,
  Review,
  ScoringProfile,
  SessionPage,
  SessionRecord,
  SessionResult,
  SessionStatus,
} from "../types";

export type SessionFlag = "simplified" | "opponent_violation" | "unreviewed" | "lucky" | "objection";

export interface SessionListParams {
  group_id?: string;
  subject_id?: string;
  assignment_id?: string;
  scenario_id?: string;
  scenario_version_id?: string;
  difficulty?: Difficulty;
  criteria_set?: string;
  scoring_profile?: ScoringProfile;
  mode?: Mode;
  status?: SessionStatus;
  flag?: SessionFlag;
  from?: string;
  to?: string;
  sort?: "started_at_desc" | "started_at_asc";
  limit?: number;
  offset?: number;
}

export function listSessions(params?: SessionListParams): Promise<SessionPage> {
  return api.get<SessionPage>(`/sessions${buildQuery(params)}`);
}

export function getSession(sessionId: string): Promise<SessionResult> {
  return api.get<SessionResult>(`/sessions/${sessionId}`);
}

export function getSessionRecord(sessionId: string): Promise<SessionRecord> {
  return api.get<SessionRecord>(`/sessions/${sessionId}/record`);
}

export function reviewSession(sessionId: string): Promise<Review> {
  return api.post<Review>(`/sessions/${sessionId}/review`);
}

export function getReducedSession(sessionId: string): Promise<ReducedSession> {
  return api.get<ReducedSession>(`/sessions/${sessionId}/reduced`);
}
