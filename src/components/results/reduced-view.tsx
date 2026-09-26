"use client";

import { getReducedSession } from "@/lib/api/modules/sessions";
import { useApi } from "@/lib/api/hooks";
import { DIFFICULTY_LABEL, SESSION_STATUS_LABEL } from "@/lib/labels";
import { Badge, EmptyState, FinalRank, Notice, PageSpinner } from "@/components/ui";
import { OPPONENT_VIOLATION_KIND_LABEL } from "./criteria";

export function ReducedSessionView({ sessionId }: { sessionId: string }) {
  const { data, loading, error } = useApi(() => getReducedSession(sessionId), [sessionId]);

  if (loading) return <PageSpinner />;
  if (error) {
    if (error.status === 404) {
      return <EmptyState icon="lock" text="Сессия не найдена или недоступна в демо-режиме." />;
    }
    return <Notice variant="error" title={error.problem.title} />;
  }
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-medium mr-auto">Сессия {data.session_id.slice(0, 8)}…</h1>
        <Badge variant="statusGray">{SESSION_STATUS_LABEL[data.status]}</Badge>
        <Badge variant="statusGray">{DIFFICULTY_LABEL[data.difficulty]}</Badge>
        {data.result_rank && <FinalRank rank={data.result_rank} size="sm" title={data.final_title} />}
      </div>
      <Notice
        variant="banner"
        message="Урезанный вид: без текста реплик и имени. Полный доступ выдаёт администратор."
      />
      <div className="bg-surface rounded-card border border-line overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["№", "Спикер", "Этап", "Тип хода", "Переход", "Раскрытые факты", "Нарушения"].map((h) => (
                <th key={h} className="h-10 px-3 bg-frost text-13 font-medium border-b border-line text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.turns.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-11 px-3 border-b border-line text-13 text-dusk text-center">
                  Реплик нет
                </td>
              </tr>
            ) : (
              data.turns.map((t) => (
                <tr key={t.reply_no} className="hover:bg-bg">
                  <td className="h-10 px-3 border-b border-line text-13">{t.reply_no}</td>
                  <td className="h-10 px-3 border-b border-line text-13 font-medium">
                    {t.speaker === "participant" ? "Участник" : "Оппонент"}
                  </td>
                  <td className="h-10 px-3 border-b border-line text-13">
                    {data.labels.stages[t.stage] ?? t.stage}
                  </td>
                  <td className="h-10 px-3 border-b border-line text-13">
                    {t.move_type ? (data.labels.moves[t.move_type] ?? t.move_type) : "—"}
                  </td>
                  <td className="h-10 px-3 border-b border-line text-13">
                    {t.transition_to ? (data.labels.stages[t.transition_to] ?? t.transition_to) : "—"}
                  </td>
                  <td className="h-10 px-3 border-b border-line text-13">
                    {t.revealed_facts.length > 0
                      ? t.revealed_facts.map((f) => data.labels.facts[f] ?? f).join(", ")
                      : "—"}
                  </td>
                  <td className="h-10 px-3 border-b border-line text-13">
                    {t.opponent_violation_kinds.length > 0
                      ? t.opponent_violation_kinds
                          .map((k) => OPPONENT_VIOLATION_KIND_LABEL[k] ?? k)
                          .join(", ")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-dusk">В урезанном виде доступны только метаданные реплик.</p>
    </div>
  );
}
