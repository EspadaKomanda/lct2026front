"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useApi } from "@/lib/api/hooks";
import { getSession, reviewSession } from "@/lib/api/modules/sessions";
import type { Criterion, SessionResult } from "@/lib/api/types";
import {
  CRITERION_LABEL,
  DIFFICULTY_LABEL,
  MODE_LABEL,
  PROCESS_STATUS_LABEL,
  SESSION_STATUS_LABEL,
} from "@/lib/labels";
import { formatDateTime, formatDuration } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  FinalRank,
  Icon,
  Notice,
  PageSpinner,
  RankDots,
  useToast,
} from "@/components/ui";
import { CRITERIA, CRITERION_HINT, OPPONENT_VIOLATION_KIND_LABEL } from "@/components/results/criteria";
import { DecisionSection } from "@/components/results/decision-section";
import { ReducedSessionView } from "@/components/results/reduced-view";
import { RecordSection } from "@/components/results/transcript";

const LIMITING_MARK_KINDS = new Set(["too_short", "process_not_received", "judge_attempts"]);

function ResultCard({ data }: { data: SessionResult }) {
  const sc = data.score_columns;
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent" />
        <h2 className="text-base font-medium">Результат</h2>
      </div>
      <div className="flex items-center gap-4 min-w-0">
        {sc.result_rank ? (
          <FinalRank rank={sc.result_rank} size="lg" />
        ) : (
          <span className="w-16 h-16 rounded-card border border-line flex items-center justify-center text-dusk">
            —
          </span>
        )}
        <div className="min-w-0">
          <div className="text-xl truncate" title={sc.final_title ?? ""}>
            {sc.final_title ?? "Результат не рассчитан"}
          </div>
          {data.epilogue && <p className="text-13 text-dusk mt-1">{data.epilogue}</p>}
        </div>
      </div>
      {sc.result_number !== null && sc.result_max !== null && (
        <div className="text-[32px] font-medium leading-none">
          {sc.result_number}{" "}
          <span className="text-base text-dusk font-normal">из {sc.result_max}</span>
        </div>
      )}
    </Card>
  );
}

function ProcessCard({ data }: { data: SessionResult }) {
  const sc = data.score_columns;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const limiting = data.marks.filter((m) => LIMITING_MARK_KINDS.has(m.kind));
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-process" />
        <h2 className="text-base font-medium">Процесс</h2>
      </div>
      {sc.process_number !== null ? (
        <div className="text-[32px] font-medium leading-none">
          {sc.process_number} <span className="text-base text-dusk font-normal">из 100</span>
        </div>
      ) : (
        <div className="text-[32px] text-dusk leading-none">—</div>
      )}
      <div className="text-13 text-dusk">{PROCESS_STATUS_LABEL[sc.process_status]}</div>
      <div className="flex flex-col gap-1.5">
        {CRITERIA.map((c: Criterion) => (
          <div key={c} className="flex items-center justify-between gap-3">
            <span className="text-13">{CRITERION_LABEL[c]}</span>
            <RankDots value={sc.criteria_bands?.[c] ?? 0} />
          </div>
        ))}
      </div>
      {limiting.length > 0 && (
        <div className="bg-bg rounded-field p-3 flex flex-col gap-1">
          <span className="text-xs text-dusk font-medium">Что ограничило оценку</span>
          {limiting.map((m, i) => (
            <span key={`${m.kind}-${i}`} className="text-13">
              {m.text}
            </span>
          ))}
        </div>
      )}
      <div>
        <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
          Подробнее
        </Button>
      </div>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Критерии «Процесса»"
        width={480}
      >
        <div className="flex flex-col gap-4">
          {CRITERIA.map((c: Criterion) => (
            <div key={c} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{CRITERION_LABEL[c]}</span>
                <RankDots value={sc.criteria_bands?.[c] ?? 0} />
              </div>
              <p className="text-13 text-dusk">{CRITERION_HINT[c]}</p>
            </div>
          ))}
        </div>
      </Drawer>
    </Card>
  );
}

function SummarySection({ data }: { data: SessionResult }) {
  const strengths = data.summary.filter((s) => s.kind === "strength");
  const misses = data.summary.filter((s) => s.kind === "miss");
  const renderItem = (item: (typeof data.summary)[number], icon: React.ReactNode) => (
    <div key={`${item.kind}-${item.reply}-${item.observation.slice(0, 24)}`} className="flex gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex flex-col gap-1.5">
        <p className="text-sm">{item.observation}</p>
        {item.quote && (
          <blockquote className="bg-bg p-3 rounded-field border-l-2 border-contour italic text-13">
            {item.quote}
          </blockquote>
        )}
        {item.instead && <p className="text-13 text-dusk">Можно было: {item.instead}</p>}
      </div>
    </div>
  );
  const successIcon = <Icon name="checkCircle" size={16} className="text-success" />;
  const warningIcon = <Icon name="tri" size={16} className="text-warning" />;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-medium">Разбор</h2>
      <div className="grid grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium flex items-center gap-1.5">
            {successIcon}
            Что получилось
          </h3>
          {strengths.length === 0 ? (
            <p className="text-13 text-dusk">Наблюдений нет</p>
          ) : (
            strengths.map((s) => renderItem(s, successIcon))
          )}
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium flex items-center gap-1.5">
            {warningIcon}
            Что улучшить
          </h3>
          {misses.length === 0 ? (
            <p className="text-13 text-dusk">Наблюдений нет</p>
          ) : (
            misses.map((s) => renderItem(s, warningIcon))
          )}
        </div>
      </div>
    </section>
  );
}

function OpponentViolationsCard({
  data,
  onReviewed,
}: {
  data: SessionResult;
  onReviewed: (updated: SessionResult) => void;
}) {
  const toast = useToast();
  const review = useMutation(reviewSession);
  const [conflict, setConflict] = useState(false);

  const reviewed = data.flags.reviewed || data.review !== null;

  const markReviewed = async () => {
    setConflict(false);
    const result = await review.run(data.header.session_id);
    if (!result) {
      if (review.error?.problem.type === "not_reviewable") setConflict(true);
      else toast.show(review.error?.problem.title ?? "Не удалось отметить сессию");
      return;
    }
    toast.show("Сессия отмечена как просмотренная");
    onReviewed({
      ...data,
      review: result,
      flags: { ...data.flags, reviewed: true },
      review_needed: false,
    });
  };

  return (
    <Card className="p-4 border-l-[3px] border-l-violation flex flex-col gap-3">
      <h3 className="text-sm font-medium">Оппонент нарушил правила</h3>
      <div className="flex flex-col gap-2">
        {data.opponent_violations.map((v, i) => (
          <div key={`${v.reply_no}-${i}`} className="flex flex-col gap-0.5">
            <span className="text-13 font-medium">
              О{v.reply_no} ·{" "}
              {v.kinds.map((k) => OPPONENT_VIOLATION_KIND_LABEL[k] ?? k).join(", ")}
            </span>
            <span className="text-13 text-dusk">{v.comment}</span>
          </div>
        ))}
      </div>
      {conflict && <Notice variant="warning" message="Сессия ещё идёт — отметить нельзя" />}
      {review.error && !conflict && <Notice variant="error" title={review.error.problem.title} />}
      {reviewed ? (
        <div className="flex items-center gap-2">
          <Badge variant="reviewed">Просмотрена</Badge>
          {data.review && (
            <span className="text-xs text-dusk">
              {data.review.reviewed_by_name} · {formatDateTime(data.review.reviewed_at)}
            </span>
          )}
        </div>
      ) : (
        <div>
          <Button variant="secondary" size="sm" loading={review.loading} onClick={() => void markReviewed()}>
            Просмотрено, сессия годится
          </Button>
        </div>
      )}
    </Card>
  );
}

function SessionDetail({ sessionId }: { sessionId: string }) {
  const { data, loading, error, setData } = useApi(() => getSession(sessionId), [sessionId]);

  if (loading) return <PageSpinner />;
  if (error) {
    if (error.problem.type === "forbidden_group") {
      return <ReducedSessionView sessionId={sessionId} />;
    }
    if (error.status === 404) {
      return <EmptyState icon="search" text="Сессия не найдена" />;
    }
    return <Notice variant="error" title={error.problem.title} />;
  }
  if (!data) return null;

  const h = data.header;
  const update = (next: SessionResult) => setData(next);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-medium mr-auto min-w-0">
            {data.person.display_name ?? data.person.number} · {h.scenario_title} · версия{" "}
            {h.version_number} · {DIFFICULTY_LABEL[h.difficulty]}
          </h1>
          <Badge variant={h.mode === "assessment" ? "assessment" : "training"}>
            {MODE_LABEL[h.mode]}
          </Badge>
          <Badge variant="statusGray">{SESSION_STATUS_LABEL[h.status]}</Badge>
          {h.is_demo && <Badge variant="demo">Демо</Badge>}
        </div>
        <p className="text-13 text-dusk">
          {formatDateTime(h.started_at)} · {formatDuration(h.duration_ms)} ·{" "}
          {h.participant_turns} реплик
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {data.flags.lucky && <Badge variant="lucky">Повезло</Badge>}
        {h.mode === "training" && (
          <Badge variant="noDecision">Тренировка — не основание для кадрового решения</Badge>
        )}
        {data.marks.map((m, i) => (
          <Notice key={`${m.kind}-${i}`} variant="banner" message={m.text} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        <ResultCard data={data} />
        <ProcessCard data={data} />
      </div>

      <SummarySection data={data} />

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Разговор</h2>
        <RecordSection sessionId={sessionId} />
      </section>

      {data.objections.length > 0 && (
        <Card bordered className="p-4 flex flex-col gap-2">
          <h3 className="text-sm font-medium flex items-center gap-1.5">
            <Icon name="msg" size={16} />
            Сотрудник оспорил результат
          </h3>
          {data.objections.map((o) => (
            <div key={o.id} className="flex flex-col gap-0.5">
              <span className="text-xs text-dusk">{formatDateTime(o.submitted_at)}</span>
              <p className="text-sm">{o.text}</p>
            </div>
          ))}
        </Card>
      )}

      {data.opponent_violations.length > 0 && (
        <OpponentViolationsCard data={data} onReviewed={update} />
      )}

      {h.mode === "assessment" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-medium">Решение HR</h2>
          <DecisionSection sessionId={sessionId} data={data} onChanged={update} />
        </section>
      )}
    </div>
  );
}

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <SessionDetail sessionId={sessionId} />;
}
