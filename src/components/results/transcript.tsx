"use client";

import { useState } from "react";
import { getSessionRecord } from "@/lib/api/modules/sessions";
import { useApi } from "@/lib/api/hooks";
import type { SessionRecord, TurnRecord } from "@/lib/api/types";
import { cx } from "@/lib/utils";
import { Badge, Button, Icon, Notice, Skeleton } from "@/components/ui";
import { OPPONENT_VIOLATION_KIND_LABEL } from "./criteria";

function MarkerBadge({ kind, label }: { kind: string; label: string }) {
  if (kind === "violation") {
    return (
      <Badge variant="violation" className="h-5">
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="statusGray" icon={null} className="h-5">
      {label}
    </Badge>
  );
}

function TurnRow({
  turn,
  record,
  expanded,
  onToggleEngine,
}: {
  turn: TurnRecord;
  record: SessionRecord;
  expanded: boolean;
  onToggleEngine: () => void;
}) {
  const stageLabel = turn.stage ? (record.labels.stages[turn.stage] ?? turn.stage) : null;
  const violations = turn.violations ?? [];
  return (
    <div
      className={cx(
        "flex gap-3 px-4 py-3 border-b border-line last:border-b-0",
        violations.length > 0 && "border-l-[3px] border-l-violation bg-violation-bg"
      )}
    >
      <div className="w-14 shrink-0 pt-px text-13 text-dusk font-medium">
        {turn.speaker === "participant" ? `У${turn.reply_no}` : `О${turn.reply_no}`}
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
        <p className="text-sm whitespace-pre-wrap">{turn.text ?? "—"}</p>
        <div className="flex flex-wrap items-center gap-1">
          {stageLabel && (
            <Badge variant="statusGray" icon={null} className="h-5">
              {stageLabel}
            </Badge>
          )}
          {(turn.markers ?? []).map((m, i) => (
            <MarkerBadge key={`${m.kind}-${i}`} kind={m.kind} label={m.label} />
          ))}
          {violations.length > 0 && (
            <Badge variant="violation" className="h-5">
              {violations
                .map((v) => OPPONENT_VIOLATION_KIND_LABEL[v] ?? v)
                .join(", ")}
            </Badge>
          )}
          {(turn.revealed_facts ?? []).map((f) => (
            <Badge key={f} variant="statusGray" icon="info" className="h-5">
              Раскрыто: {record.labels.facts[f] ?? f}
            </Badge>
          ))}
        </div>
        {turn.speaker === "opponent" && turn.engine_step && (
          <div>
            <Button variant="text" size="xs" onClick={onToggleEngine}>
              <Icon name={expanded ? "chevD" : "chevR"} size={14} />
              Почему оппонент так ответил
            </Button>
            {expanded && (
              <pre className="mt-2 p-3 bg-bg rounded-field text-xs font-mono overflow-auto max-h-72">
                {JSON.stringify(turn.engine_step, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function RecordSection({ sessionId }: { sessionId: string }) {
  const { data, loading, error } = useApi(() => getSessionRecord(sessionId), [sessionId]);
  const [engineOpen, setEngineOpen] = useState<Set<number>>(new Set());

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton height={48} />
        <Skeleton height={48} />
        <Skeleton height={48} />
      </div>
    );
  }
  if (error) {
    return <Notice variant="error" title="Не удалось загрузить запись разговора" message={error.problem.title} />;
  }
  const record = data;
  if (!record) return null;

  const toggleEngine = (replyNo: number) => {
    setEngineOpen((prev) => {
      const next = new Set(prev);
      if (next.has(replyNo)) next.delete(replyNo);
      else next.add(replyNo);
      return next;
    });
  };

  const c = record.conditions;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface rounded-card border border-line">
        {record.turns.map((t) => (
          <TurnRow
            key={t.seq}
            turn={t}
            record={record}
            expanded={engineOpen.has(t.reply_no)}
            onToggleEngine={() => toggleEngine(t.reply_no)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-13">
          <div className="flex justify-between gap-3 border-b border-line py-1.5">
            <span className="text-dusk">Профиль тренажёра</span>
            <span className="text-right">
              {c.trainer_profile_name} · ревизия {c.profile_revision}
            </span>
          </div>
          <div className="flex justify-between gap-3 border-b border-line py-1.5">
            <span className="text-dusk">Версия движка</span>
            <span className="font-mono">{c.engine_version}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-line py-1.5">
            <span className="text-dusk">Внешняя нейросеть</span>
            <span>{c.external_ai_allowed ? "разрешена" : "запрещена"}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-line py-1.5">
            <span className="text-dusk">Попытки судьи</span>
            <span>{c.judge_attempts}</span>
          </div>
        </div>
        {record.incidents.length > 0 && (
          <Notice
            variant="warning"
            title="Инциденты во время сессии"
            message={
              <ul className="list-disc pl-4">
                {record.incidents.map((i) => (
                  <li key={i.event_id}>
                    {i.component}
                    {i.reply_no !== undefined ? ` · реплика ${i.reply_no}` : ""}
                    {i.detail ? `: ${i.detail}` : ""}
                  </li>
                ))}
              </ul>
            }
          />
        )}
        {record.audio_note && <Notice variant="banner" message={record.audio_note} />}
      </div>
    </div>
  );
}
