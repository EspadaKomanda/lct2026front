import { api, buildQuery } from "../client";
import type {
  ComparisonTable,
  Criterion,
  CriterionSessionPage,
  Difficulty,
  GroupAnalytics,
  Mode,
  ScoringProfile,
  SessionStatus,
} from "../types";

export interface ComparisonParams {
  group_id: string;
  scenario_version_id?: string;
  difficulty?: Difficulty;
  criteria_set?: string;
  scoring_profile?: ScoringProfile;
  sort?: "result" | "process";
  include_simplified?: boolean;
}

export function getComparison(params: ComparisonParams): Promise<ComparisonTable> {
  return api.get<ComparisonTable>(`/analytics/comparison${buildQuery(params)}`);
}

export interface GroupsAnalyticsParams {
  group_id: string[];
  from?: string;
  to?: string;
  scenario_id?: string;
  scenario_version_id?: string;
  difficulty?: Difficulty;
  mode?: Mode;
  status?: SessionStatus;
}

export function getGroupsAnalytics(params: GroupsAnalyticsParams): Promise<GroupAnalytics[]> {
  return api.get<GroupAnalytics[]>(`/analytics/groups${buildQuery(params)}`);
}

export interface CriterionSessionsParams {
  group_id: string[];
  max_band?: number;
  from?: string;
  to?: string;
  scenario_version_id?: string;
  difficulty?: Difficulty;
  limit?: number;
  offset?: number;
}

export function listCriterionSessions(
  criterion: Criterion,
  params: CriterionSessionsParams,
): Promise<CriterionSessionPage> {
  return api.get<CriterionSessionPage>(
    `/analytics/criteria/${criterion}/sessions${buildQuery(params)}`,
  );
}
