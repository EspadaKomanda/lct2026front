import { api, buildQuery } from "../client";
import type { Rehearsal, RehearsalCreate, RehearsalLink, RehearsalList } from "../types";

export function listRehearsals(
  scenarioId: string,
  params?: { fingerprint?: string },
): Promise<RehearsalList> {
  return api.get<RehearsalList>(
    `/scenarios/${scenarioId}/rehearsals${buildQuery(params)}`,
  );
}

export function createRehearsal(
  scenarioId: string,
  body: RehearsalCreate,
): Promise<RehearsalLink> {
  return api.post<RehearsalLink>(`/scenarios/${scenarioId}/rehearsals`, body);
}

export function getRehearsal(rehearsalId: string): Promise<Rehearsal> {
  return api.get<Rehearsal>(`/rehearsals/${rehearsalId}`);
}
