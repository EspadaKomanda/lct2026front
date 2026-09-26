"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { Difficulty, HealthSessionItem } from "@/lib/api/types";
import { getVersionHealth, listHealthSessions } from "@/lib/api/modules/scenarios";
import { getReducedSession } from "@/lib/api/modules/sessions";
import { useApi } from "@/lib/api/hooks";
import {
  DIFFICULTY_LABEL,
  SESSION_STATUS_LABEL,
} from "@/lib/labels";
import { formatDateTime, formatPercent } from "@/lib/utils";
import {
  Badge,
  Button,
  DataTable,
  Drawer,
  EmptyState,
  FinalRank,
  Icon,
  Notice,
  Pagination,
  Select,
  Skeleton,
  StatBar,
  type Column,
} from "@/components/ui";
import type { ScenarioTabProps } from "./scheme-tab";

const PAGE_SIZE = 20;

export interface HealthTabProps extends ScenarioTabProps {
  /** Номер версии, по которой считается здоровье (latest_version, если выбран черновик). */
  versionNumber: number;
}

interface SessionFilters {
  final_id: string;
  break_stage: string;
  with_violations: boolean;
  difficulty: string;
}

function Widget({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded-card p-5 flex flex-col gap-3 min-w-0">
      <h3 className="text-base font-medium">{title}</h3>
      {children}
    </section>
  );
}

function OkLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-success">
      <Icon name="checkCircle" size={16} className="shrink-0" />
      {children}
    </div>
  );
}

const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

export function HealthTab({ scenarioId, versionNumber }: HealthTabProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<SessionFilters>({
    final_id: "",
    break_stage: "",
    with_violations: false,
    difficulty: "",
  });
  const [offset, setOffset] = useState(0);
  const [reducedId, setReducedId] = useState<string | null>(null);

  const health = useApi(
    () => getVersionHealth(scenarioId, versionNumber),
    [scenarioId, versionNumber],
  );
  const sessions = useApi(
    () =>
      listHealthSessions(scenarioId, versionNumber, {
        final_id: filters.final_id || undefined,
        break_stage: filters.break_stage || undefined,
        with_violations: filters.with_violations || undefined,
        difficulty: (filters.difficulty || undefined) as Difficulty | undefined,
        limit: PAGE_SIZE,
        offset,
      }),
    [scenarioId, versionNumber, filters, offset],
  );
  const reduced = useApi(
    () => (reducedId ? getReducedSession(reducedId) : Promise.resolve(null)),
    [reducedId],
  );

  if (health.loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Skeleton height={160} />
        <Skeleton height={160} />
        <Skeleton height={160} />
        <Skeleton height={160} />
      </div>
    );
  }

  if (health.error) {
    return (
      <div className="flex flex-col gap-3">
        <Notice variant="error" message={health.error.problem.title} />
        <div>
          <Button variant="secondary" size="sm" onClick={health.reload}>
            Повторить
          </Button>
        </div>
      </div>
    );
  }

  const h = health.data;
  if (!h) return null;
  const labels = h.labels;
  const n = h.sample.n;

  const rankLine = (ranks: Partial<Record<string, number>>) =>
    Object.entries(ranks)
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ") || "—";

  const columns: Column<HealthSessionItem>[] = [
    {
      key: "started_at",
      title: "Дата",
      width: 150,
      render: (s) => formatDateTime(s.started_at),
    },
    {
      key: "difficulty",
      title: "Уровень",
      render: (s) => DIFFICULTY_LABEL[s.difficulty],
    },
    {
      key: "status",
      title: "Статус",
      render: (s) => <Badge variant="statusGray">{SESSION_STATUS_LABEL[s.status]}</Badge>,
    },
    {
      key: "final",
      title: "Финал",
      render: (s) => s.final_title ?? "—",
    },
    {
      key: "rank",
      title: "Буква",
      width: 60,
      render: (s) => (s.result_rank ? <FinalRank rank={s.result_rank} size="sm" /> : "—"),
    },
    {
      key: "violations",
      title: "Нарушения",
      align: "right",
      render: (s) => (s.opponent_violation_count ? s.opponent_violation_count : "—"),
    },
    {
      key: "access",
      title: "Доступ",
      render: (s) =>
        s.full_access ? (
          "Полный"
        ) : (
          <span className="inline-flex items-center gap-1.5 text-dusk">
            <Icon name="eyeOff" size={14} />
            Урезанный
          </span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {h.empty_note && <Notice variant="banner" message={h.empty_note} />}

      <div className="grid grid-cols-2 gap-4">
        <Widget title="Выборка">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm">
              Сессий: <span className="font-medium">{n}</span>
            </span>
            {h.sample.small && <Badge variant="smallData">Мало данных (n = {n})</Badge>}
            {h.running_now ? (
              <Badge variant="rehearsal">Сейчас идёт: {h.running_now}</Badge>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            {Object.entries(h.by_status)
              .filter(([, cnt]) => cnt > 0)
              .map(([status, cnt]) => (
                <div key={status} className="flex justify-between text-13">
                  <span className="text-dusk">
                    {SESSION_STATUS_LABEL[status as keyof typeof SESSION_STATUS_LABEL] ?? status}
                  </span>
                  <span className="font-medium">{cnt}</span>
                </div>
              ))}
          </div>
        </Widget>

        <Widget title="Финалы">
          {n === 0 ? (
            <span className="text-13 text-dusk">Нет сессий для распределения.</span>
          ) : (
            h.finals.map((f) => (
              <Link
                key={f.final_id}
                href={`/results?final_id=${encodeURIComponent(f.final_id)}`}
                className="block rounded-field hover:bg-bg transition-colors -mx-1 px-1"
                title="Открыть результаты с этим финалом"
              >
                <StatBar label={`${f.result_rank} · ${f.final_title}`} share={f.n / n} value={f.n} />
              </Link>
            ))
          )}
        </Widget>

        <Widget title="Недостижимые этапы">
          {h.stages_never_reached.length === 0 ? (
            <OkLine>Все этапы достижимы</OkLine>
          ) : (
            <ul className="flex flex-col gap-1 text-13">
              {h.stages_never_reached.map((s) => (
                <li key={s.stage_id} className="flex items-center gap-2 text-warning">
                  <Icon name="tri" size={14} className="shrink-0" />
                  {s.title}
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Ненайденные факты">
          {h.facts_never_found.length === 0 ? (
            <OkLine>Все скрытые факты находят участники</OkLine>
          ) : (
            <ul className="flex flex-col gap-1 text-13">
              {h.facts_never_found.map((f) => (
                <li key={f.fact_id} className="flex items-center gap-2 text-warning">
                  <Icon name="tri" size={14} className="shrink-0" />
                  {f.label}
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Средняя длина">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium">
              {h.avg_participant_turns !== null && h.avg_participant_turns !== undefined
                ? h.avg_participant_turns
                : "—"}
            </span>
            <span className="text-13 text-dusk">реплик участника на сессию</span>
          </div>
        </Widget>

        <Widget title="Обрывы">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium">{formatPercent(h.breaks.share)}%</span>
            <span className="text-13 text-dusk">сессий оборвалось</span>
          </div>
          {h.breaks.points.length > 0 && (
            <div className="flex flex-col gap-1">
              {h.breaks.points.map((p) => (
                <div key={p.stage} className="flex justify-between text-13">
                  <span className="text-dusk">{labels.stages[p.stage] ?? p.stage}</span>
                  <span className="font-medium">{p.n}</span>
                </div>
              ))}
            </div>
          )}
        </Widget>

        <Widget title="По уровням">
          {h.by_difficulty.length === 0 ? (
            <span className="text-13 text-dusk">Нет данных.</span>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="h-8 px-2 text-left text-13 font-medium text-dusk bg-frost">Уровень</th>
                  <th className="h-8 px-2 text-right text-13 font-medium text-dusk bg-frost w-12">n</th>
                  <th className="h-8 px-2 text-left text-13 font-medium text-dusk bg-frost">
                    Распределение букв
                  </th>
                </tr>
              </thead>
              <tbody>
                {h.by_difficulty.map((d) => (
                  <tr key={d.difficulty}>
                    <td className="h-9 px-2 border-b border-line text-13">
                      {DIFFICULTY_LABEL[d.difficulty]}
                    </td>
                    <td className="h-9 px-2 border-b border-line text-13 text-right font-medium">
                      {d.sample.n}
                    </td>
                    <td className="h-9 px-2 border-b border-line text-13">{rankLine(d.ranks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Widget>

        <Widget title="Нарушения оппонента">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium">
              {formatPercent(h.opponent_violations.sessions_share)}%
            </span>
            <span className="text-13 text-dusk">сессий с нарушениями</span>
          </div>
          {Object.keys(h.opponent_violations.by_kind).length > 0 && (
            <div className="flex flex-col gap-1">
              {Object.entries(h.opponent_violations.by_kind).map(([kind, cnt]) => (
                <div key={kind} className="flex justify-between text-13">
                  <span className="text-dusk">{kind}</span>
                  <span className="font-medium">{cnt}</span>
                </div>
              ))}
            </div>
          )}
        </Widget>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-base font-medium">Сессии версии</h3>
          <div className="flex items-center gap-2 ml-auto">
            <Select
              value={filters.final_id}
              onChange={(v) => {
                setFilters((f) => ({ ...f, final_id: v }));
                setOffset(0);
              }}
              options={h.finals.map((f) => ({ value: f.final_id, label: `${f.result_rank} · ${f.final_title}` }))}
              placeholder="Все финалы"
              className="w-56"
            />
            <Select
              value={filters.break_stage}
              onChange={(v) => {
                setFilters((f) => ({ ...f, break_stage: v }));
                setOffset(0);
              }}
              options={h.breaks.points.map((p) => ({
                value: p.stage,
                label: `Обрыв: ${labels.stages[p.stage] ?? p.stage}`,
              }))}
              placeholder="Обрыв на любом этапе"
              className="w-52"
            />
            <Select
              value={filters.difficulty}
              onChange={(v) => {
                setFilters((f) => ({ ...f, difficulty: v }));
                setOffset(0);
              }}
              options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
              placeholder="Все уровни"
              className="w-36"
            />
            <label className="inline-flex items-center gap-2 text-13 text-night">
              <input
                type="checkbox"
                className="size-4"
                checked={filters.with_violations}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, with_violations: e.target.checked }));
                  setOffset(0);
                }}
              />
              С нарушениями
            </label>
          </div>
        </div>

        {sessions.error ? (
          <div className="flex flex-col gap-3">
            <Notice variant="error" message={sessions.error.problem.title} />
            <div>
              <Button variant="secondary" size="sm" onClick={sessions.reload}>
                Повторить
              </Button>
            </div>
          </div>
        ) : sessions.loading ? (
          <Skeleton height={220} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={sessions.data?.items ?? []}
              rowKey={(s) => s.session_id}
              emptyText="Сессий с такими фильтрами нет"
              onRowClick={(s) => {
                if (s.full_access) router.push(`/results/${s.session_id}`);
                else setReducedId(s.session_id);
              }}
            />
            {sessions.data && sessions.data.page.total > PAGE_SIZE && (
              <Pagination
                offset={sessions.data.page.offset}
                limit={sessions.data.page.limit}
                total={sessions.data.page.total}
                onOffsetChange={setOffset}
              />
            )}
          </>
        )}
      </section>

      <Drawer
        open={reducedId !== null}
        onClose={() => setReducedId(null)}
        title="Урезанный вид сессии"
        width={720}
      >
        {reduced.error ? (
          <div className="flex flex-col gap-3">
            <Notice variant="error" message={reduced.error.problem.title} />
            <div>
              <Button variant="secondary" size="sm" onClick={reduced.reload}>
                Повторить
              </Button>
            </div>
          </div>
        ) : reduced.loading || !reduced.data ? (
          <Skeleton height={260} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap text-13 text-dusk">
              <span>
                Уровень: <span className="text-night">{DIFFICULTY_LABEL[reduced.data.difficulty]}</span>
              </span>
              <span>·</span>
              <span>
                Статус:{" "}
                <span className="text-night">{SESSION_STATUS_LABEL[reduced.data.status]}</span>
              </span>
              {reduced.data.final_title && (
                <>
                  <span>·</span>
                  <FinalRank
                    rank={reduced.data.result_rank ?? "—"}
                    size="sm"
                    title={reduced.data.final_title}
                  />
                </>
              )}
              {reduced.data.break_stage && (
                <>
                  <span>·</span>
                  <span>
                    Обрыв:{" "}
                    <span className="text-night">
                      {reduced.data.labels.stages[reduced.data.break_stage] ??
                        reduced.data.break_stage}
                    </span>
                  </span>
                </>
              )}
            </div>
            {reduced.data.turns.length === 0 ? (
              <EmptyState icon="inbox" text="Реплик в этой сессии нет." />
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="h-8 px-2 text-left text-13 font-medium text-dusk bg-frost w-16">№</th>
                    <th className="h-8 px-2 text-left text-13 font-medium text-dusk bg-frost w-14">Кто</th>
                    <th className="h-8 px-2 text-left text-13 font-medium text-dusk bg-frost">Этап</th>
                    <th className="h-8 px-2 text-left text-13 font-medium text-dusk bg-frost">Тип хода</th>
                    <th className="h-8 px-2 text-left text-13 font-medium text-dusk bg-frost">Факты</th>
                    <th className="h-8 px-2 text-left text-13 font-medium text-dusk bg-frost">Нарушения</th>
                  </tr>
                </thead>
                <tbody>
                  {reduced.data.turns.map((t) => (
                    <tr key={t.reply_no}>
                      <td className="h-9 px-2 border-b border-line text-13 font-medium">
                        {t.reply_no}
                      </td>
                      <td className="h-9 px-2 border-b border-line text-13 text-dusk">
                        {t.speaker === "participant" ? "У" : "О"}
                      </td>
                      <td className="h-9 px-2 border-b border-line text-13">
                        {reduced.data.labels.stages[t.stage] ?? t.stage}
                      </td>
                      <td className="h-9 px-2 border-b border-line text-13 text-dusk">
                        {t.move_type ?? "—"}
                      </td>
                      <td className="h-9 px-2 border-b border-line text-13 text-dusk">
                        {t.revealed_facts.map((f) => reduced.data.labels.facts[f] ?? f).join(", ") ||
                          "—"}
                      </td>
                      <td className="h-9 px-2 border-b border-line text-13">
                        {t.opponent_violation_kinds.length > 0 ? (
                          <Badge variant="violation">{t.opponent_violation_kinds.join(", ")}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

export { cx as _cx };
