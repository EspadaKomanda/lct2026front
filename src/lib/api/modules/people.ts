import { api, buildQuery } from "../client";
import type {
  ConsentRecord,
  ConsentWithdrawal,
  ConsentWithdrawalResult,
  DecisionCandidate,
  Group,
  GroupWrite,
  Person,
  PersonCard,
  PersonPage,
  PersonWrite,
  Progress,
  WrittenConsentCreate,
} from "../types";

export function listGroups(params?: { include_archived?: boolean }): Promise<Group[]> {
  return api.get<Group[]>(`/groups${buildQuery(params)}`);
}

export function createGroup(body: GroupWrite): Promise<Group> {
  return api.post<Group>("/groups", body);
}

export function updateGroup(groupId: string, body: GroupWrite): Promise<Group> {
  return api.patch<Group>(`/groups/${groupId}`, body);
}

export interface PersonListParams {
  group_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export function listPeople(params?: PersonListParams): Promise<PersonPage> {
  return api.get<PersonPage>(`/people${buildQuery(params)}`);
}

export function createPerson(body: PersonWrite): Promise<Person> {
  return api.post<Person>("/people", body);
}

export function getPerson(subjectId: string): Promise<PersonCard> {
  return api.get<PersonCard>(`/people/${subjectId}`);
}

export function updatePerson(subjectId: string, body: PersonWrite): Promise<Person> {
  return api.patch<Person>(`/people/${subjectId}`, body);
}

export function getPersonProgress(subjectId: string): Promise<Progress> {
  return api.get<Progress>(`/people/${subjectId}/progress`);
}

export function addWrittenConsent(
  subjectId: string,
  body: WrittenConsentCreate,
): Promise<ConsentRecord> {
  return api.post<ConsentRecord>(`/people/${subjectId}/written-consents`, body);
}

export function withdrawConsent(
  subjectId: string,
  body: ConsentWithdrawal,
): Promise<ConsentWithdrawalResult> {
  return api.post<ConsentWithdrawalResult>(`/people/${subjectId}/consent-withdrawal`, body);
}

export function listDecisionCandidates(subjectId: string): Promise<DecisionCandidate[]> {
  return api.get<DecisionCandidate[]>(`/people/${subjectId}/decision-candidates`);
}
