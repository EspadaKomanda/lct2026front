"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { exportFile, previewExport } from "@/lib/api/modules/exports";
import type { ExportFilters, ExportRequest } from "@/lib/api/types";
import { Button, Modal, Notice, SegmentControl, useToast } from "@/components/ui";

export function ExportModal({
  open,
  onClose,
  filters,
}: {
  open: boolean;
  onClose: () => void;
  filters: ExportFilters;
}) {
  const toast = useToast();
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [rows, setRows] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<ApiError | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let stale = false;
    setPreviewLoading(true);
    setPreviewError(null);
    const body: ExportRequest = { slice: "group", table: "summary", format, filters };
    previewExport(body)
      .then((preview) => {
        if (!stale) setRows(preview.rows);
      })
      .catch((e: unknown) => {
        if (!stale) setPreviewError(e instanceof ApiError ? e : new ApiError({
          type: "unexpected",
          title: e instanceof Error ? e.message : "Неожиданная ошибка",
          status: 0,
        }));
      })
      .finally(() => {
        if (!stale) setPreviewLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [open, format, filters]);

  const doExport = async () => {
    setExporting(true);
    try {
      const file = await exportFile({ slice: "group", table: "summary", format, filters });
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename ?? `arena-results.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.show(`Файл выгружен: ${file.rowsCount ?? rows ?? 0} строк`);
      onClose();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.problem.title : "Не удалось выгрузить файл");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Выгрузка результатов"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() => void doExport()}
            loading={exporting}
            disabled={previewLoading || previewError !== null || rows === null}
            disabledReason="Сначала дождитесь подсчёта строк"
          >
            {rows !== null ? `Выгрузить ${rows} строк` : "Выгрузить"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SegmentControl
          value={format}
          onChange={(v) => setFormat(v as "csv" | "xlsx")}
          options={[
            { value: "csv", label: "CSV" },
            { value: "xlsx", label: "XLSX" },
          ]}
        />
        {previewError ? (
          <Notice variant="error" title={previewError.problem.title} />
        ) : (
          <p className="text-sm">
            {previewLoading
              ? "Считаем строки…"
              : `В файл попадут ${rows ?? 0} строк по текущим фильтрам.`}
          </p>
        )}
        <p className="text-xs text-dusk">Каждая выгрузка пишется в журнал.</p>
      </div>
    </Modal>
  );
}
