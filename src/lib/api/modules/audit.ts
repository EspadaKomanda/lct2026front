import { api, apiDownload, buildQuery, type ApiFile } from "../client";
import type { AuditAction, AuditExportRequest, AuditPage } from "../types";

export type { ApiFile };

export interface AuditListParams {
  from?: string;
  to?: string;
  actor_user_id?: string;
  group_id?: string;
  subject_number?: string;
  action?: AuditAction;
  outcome?: "ok" | "denied";
  limit?: number;
  offset?: number;
}

export function listAuditEntries(params?: AuditListParams): Promise<AuditPage> {
  return api.get<AuditPage>(`/audit-log${buildQuery(params)}`);
}

export function exportAuditLog(body: AuditExportRequest): Promise<ApiFile> {
  return apiDownload("/audit-log/export", body);
}
