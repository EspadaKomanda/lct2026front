import { api, buildQuery } from "../client";
import type { Objection, ObjectionAnswer, ObjectionPage } from "../types";

export type ObjectionStatus = "open" | "answered" | "all";

export interface ObjectionListParams {
  id?: string;
  status?: ObjectionStatus;
  group_id?: string;
  limit?: number;
  offset?: number;
}

export function listObjections(params?: ObjectionListParams): Promise<ObjectionPage> {
  return api.get<ObjectionPage>(`/objections${buildQuery(params)}`);
}

export function respondToObjection(objectionId: string, text: string): Promise<Objection> {
  const body: ObjectionAnswer = { text };
  return api.post<Objection>(`/objections/${objectionId}/response`, body);
}
