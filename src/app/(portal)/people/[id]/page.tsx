"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Assignment, ConsentRecord, Decision, ProgressLine } from "@/lib/api/types";
import { getMe } from "@/lib/api/modules/auth";
import { getPerson, getPersonProgress, listDecisionCandidates, listGroups } from "@/lib/api/modules/people";
import { useApi } from "@/lib/api/hooks";
import {
  ASSIGNMENT_STATUS_LABEL,
  CONSENT_ANSWER_LABEL,
  CONSENT_KIND_LABEL,
  CRITERION_LABEL,
  DIFFICULTY_LABEL,
  MODE_LABEL,
} from "@/lib/labels";
import { cx, formatDate, formatDateTime, formatDay } from "@/lib/utils";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  FinalRank,
  Menu,
  Notice,
  PageSpinner,
  type BadgeVariant,
  type Column,
} from "@/components/ui";
import {
  DecisionForm,
  PersonFormModal,
  ProgressChart,
  WithdrawConsentModal,
  WrittenConsentModal,
} from "@/components/people";

const ASSIGNMENT_BADGE: Record<Assignment["status"], BadgeVariant> = {
  not_started: "statusGray",
  in_progress: "default",
  passed: "reviewed",
  abandoned: "statusGray",
  expired: "smallData",
  cancelled: "smallData",
  code_blocked: "violation",
};

function ConsentBadge({ record }: { record: ConsentRecord }) {
  return (
    <span className={cx("inline-flex items-center gap-1", record.answer === "refused" ? "text-danger font-medium" : "")}>
      {CONSENT_ANSWER_LABEL[record.answer]}
    </span>
  );
}

function documentCell(c: ConsentRecord) {
  if (!c.document_ref) return "—";
  const channel = c.document_channel === "paper" ? "бумага" : c.document_channel === "edo" ? "ЭДО" : null;
  return [c.document_ref, channel, formatDay(c.signed_on)].filter(Boolean).join(" · ");
}

interface HistoryRow {
  sessionId: string;
  startedAt: string;
  line: ProgressLine;
  point: ProgressLine["points"][number];
}

function lineMeta(line: ProgressLine) {
  return `версия ${line.version_number} · ${DIFFICULTY_LABEL[line.difficulty]}`;
}

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const me = useApi(getMe, []);
  const isAdmin = me.data?.user.role === "admin";

  const card = useApi(() => getPerson(id), [id]);
  const progress = useApi(() => getPersonProgress(id), [id]);
  const candidates = useApi(() => listDecisionCandidates(id), [id]);
  const groups = useApi(listGroups, []);

  const [editOpen, setEditOpen] = useState(false);
  const [writtenOpen, setWrittenOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const person = card.data?.person ?? null;
  const reload = () => {
    card.reload();
    progress.reload();
    candidates.reload();
  };

  const historyRows = useMemo<HistoryRow[]>(() => {
    const rows: HistoryRow[] = [];
    for (const line of progress.data?.lines ?? []) {
      for (const point of line.points) {
        rows.push({ sessionId: point.session_id, startedAt: point.started_at, line, point });
      }
    }
    rows.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
    return rows;
  }, [progress.data]);

  const historyColumns: Column<HistoryRow>[] = [
    { key: "date", title: "Дата", render: (r) => formatDateTime(r.startedAt) },
    {
      key: "scenario",
      title: "Сценарий",
      render: (r) => (
        <span>
          {r.line.scenario_title} <span className="text-dusk">· {lineMeta(r.line)}</span>
        </span>
      ),
    },
    {
      key: "final",
      title: "Финал",
      render: (r) => (r.point.result_rank ? <FinalRank rank={r.point.result_rank} size="sm" /> : "—"),
    },
    {
      key: "result",
      title: "Результат",
      render: (r) => (r.point.result_number !== null ? `${r.point.result_number}/100` : "—"),
    },
    { key: "process", title: "Процесс", render: (r) => r.point.process_number ?? "—" },
  ];

  const assignmentColumns: Column<Assignment>[] = [
    {
      key: "scenario",
      title: "Сценарий",
      render: (a) => a.scenario_title ?? a.scenario_id,
    },
    {
      key: "mode",
      title: "Режим",
      render: (a) => `${MODE_LABEL[a.mode]} · ${DIFFICULTY_LABEL[a.difficulty]}`,
    },
    { key: "due", title: "Срок", render: (a) => formatDate(a.due_at) },
    {
      key: "status",
      title: "Статус",
      render: (a) => (
        <Badge variant={ASSIGNMENT_BADGE[a.status]} title={ASSIGNMENT_STATUS_LABEL[a.status]}>
          {ASSIGNMENT_STATUS_LABEL[a.status]}
        </Badge>
      ),
    },
  ];

  const consentColumns: Column<ConsentRecord>[] = [
    { key: "kind", title: "Вид", render: (c) => CONSENT_KIND_LABEL[c.kind] },
    { key: "answer", title: "Ответ", render: (c) => <ConsentBadge record={c} /> },
    { key: "version", title: "Версия текста", render: (c) => c.text_version ?? "—" },
    { key: "answered", title: "Дата", render: (c) => formatDateTime(c.answered_at) },
    { key: "document", title: "Документ", render: documentCell },
  ];

  if (card.error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Notice variant="error" message={card.error.problem.title} />
        <Button variant="secondary" onClick={card.reload}>Обновить</Button>
      </div>
    );
  }

  if (card.loading || !person) {
    return <PageSpinner />;
  }

  const displayName = person.full_name ?? person.pseudonym ?? person.number;
  const metaParts = [
    person.job_title,
    person.personnel_no ? `табельный ${person.personnel_no}` : null,
    person.group_name,
  ].filter((v): v is string => Boolean(v));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium flex items-center gap-2">
            <span className="truncate">{displayName}</span>
            {!person.full_name && <Badge variant="training">псевдоним</Badge>}
          </h1>
          {metaParts.length > 0 && <p className="text-13 text-dusk mt-1">{metaParts.join(" · ")}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {person.written_consent_valid_until ? (
            <Badge icon="check" className="bg-success-bg text-success">
              Согласие на оценку: дано {formatDay(person.written_consent_valid_until)}
            </Badge>
          ) : (
            <Badge icon={null} className="bg-neutral-bg text-neutral">
              Согласие на оценку: не запрашивалось
            </Badge>
          )}
          <Button onClick={() => router.push(`/assignments?subject=${id}`)}>Назначить</Button>
          {isAdmin && (
            <Menu
              triggerTitle="Действия"
              items={[
                { key: "edit", label: "Изменить карточку", icon: "pencil", onClick: () => setEditOpen(true) },
                { key: "written", label: "Отметить письменное согласие", icon: "fileCheck", onClick: () => setWrittenOpen(true) },
                { key: "withdraw", label: "Отозвать согласие", icon: "alert", danger: true, onClick: () => setWithdrawOpen(true) },
              ]}
            />
          )}
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">Динамика</h2>
        {card.data && !card.data.results_visible ? (
          <EmptyState icon="lock" text="Нет доступа к результатам этой группы" />
        ) : progress.loading ? (
          <PageSpinner />
        ) : progress.error ? (
          <Notice variant="error" message={progress.error.problem.title} />
        ) : (progress.data?.lines.length ?? 0) === 0 ? (
          <EmptyState icon="trend" text="Попыток пока не было" />
        ) : (
          (progress.data?.lines ?? []).map((line, i) => {
            const letter = String.fromCharCode(65 + i);
            return (
              <div key={line.scenario_version_id + line.difficulty} className="flex flex-col gap-2">
                <div className="text-13 text-dusk">
                  <span className="font-medium text-night">{letter}.</span> {line.scenario_title} · {lineMeta(line)}
                </div>
                <ProgressChart line={line} letter={letter} />
                <div className="flex items-center gap-4 text-13 text-dusk">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-6 border-t-2 border-process" /> Процесс, из 100
                  </span>
                </div>
                {line.sample.small && (
                  <Notice variant="banner" message="Меньше трёх попыток — выводов о росте нет" />
                )}
                {(line.criteria_without_growth?.length ?? 0) > 0 && (
                  <Notice
                    variant="warning"
                    message={`Без роста: ${(line.criteria_without_growth ?? []).map((c) => CRITERION_LABEL[c]).join(", ")}`}
                  />
                )}
              </div>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">История попыток</h2>
        {progress.error ? (
          <Notice variant="error" message={progress.error.problem.title} />
        ) : (
          <DataTable
            columns={historyColumns}
            rows={historyRows}
            rowKey={(r) => r.sessionId}
            onRowClick={(r) => router.push(`/results/${r.sessionId}`)}
            emptyText="Попыток пока не было"
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">Тестирования</h2>
        <DataTable
          columns={assignmentColumns}
          rows={card.data?.assignments ?? []}
          rowKey={(a) => a.id}
          emptyText="Назначений пока нет"
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">Согласия</h2>
        <DataTable
          columns={consentColumns}
          rows={card.data?.consents ?? []}
          rowKey={(c) => c.id}
          emptyText="Согласия не запрашивались"
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">Кадровые решения</h2>
        {(card.data?.decisions.length ?? 0) === 0 ? (
          <p className="text-13 text-dusk">Кадровых решений пока нет</p>
        ) : (
          <div className="flex flex-col gap-3">
            {(card.data?.decisions ?? []).map((d: Decision) => (
              <div key={d.id} className="bg-surface rounded-card border border-line p-4 flex flex-col gap-2">
                <div className="text-13 text-dusk">
                  {formatDateTime(d.decided_at)} · {d.decided_by_name}
                </div>
                <div className="text-sm font-medium">{d.decision}</div>
                <div className="text-sm whitespace-pre-wrap">{d.grounds}</div>
                {d.session_ids.length > 0 && (
                  <div className="flex flex-wrap gap-3 text-13">
                    {d.session_ids.map((sid) => {
                      const startedAt = historyRows.find((r) => r.sessionId === sid)?.startedAt ?? null;
                      return (
                        <button
                          key={sid}
                          type="button"
                          className="text-accent hover:underline"
                          onClick={() => router.push(`/results/${sid}`)}
                        >
                          Сессия от {formatDateTime(startedAt)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {candidates.error && <Notice variant="error" message={candidates.error.problem.title} />}
        {(candidates.data?.some((c) => c.eligible) ?? false) && (
          <div className="bg-surface rounded-card border border-line p-4 flex flex-col gap-4">
            <h3 className="font-medium">Новое решение</h3>
            <DecisionForm subjectId={id} candidates={candidates.data ?? []} onSaved={reload} />
          </div>
        )}
      </section>

      {groups.data && (
        <PersonFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          groups={groups.data}
          person={person}
          onSaved={reload}
        />
      )}
      <WrittenConsentModal open={writtenOpen} onClose={() => setWrittenOpen(false)} person={person} onSaved={reload} />
      <WithdrawConsentModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} person={person} onSaved={reload} />
    </div>
  );
}
