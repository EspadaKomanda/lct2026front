"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/api/hooks";
import { getRehearsal } from "@/lib/api/modules/rehearsals";
import { getScenario } from "@/lib/api/modules/scenarios";
import type { Rehearsal, TurnEvent } from "@/lib/api/types";
import { DIFFICULTY_LABEL, REHEARSAL_STATUS_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FinalRank,
  Icon,
  Notice,
  PageSpinner,
} from "@/components/ui";

export default function RehearsalRecordPage({
  params,
}: {
  params: Promise<{ id: string; rehearsalId: string }>;
}) {
  const { id: scenarioId, rehearsalId } = use(params);
  const router = useRouter();

  const rehearsalApi = useApi(() => getRehearsal(rehearsalId), [rehearsalId]);
  const scenarioApi = useApi(() => getScenario(scenarioId), [scenarioId]);

  const rehearsal = rehearsalApi.data;
  const scenario = scenarioApi.data;

  const [openWhy, setOpenWhy] = useState<Record<number, boolean>>({});
  const [showNumbers, setShowNumbers] = useState<Record<number, boolean>>({});

  const toggleWhy = (seq: number) => {
    setOpenWhy((prev) => ({ ...prev, [seq]: !prev[seq] }));
  };

  const toggleNumbers = (seq: number) => {
    setShowNumbers((prev) => ({ ...prev, [seq]: !prev[seq] }));
  };

  if (rehearsalApi.loading || scenarioApi.loading) return <PageSpinner />;
  if (rehearsalApi.error) {
    return (
      <div className="p-6">
        <Notice variant="error" message={rehearsalApi.error.problem.title} />
      </div>
    );
  }
  if (!rehearsal) return null;

  const turns = rehearsal.record?.turns ?? [];
  const rank = rehearsal.result_rank;

  return (
    <div className="max-w-[920px] flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/scenarios/${scenarioId}?tab=rehearsals`}
            className="text-13 text-dusk hover:text-night hover:underline inline-flex items-center gap-1"
          >
            ← К списку репетиций
          </Link>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold leading-tight">Репетиция</h1>
              <span className="text-sm text-dusk">
                {scenario?.title ?? "Сценарий"} · {DIFFICULTY_LABEL[rehearsal.difficulty]} ·{" "}
                {formatDateTime(rehearsal.uploaded_at ?? rehearsal.issued_at)}
              </span>
              <Badge variant="rehearsal">
                {REHEARSAL_STATUS_LABEL[rehearsal.status]}
              </Badge>
            </div>
            {rehearsal.run_by_name && (
              <span className="text-xs text-dusk">
                Провёл: {rehearsal.run_by_name}
              </span>
            )}
          </div>

          <Button
            variant="secondary"
            onClick={() => router.push(`/scenarios/${scenarioId}?tab=rehearsals`)}
          >
            Репетировать ещё раз
          </Button>
        </div>

        {rank && (
          <div className="flex items-center gap-3 p-4 bg-frost rounded-card border border-line">
            <span className="text-sm text-dusk">Итог:</span>
            <div className="inline-flex items-center gap-2.5">
              <FinalRank rank={rank} size="md" />
              <span className="font-medium text-base text-night">
                {rehearsal.final_id ?? "Финал зафиксирован"}
              </span>
            </div>
          </div>
        )}
      </div>

      <Card bordered className="p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-night">Диалог репетиции</h2>
          <span className="text-xs text-dusk">
            {turns.length} {turns.length === 1 ? "реплика" : "реплик"}
          </span>
        </div>

        {turns.length === 0 ? (
          <EmptyState
            icon="play"
            text="Запись разговора пуста или ещё не загружена из тренажёра"
          />
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {turns.map((t) => {
              const isOpponent = t.speaker === "opponent";
              const prefix = isOpponent ? `О${t.reply_no}` : `У${t.reply_no}`;
              const whyOpen = Boolean(openWhy[t.seq]);
              const numOpen = Boolean(showNumbers[t.seq]);
              const step = t.engine_step as Record<string, unknown> | undefined;

              return (
                <div key={t.seq} className="py-4 flex gap-4 items-start">
                  <span
                    className={`w-10 shrink-0 text-13 font-semibold pt-0.5 ${
                      isOpponent ? "text-accent" : "text-dusk"
                    }`}
                  >
                    {prefix}
                  </span>

                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <p className="text-sm text-night leading-relaxed whitespace-pre-wrap">
                      {t.text}
                    </p>

                    {isOpponent && (
                      <div className="mt-1 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => toggleWhy(t.seq)}
                          className="inline-flex items-center gap-1.5 text-13 text-accent hover:underline w-max font-medium"
                        >
                          <Icon
                            name={whyOpen ? "chevD" : "chevR"}
                            size={14}
                            className="shrink-0"
                          />
                          Почему оппонент так ответил
                        </button>

                        {whyOpen && (
                          <div className="p-4 bg-frost rounded-card border border-line flex flex-col gap-3 text-13 text-night">
                            {step ? (
                              <div className="flex flex-col gap-2">
                                {Boolean(step.checks) && (
                                  <div className="flex gap-2">
                                    <span className="text-dusk font-medium w-4 shrink-0">1</span>
                                    <span>
                                      <strong>Проверки:</strong> {String(step.checks)}
                                    </span>
                                  </div>
                                )}
                                {Boolean(step.evidence_eval) && (
                                  <div className="flex gap-2">
                                    <span className="text-dusk font-medium w-4 shrink-0">2</span>
                                    <span>
                                      <strong>Сила довода:</strong> {String(step.evidence_eval)}
                                    </span>
                                  </div>
                                )}
                                {Boolean(step.concession_rule) && (
                                  <div className="flex gap-2">
                                    <span className="text-dusk font-medium w-4 shrink-0">3</span>
                                    <span>
                                      <strong>Правило уступки:</strong> {String(step.concession_rule)}
                                    </span>
                                  </div>
                                )}
                                {Boolean(step.concession_step) && (
                                  <div className="flex gap-2">
                                    <span className="text-dusk font-medium w-4 shrink-0">4</span>
                                    <span>
                                      <strong>Шаг уступки:</strong> {String(step.concession_step)}
                                    </span>
                                  </div>
                                )}
                                {Boolean(step.directive) && (
                                  <div className="flex gap-2">
                                    <span className="text-dusk font-medium w-4 shrink-0">5</span>
                                    <span>
                                      <strong>Указание оппоненту:</strong> {String(step.directive)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <div>
                                  <strong>Этап:</strong> {t.stage}
                                  {t.transition_to && ` → переход на «${t.transition_to}»`}
                                </div>
                                {t.move_type && (
                                  <div>
                                    <strong>Тип хода:</strong> {t.move_type}
                                  </div>
                                )}
                                {t.opponent_violation && (
                                  <div className="text-danger font-medium">
                                    Судья оппонента зафиксировал нарушение роли или уступок
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="pt-2 border-t border-line/60 flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => toggleNumbers(t.seq)}
                                className="text-xs text-accent hover:underline w-max"
                              >
                                {numOpen ? "Скрыть шкалы" : "Показать шкалы"}
                              </button>

                              {numOpen && (
                                <div className="text-xs text-dusk flex items-center gap-3 flex-wrap bg-surface p-2.5 rounded border border-line">
                                  <span>Доверие: <strong>{t.trust ?? "—"}</strong></span>
                                  <span>Достоверность: <strong>{t.credibility ?? "—"}</strong></span>
                                  <span>Давление: <strong>{t.pressure ?? "—"}</strong></span>
                                  <span>Терпение: <strong>{t.patience ?? "—"}</strong></span>
                                  {t.credit !== undefined && (
                                    <span>Очки доводов: <strong>{t.credit}</strong></span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
