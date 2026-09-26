"use client";

import { Button, CopyButton, DataTable, Drawer, Notice, type Column } from "@/components/ui";
import type { AssignmentCreateResult, IssuedCode } from "@/lib/api/types";

export interface CodesPanelProps {
  open: boolean;
  title?: string;
  result: AssignmentCreateResult | null;
  skippedNames?: Record<string, string>;
  onClose: () => void;
}

export function CodesPanel({ open, title = "Тестирование назначено", result, skippedNames, onClose }: CodesPanelProps) {
  if (!result) return null;

  const columns: Column<IssuedCode>[] = [
    {
      key: "person",
      title: "ФИО",
      render: (c) => <span className="text-sm">{c.person.display_name ?? c.person.number}</span>,
    },
    {
      key: "code",
      title: "Код",
      render: (c) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-13">{c.code}</span>
          <CopyButton text={c.code} />
        </div>
      ),
    },
    {
      key: "link",
      title: "Ссылка",
      render: (c) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs break-all">{c.link}</span>
          <CopyButton text={c.link} className="shrink-0" />
        </div>
      ),
    },
  ];

  const downloadCsv = () => {
    const clean = (v: string) => v.replace(/;/g, " ");
    const lines = ["ФИО;Код;Ссылка"];
    for (const c of result.created) {
      lines.push(`${clean(c.person.display_name ?? c.person.number)};${c.code};${c.link}`);
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "arena-codes.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Drawer open={open} onClose={onClose} width={640}>
      <h2 className="text-xl font-medium leading-tight mb-4">{title}</h2>
      <Notice
        variant="banner"
        className="mb-4"
        message="Код показывается один раз — сохраните его. После закрытия код не показать."
      />
      <DataTable columns={columns} rows={result.created} rowKey={(c) => c.assignment_id} />
      {result.skipped.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {result.skipped.map((s) => (
            <div key={s.subject_id} className="text-13 text-dusk">
              Без тестирования: {skippedNames?.[s.subject_id] ?? s.subject_id} — {s.reason}
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={downloadCsv}>
          Скачать CSV
        </Button>
        <Button onClick={onClose}>Готово</Button>
      </div>
    </Drawer>
  );
}
