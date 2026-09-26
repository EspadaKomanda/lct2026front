import { api, apiDownload, type ApiFile } from "../client";
import type { ExportPreview, ExportRequest } from "../types";

export type { ApiFile };

export function previewExport(body: ExportRequest): Promise<ExportPreview> {
  return api.post<ExportPreview>("/exports", { ...body, dry_run: true });
}

export function exportFile(body: ExportRequest): Promise<ApiFile> {
  return apiDownload("/exports", body);
}
