"use client";

import { useMemo, useState } from "react";
import { useApi, useMutation } from "@/lib/api/hooks";
import { exportFile, previewExport } from "@/lib/api/modules/exports";
import { listGroups, listPeople } from "@/lib/api/modules/people";
import { listScenarios, listVersions } from "@/lib/api/modules/scenarios";
import type { Difficulty, ExportRequest, Mode, SessionStatus } from "@/lib/api/types";
import { DIFFICULTY_LABEL, MODE_LABEL, SESSION_STATUS_LABEL } from "@/lib/labels";
import {
  Button,
  Card,
  Checkbox,
  Icon,
  Input,
  Notice,
  Select,
  SegmentControl,
  useToast,
} from "@/components/ui";

type Slice = ExportRequest["slice"];
type Table = ExportRequest["table"];
type Format = ExportRequest["format"];

const STATUSES = Object.entries(SESSION_STATUS_LABEL) as Array<[SessionStatus, string]>;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ExportsPage() {
  const toast = useToast();
  const [slice, setSlice] = useState<Slice>("group");
  const [table, setTable] = useState<Table>("summary");
  const [format, setFormat] = useState<Format>("xlsx");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [mode, setMode] = useState<Mode | "">("");
  const [statuses, setStatuses] = useState<SessionStatus[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filename, setFilename] = useState<string | null>(null);

  const groupsApi = useApi(() => listGroups(), []);
  const peopleApi = useApi(() => listPeople({ limit: 500 }), []);
  const scenariosApi = useApi(() => listScenarios({ limit: 100 }), []);
  const versionsApi = useApi(
    () => (scenarioId ? listVersions(scenarioId) : Promise.resolve([])),
    [scenarioId]
  );

  const groups = groupsApi.data ?? [];
  const people = peopleApi.data?.items ?? [];
  const scenarios = scenariosApi.data?.items ?? [];

  const request = useMemo((): ExportRequest => ({
    slice,
    table,
    format,
    filters: {
      from: from || undefined,
      to: to || undefined,
      group_ids: slice === "group" ? groupIds : undefined,
      subject_id: slice === "employee" ? subjectId || undefined : undefined,
      scenario_id: slice === "scenario" ? scenarioId || undefined : undefined,
      scenario_version_id: slice === "scenario" ? versionId || undefined : undefined,
      difficulty: difficulty || undefined,
      mode: mode || undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
    },
  }), [
    slice, table, format, groupIds, subjectId, scenarioId, versionId,
    difficulty, mode, statuses, from, to,
  ]);

  const preview = useMutation((body: ExportRequest) => previewExport(body));
  const exporter = useMutation((body: ExportRequest) => exportFile(body));

  const toggleStatus = (status: SessionStatus, checked: boolean) => {
    setStatuses((prev) => (checked ? [...prev, status] : prev.filter((s) => s !== status)));
  };

  const toggleGroup = (id: string, checked: boolean) => {
    setGroupIds((prev) => (checked ? [...prev, id] : prev.filter((g) => g !== id)));
  };

  const doExport = async () => {
    const file = await exporter.run(request);
    if (!file) return;
    const name = file.filename ?? `arena-${slice}-${Date.now()}.${format}`;
    downloadBlob(file.blob, name);
    setFilename(name);
    const rows = file.rowsCount;
    toast.show(`Файл выгружен: ${rows !== null ? `${rows} строк` : "готово"}`);
  };

  const showSliceGroups = slice === "group";
  const showSliceEmployee = slice === "employee";
  const showSliceScenario = slice === "scenario";

  return (
    <div className="flex flex-col gap-6 max-w-[860px]">
      <h1 className="text-2xl font-semibold leading-tight">Выгрузки</h1>

      <Card bordered className="p-5 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-medium">Срез</span>
          <SegmentControl
            value={slice}
            onChange={(v) => setSlice(v as Slice)}
            options={[
              { value: "group", label: "По группам" },
              { value: "employee", label: "По сотруднику" },
              { value: "scenario", label: "По сценарию" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-13 font-medium">Таблица</span>
            <SegmentControl
              value={table}
              onChange={(v) => setTable(v as Table)}
              options={[
                { value: "summary", label: "Итоговая" },
                { value: "turns", label: "Подробная" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-13 font-medium">Формат</span>
            <SegmentControl
              value={format}
              onChange={(v) => setFormat(v as Format)}
              options={[
                { value: "csv", label: "CSV" },
                { value: "xlsx", label: "XLSX" },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {showSliceGroups && (
            <div className="flex flex-col gap-1.5">
              <span className="text-13 font-medium">Группы</span>
              <div className="flex flex-col gap-2 bg-bg rounded-field border border-line p-3 max-h-44 overflow-auto">
                {groups.map((g) => (
                  <Checkbox
                    key={g.id}
                    checked={groupIds.includes(g.id)}
                    onChange={(checked) => toggleGroup(g.id, checked)}
                    label={g.name}
                  />
                ))}
                {groups.length === 0 && <span className="text-13 text-dusk">Нет групп</span>}
              </div>
            </div>
          )}
          {showSliceEmployee && (
            <Select
              label="Сотрудник"
              value={subjectId}
              onChange={setSubjectId}
              options={people.map((p) => ({
                value: p.subject_id,
                label: p.full_name ?? p.pseudonym ?? p.number,
              }))}
              placeholder="Выберите сотрудника"
            />
          )}
          {showSliceScenario && (
            <>
              <Select
                label="Сценарий"
                value={scenarioId}
                onChange={setScenarioId}
                options={scenarios.map((s) => ({ value: s.id, label: s.title }))}
                placeholder="Выберите сценарий"
              />
              <Select
                label="Версия"
                value={versionId}
                onChange={setVersionId}
                options={(versionsApi.data ?? []).map((v) => ({
                  value: v.id,
                  label: `Версия ${v.number}`,
                }))}
                placeholder="Все версии"
                disabled={!scenarioId}
              />
            </>
          )}
          <Select
            label="Уровень"
            value={difficulty}
            onChange={(v) => setDifficulty(v as Difficulty | "")}
            options={Object.entries(DIFFICULTY_LABEL).map(([value, label]) => ({ value, label }))}
            placeholder="Все"
          />
          <Select
            label="Режим"
            value={mode}
            onChange={(v) => setMode(v as Mode | "")}
            options={Object.entries(MODE_LABEL).map(([value, label]) => ({ value, label }))}
            placeholder="Все"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Период с"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label="Период по"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-medium">Статусы сессий</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {STATUSES.map(([status, label]) => (
              <Checkbox
                key={status}
                checked={statuses.includes(status)}
                onChange={(checked) => toggleStatus(status, checked)}
                label={label}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" loading={preview.loading} onClick={() => preview.run(request)}>
            <Icon name="check" size={14} />
            Проверить
          </Button>
          <Button
            loading={exporter.loading}
            disabled={!preview.result || preview.result.rows === 0}
            disabledReason={!preview.result ? "Сначала нажмите «Проверить»" : "Нет строк для выгрузки"}
            onClick={doExport}
          >
            <Icon name="dl" size={14} />
            {preview.result ? `Выгрузить ${preview.result.rows} строк` : "Выгрузить"}
          </Button>
        </div>

        {preview.error && <Notice variant="error" title={preview.error.problem.title} />}
        {exporter.error && <Notice variant="error" title={exporter.error.problem.title} />}

        {preview.result && (
          <div className="flex flex-col gap-3 border border-line rounded-field p-4 bg-bg">
            <p className="text-sm font-medium">
              Сессий: {preview.result.sessions} · строк: {preview.result.rows}
            </p>
            {preview.result.groups.length > 0 && (
              <ul className="flex flex-col gap-1">
                {preview.result.groups.map((g) => (
                  <li key={g.id} className="text-13 text-dusk">
                    {g.name}: {g.rows} строк
                  </li>
                ))}
              </ul>
            )}
            <Notice
              variant="banner"
              title="Каждая выгрузка пишется в журнал: кто, когда, группа, число строк"
            />
            {filename && !exporter.loading && (
              <p className="text-13 text-dusk flex items-center gap-1.5">
                <Icon name="fileCheck" size={14} />
                Файл: {filename}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
