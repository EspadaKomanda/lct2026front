import { api, buildQuery } from "../client";
import type {
  Assignment,
  AssignmentCreate,
  AssignmentCreateResult,
  AssignmentPage,
  AssignmentPatch,
  AssignmentStatus,
  ReissueRequest,
} from "../types";

export interface AssignmentListParams {
  id?: string;
  group_id?: string;
  subject_id?: string;
  scenario_id?: string;
  status?: AssignmentStatus;
  batch_id?: string;
  due_before?: string;
  limit?: number;
  offset?: number;
}

export function listAssignments(params?: AssignmentListParams): Promise<AssignmentPage> {
  return api.get<AssignmentPage>(`/assignments${buildQuery(params)}`);
}

export function createAssignments(body: AssignmentCreate): Promise<AssignmentCreateResult> {
  return api.post<AssignmentCreateResult>("/assignments", body);
}

export function reissueCodes(assignmentIds: string[]): Promise<AssignmentCreateResult> {
  const body: ReissueRequest = { assignment_ids: assignmentIds };
  return api.post<AssignmentCreateResult>("/assignments/reissue-codes", body);
}

export function updateAssignment(assignmentId: string, dueAt: string): Promise<Assignment> {
  const body: AssignmentPatch = { due_at: dueAt };
  return api.patch<Assignment>(`/assignments/${assignmentId}`, body);
}

export function cancelAssignment(assignmentId: string): Promise<Assignment> {
  return api.post<Assignment>(`/assignments/${assignmentId}/cancel`);
}

export function unblockAssignmentCode(assignmentId: string): Promise<Assignment> {
  return api.post<Assignment>(`/assignments/${assignmentId}/unblock-code`);
}
