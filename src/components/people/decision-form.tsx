"use client";

import { useState } from "react";
import type { DecisionCandidate } from "@/lib/api/types";
import { createDecision } from "@/lib/api/modules/decisions";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import { Button, Checkbox, FinalRank, Input, Notice, Textarea, useToast } from "@/components/ui";

interface DecisionFormProps {
  subjectId: string;
  candidates: DecisionCandidate[];
  onSaved: () => void;
}

function SessionBasis({ c }: { c: DecisionCandidate }) {
  const h = c.session.header;
  const sc = c.session.score_columns;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
      <span className="text-sm">{formatDateTime(h.started_at)}</span>
      {sc.result_rank && <FinalRank rank={sc.result_rank} size="sm" />}
      <span className="text-13 text-dusk">процесс {sc.process_number ?? "—"}</span>
      <span className="text-13 text-dusk truncate">{h.scenario_title}</span>
    </span>
  );
}

export function DecisionForm({ subjectId, candidates, onSaved }: DecisionFormProps) {
  const toast = useToast();
  const [decision, setDecision] = useState("");
  const [grounds, setGrounds] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [groundsError, setGroundsError] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [ineligibleError, setIneligibleError] = useState<ApiError | null>(null);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const eligible = candidates.filter((c) => c.eligible);
  const ineligible = candidates.filter((c) => !c.eligible);

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const submit = async () => {
    const dErr = decision.trim() ? null : "Напишите текст решения";
    const gErr = grounds.trim() ? null : "Напишите основания своими словами — без них решение не сохраняется";
    const sErr = selected.size > 0 ? null : "Выберите хотя бы одну сессию-основание";
    setDecisionError(dErr);
    setGroundsError(gErr);
    setSessionsError(sErr);
    setIneligibleError(null);
    setSubmitError(null);
    if (dErr || gErr || sErr) return;
    try {
      setSubmitting(true);
      await createDecision({
        subject_id: subjectId,
        decision: decision.trim(),
        grounds: grounds.trim(),
        session_ids: [...selected],
      });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError({ type: "unexpected", title: "Неожиданная ошибка", status: 0 });
      if (err.problem.type === "decision_ineligible") setIneligibleError(err);
      else setSubmitError(err);
      return;
    } finally {
      setSubmitting(false);
    }
    toast.show("Решение сохранено");
    setDecision("");
    setGrounds("");
    setSelected(new Set());
    onSaved();
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Решение"
        value={decision}
        onChange={(e) => setDecision(e.target.value)}
        placeholder="Например: рекомендовать повторную оценку через месяц"
        error={decisionError ?? undefined}
      />
      <Textarea
        label="Ваши основания"
        value={grounds}
        onChange={(e) => setGrounds(e.target.value)}
        placeholder="Собственные основания — не копируйте автоматическое резюме"
        error={groundsError ?? undefined}
      />
      <div className="flex flex-col gap-2">
        <span className="text-13 font-medium">Сессии-основания</span>
        {eligible.map((c) => (
          <label key={c.session.session_id} className="flex items-start gap-2 rounded-field border border-line p-3 cursor-pointer hover:bg-bg">
            <Checkbox
              checked={selected.has(c.session.session_id)}
              onChange={(checked) => toggle(c.session.session_id, checked)}
              label={null}
              aria-label="Выбрать сессию"
              className="mt-0.5"
            />
            <SessionBasis c={c} />
          </label>
        ))}
        {ineligible.map((c) => (
          <div key={c.session.session_id} className="flex items-start gap-2 rounded-field border border-line p-3 opacity-70">
            <Checkbox checked={false} onChange={() => {}} label={null} disabled aria-label="Сессия непригодна" className="mt-0.5" />
            <span className="min-w-0">
              <SessionBasis c={c} />
              <ul className="mt-1 list-disc pl-4 text-xs text-danger">
                {c.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </span>
          </div>
        ))}
        {sessionsError && <Notice variant="error" message={sessionsError} />}
      </div>
      {ineligibleError && (
        <Notice variant="error" title={ineligibleError.problem.title}>
          <ul className="mt-1 list-disc pl-4">
            {(ineligibleError.problem.errors ?? []).map((e) => (
              <li key={e.path}>{e.message}</li>
            ))}
          </ul>
        </Notice>
      )}
      {submitError && <Notice variant="error" message={submitError.problem.title} />}
      <div>
        <Button onClick={submit} loading={submitting}>Сохранить решение</Button>
      </div>
    </div>
  );
}
