"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/api/hooks";
import { listGroups } from "@/lib/api/modules/people";
import { listSessions } from "@/lib/api/modules/sessions";
import { listScenarios } from "@/lib/api/modules/scenarios";
import type {
  Difficulty,
  ExportFilters,
  Mode,
  SessionListItem,
  SessionStatus,
} from "@/lib/api/types";
import {
  DIFFICULTY_LABEL,
  MODE_LABEL,
  SESSION_STATUS_LABEL,
} from "@/lib/labels";
import { cx, formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  FinalRank,
  Notice,
  PageSpinner,
  Pagination,
  type Column,
} from "@/components/ui";
import { ExportModal } from "@/components/results/export-modal";
import { SessionFlagBadges } from "@/components/results/flag-badges";

const LIMIT = 20;
const STATUSES = Object.keys(SESSION_STATUS_LABEL) as SessionStatus[];
const DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as Difficulty[];
const MODE_CYCLE: Array<Mode | ""> = ["", "assessment", "training"];

function Pill({
  active,
  label,
  children,
}: {
  active: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "flex items-center gap-1.5 h-9 px-3 rounded-field border text-sm",
        active ? "bg-frost border-accent" : "bg-surface border-contour"
      )}
    >
      <span className="text-13 text-dusk whitespace-nowrap">{label}</span>
      {children}
    </div>
  );
}

const pillSelect =
  "bg-transparent text-sm font-medium outline-none cursor-pointer max-w-[220px] truncate";
const pillDate =
  "bg-transparent text-13 outline-none cursor-pointer [color-scheme:light]";

function conditionKey(s: SessionListItem): string {
  return [
    s.header.mode,
    s.header.scenario_id,
    s.header.version_number,
    s.header.difficulty,
    s.header.scoring_profile ?? "",
  ].join("|");
}

function ResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [groupId, setGroupId] = useState(searchParams.get("group_id") ?? "");
  const [scenarioId, setScenarioId] = useState(searchParams.get("scenario_id") ?? "");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") ?? "");
  const [mode, setMode] = useState<Mode | "">((searchParams.get("mode") as Mode) || "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [offset, setOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);

  const groups = useApi(() => listGroups(), []);
  const scenarios = useApi(() => listScenarios({ limit: 100 }), []);

  const params = useMemo(
    () => ({
      group_id: groupId || undefined,
      scenario_id: scenarioId || undefined,
      difficulty: (difficulty || undefined) as Difficulty | undefined,
      mode: mode || undefined,
      status: (status || undefined) as SessionStatus | undefined,
      from: from || undefined,
      to: to || undefined,
      sort: "started_at_desc" as const,
      limit: LIMIT,
      offset,
    }),
    [groupId, scenarioId, difficulty, mode, status, from, to, offset]
  );
  const paramsKey = JSON.stringify(params);
  const sessions = useApi(() => listSessions(params), [paramsKey]);

  const filtersForExport: ExportFilters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      group_ids: groupId ? [groupId] : undefined,
      scenario_id: scenarioId || undefined,
      difficulty: (difficulty || undefined) as Difficulty | undefined,
      mode: mode || undefined,
      statuses: status ? [status as SessionStatus] : undefined,
    }),
    [from, to, groupId, scenarioId, difficulty, mode, status]
  );

  const items = sessions.data?.items ?? [];
  const total = sessions.data?.page.total ?? 0;

  const selectedItems = useMemo(
    () => items.filter((it) => selectedIds.has(it.session_id)),
    [items, selectedIds]
  );
  const canCompare =
    selectedItems.length >= 2 &&
    selectedItems.every((s) => conditionKey(s) === conditionKey(selectedItems[0]));

  const resetPage = () => setOffset(0);

  const cycleMode = () => {
    const idx = MODE_CYCLE.indexOf(mode);
    setMode(MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]);
    resetPage();
  };

  const columns: Column<SessionListItem>[] = [
    {
      key: "date",
      title: "Дата",
      render: (s) => (
        <span className="whitespace-nowrap">{formatDateTime(s.header.started_at)}</span>
      ),
    },
    {
      key: "person",
      title: "Сотрудник",
      render: (s) => (
        <span className="flex flex-col leading-tight">
          <span>{s.person.display_name ?? s.person.number}</span>
          <span className="text-xs text-dusk">{s.person.number}</span>
        </span>
      ),
    },
    {
      key: "scenario",
      title: "Сценарий",
      render: (s) => (
        <span>
          {s.header.scenario_title} · версия {s.header.version_number}
        </span>
      ),
    },
    {
      key: "mode",
      title: "Режим",
      render: (s) => (
        <Badge variant={s.header.mode === "assessment" ? "assessment" : "training"}>
          {MODE_LABEL[s.header.mode]}
        </Badge>
      ),
    },
    {
      key: "result",
      title: "Результат",
      render: (s) =>
        s.score_columns.result_rank ? (
          <FinalRank
            rank={s.score_columns.result_rank}
            size="sm"
            titleClassName="max-w-[160px]"
            title={
              <span className="block truncate max-w-[160px]" title={s.score_columns.final_title ?? ""}>
                {s.score_columns.final_title ?? "—"}
              </span>
            }
          />
        ) : (
          "—"
        ),
    },
    {
      key: "process",
      title: "Процесс",
      align: "right",
      render: (s) =>
        s.score_columns.process_number !== null ? (
          <span className="font-medium">{s.score_columns.process_number}</span>
        ) : (
          "—"
        ),
    },
    {
      key: "status",
      title: "Статус",
      render: (s) => SESSION_STATUS_LABEL[s.header.status],
    },
    {
      key: "marks",
      title: "Пометки",
      render: (s) => <SessionFlagBadges flags={s.flags} />,
    },
  ];

  const forbidden = sessions.error?.problem.type === "forbidden_group";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-medium mr-auto">Результаты</h1>
        <Button variant="secondary" onClick={() => setExportOpen(true)}>
          Выгрузить
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Pill label="Группа" active={groupId !== ""}>
          <select
            className={pillSelect}
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              resetPage();
            }}
          >
            <option value="">Все</option>
            {(groups.data ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Pill>
        <Pill label="Сценарий" active={scenarioId !== ""}>
          <select
            className={pillSelect}
            value={scenarioId}
            onChange={(e) => {
              setScenarioId(e.target.value);
              resetPage();
            }}
          >
            <option value="">Все</option>
            {(scenarios.data?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </Pill>
        <Pill label="Уровень" active={difficulty !== ""}>
          <select
            className={pillSelect}
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              resetPage();
            }}
          >
            <option value="">Все</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
        </Pill>
        <Pill label="Режим" active={mode !== ""}>
          <button type="button" className="text-sm font-medium" onClick={cycleMode}>
            {mode === "" ? "Все" : MODE_LABEL[mode]}
          </button>
        </Pill>
        <Pill label="Статус" active={status !== ""}>
          <select
            className={pillSelect}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              resetPage();
            }}
          >
            <option value="">Все</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {SESSION_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Pill>
        <Pill label="Период" active={from !== "" || to !== ""}>
          <input
            type="date"
            className={pillDate}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              resetPage();
            }}
          />
          <span className="text-dusk">—</span>
          <input
            type="date"
            className={pillDate}
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              resetPage();
            }}
          />
        </Pill>
      </div>

      {sessions.loading ? (
        <PageSpinner />
      ) : sessions.error ? (
        forbidden ? (
          <EmptyState
            icon="lock"
            text="Нет доступа к результатам группы. Доступ выдаёт администратор"
          />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <Notice variant="error" title={sessions.error.problem.title} />
            <Button variant="secondary" size="sm" onClick={sessions.reload}>
              Повторить
            </Button>
          </div>
        )
      ) : items.length === 0 ? (
        <EmptyState text="По этим фильтрам сессий нет — выгружать нечего" />
      ) : (
        <>
          <DataTable<SessionListItem>
            columns={columns}
            rows={items}
            rowKey={(s) => s.session_id}
            selectable
            selectedKeys={selectedIds}
            onSelectedKeysChange={(keys) => setSelectedIds(new Set(keys))}
            onRowClick={(s) => router.push(`/results/${s.session_id}`)}
          />
          <Pagination
            offset={offset}
            limit={LIMIT}
            total={total}
            onOffsetChange={setOffset}
            className="justify-end"
          />
        </>
      )}

      {selectedItems.length >= 2 && (
        <div className="flex items-center gap-3 bg-frost rounded-field p-2">
          <span className="text-13">Выбрано: {selectedItems.length}</span>
          <Button
            size="sm"
            disabled={!canCompare}
            disabledReason="Сравнивать можно только попытки в одинаковых условиях"
            onClick={() =>
              router.push(
                `/compare?ids=${selectedItems.map((s) => s.session_id).join(",")}`
              )
            }
          >
            Сравнить
          </Button>
          <span className="text-xs text-dusk">
            Сравнивать можно только попытки в одинаковых условиях: сценарий, версия,
            уровень, режим и профиль оценки.
          </span>
        </div>
      )}

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        filters={filtersForExport}
      />
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ResultsInner />
    </Suspense>
  );
}
