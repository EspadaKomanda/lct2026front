import { api, apiRequest, buildQuery } from "../client";
import type {
  ArchiveRequest,
  CreateScenarioRequest,
  Difficulty,
  Draft,
  DryRunCheck,
  EngineObject,
  GenerationConfirm,
  GenerationRegenerate,
  GenerationState,
  HealthSessionPage,
  Mode,
  NegotiationType,
  PublishRequest,
  ScenarioCard,
  ScenarioDocument,
  ScenarioHealth,
  ScenarioPage,
  ScenarioStatus,
  ScenarioTemplate,
  Sphere,
  Version,
  VersionSummary,
} from "../types";

export interface ScenarioListParams {
  q?: string;
  sphere?: Sphere;
  negotiation_type?: NegotiationType;
  mode?: Mode;
  status?: ScenarioStatus;
  tag?: string;
  limit?: number;
  offset?: number;
}

export function listScenarios(params?: ScenarioListParams): Promise<ScenarioPage> {
  return api.get<ScenarioPage>(`/scenarios${buildQuery(params)}`);
}

export function createScenario(body: CreateScenarioRequest): Promise<ScenarioCard> {
  return api.post<ScenarioCard>("/scenarios", body);
}

export function listScenarioTemplates(): Promise<ScenarioTemplate[]> {
  return api.get<ScenarioTemplate[]>("/scenario-templates");
}

export function importScenario(document: ScenarioDocument): Promise<ScenarioCard> {
  return api.post<ScenarioCard>("/scenarios/import", document);
}

export function getScenario(scenarioId: string): Promise<ScenarioCard> {
  return api.get<ScenarioCard>(`/scenarios/${scenarioId}`);
}

export interface DraftBundle {
  draft: Draft;
  etag: string | null;
}

export async function getDraft(scenarioId: string): Promise<DraftBundle> {
  const res = await apiRequest<Draft>("GET", `/scenarios/${scenarioId}/draft`);
  return { draft: res.data, etag: res.headers.get("etag") };
}

export async function saveDraft(
  scenarioId: string,
  etag: string,
  document: ScenarioDocument,
): Promise<DraftBundle> {
  const res = await apiRequest<Draft>("PUT", `/scenarios/${scenarioId}/draft`, {
    body: { document },
    headers: { "if-match": etag },
  });
  return { draft: res.data, etag: res.headers.get("etag") };
}

export function checkDraft(scenarioId: string, document: ScenarioDocument): Promise<DryRunCheck> {
  return api.post<DryRunCheck>(`/scenarios/${scenarioId}/draft/check`, { document });
}

export function publishScenario(
  scenarioId: string,
  fingerprint: string,
): Promise<VersionSummary> {
  const body: PublishRequest = { fingerprint };
  return api.post<VersionSummary>(`/scenarios/${scenarioId}/publish`, body);
}

export function listVersions(scenarioId: string): Promise<VersionSummary[]> {
  return api.get<VersionSummary[]>(`/scenarios/${scenarioId}/versions`);
}

export function getVersion(scenarioId: string, versionNumber: number): Promise<Version> {
  return api.get<Version>(`/scenarios/${scenarioId}/versions/${versionNumber}`);
}

export function exportScenario(scenarioId: string, version?: number): Promise<ScenarioDocument> {
  return api.get<ScenarioDocument>(
    `/scenarios/${scenarioId}/export${buildQuery(version !== undefined ? { version } : undefined)}`,
  );
}

export function setScenarioArchived(scenarioId: string, archived: boolean): Promise<ScenarioCard> {
  const body: ArchiveRequest = { archived };
  return api.post<ScenarioCard>(`/scenarios/${scenarioId}/archive`, body);
}

export function getGeneration(scenarioId: string): Promise<GenerationState> {
  return api.get<GenerationState>(`/scenarios/${scenarioId}/generation`);
}

export function confirmGenerationStep(
  scenarioId: string,
  step: 1 | 2 | 3,
  fields: EngineObject,
): Promise<GenerationState> {
  const body: GenerationConfirm = { fields };
  return api.post<GenerationState>(
    `/scenarios/${scenarioId}/generation/steps/${step}/confirm`,
    body,
  );
}

export function regenerateGenerationStep(
  scenarioId: string,
  step: 1 | 2 | 3,
  body?: GenerationRegenerate,
): Promise<GenerationState> {
  return api.post<GenerationState>(
    `/scenarios/${scenarioId}/generation/steps/${step}/regenerate`,
    body,
  );
}

export function getVersionHealth(
  scenarioId: string,
  versionNumber: number,
  params?: { difficulty?: Difficulty },
): Promise<ScenarioHealth> {
  return api.get<ScenarioHealth>(
    `/scenarios/${scenarioId}/versions/${versionNumber}/health${buildQuery(params)}`,
  );
}

export interface HealthSessionsParams {
  final_id?: string;
  break_stage?: string;
  with_violations?: boolean;
  difficulty?: Difficulty;
  limit?: number;
  offset?: number;
}

export function listHealthSessions(
  scenarioId: string,
  versionNumber: number,
  params?: HealthSessionsParams,
): Promise<HealthSessionPage> {
  return api.get<HealthSessionPage>(
    `/scenarios/${scenarioId}/versions/${versionNumber}/health/sessions${buildQuery(params)}`,
  );
}
