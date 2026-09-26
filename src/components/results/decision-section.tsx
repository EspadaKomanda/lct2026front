"use client";

import { useState } from "react";
import { useMutation } from "@/lib/api/hooks";
import { createDecision } from "@/lib/api/modules/decisions";
import type { SessionResult } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils";
import { Button, Input, Notice, Textarea, useToast } from "@/components/ui";

export function DecisionSection({
  sessionId,
  data,
  onChanged,
}: {
  sessionId: string;
  data: SessionResult;
  onChanged: (updated: SessionResult) => void;
}) {
  const toast = useToast();
  const [decision, setDecision] = useState("");
  const [grounds, setGrounds] = useState("");
  const [decisionError, setDecisionError] = useState<string | undefined>();
  const [groundsError, setGroundsError] = useState<string | undefined>();

  const save = useMutation(createDecision);

  const blocked = data.review_needed && data.opponent_violations.length > 0;

  const submit = async () => {
    const d = decision.trim();
    const g = grounds.trim();
    setDecisionError(d ? undefined : "Укажите решение");
    setGroundsError(g ? undefined : "Укажите основания");
    if (!d || !g) return;
    const created = await save.run({
      subject_id: data.person.subject_id,
      decision: d,
      grounds: g,
      session_ids: [sessionId],
    });
    if (!created) {
      toast.show(save.error?.problem.title ?? "Не удалось сохранить решение");
      return;
    }
    toast.show("Решение сохранено");
    setDecision("");
    setGrounds("");
    onChanged({
      ...data,
      decisions: [
        ...data.decisions,
        {
          id: created.id,
          decision: created.decision,
          decided_at: created.decided_at,
          decided_by_name: created.decided_by_name,
        },
      ],
    });
  };

  if (data.decisions.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        {data.decisions.map((d) => (
          <div key={d.id} className="bg-surface rounded-card border border-line p-4 flex flex-col gap-1">
            <div className="text-13 text-dusk">
              {formatDateTime(d.decided_at)} · {d.decided_by_name}
            </div>
            <div className="text-sm font-medium">{d.decision}</div>
            <div className="text-sm">{d.grounds}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {blocked && (
        <Notice
          variant="warning"
          message="Сначала проверьте нарушение оппонента — без этого решение по сессии фиксировать нельзя."
        />
      )}
      {save.error && <Notice variant="error" title={save.error.problem.title} />}
      <Input
        label="Решение"
        placeholder="Например: повысить, назначить испытательный срок"
        value={decision}
        disabled={blocked}
        onChange={(e) => setDecision(e.target.value)}
        error={decisionError}
      />
      <Textarea
        label="Основания"
        placeholder="На каких результатах основано решение"
        value={grounds}
        disabled={blocked}
        onChange={(e) => setGrounds(e.target.value)}
        error={groundsError}
      />
      <div>
        <Button onClick={() => void submit()} loading={save.loading} disabled={blocked}>
          Сохранить решение
        </Button>
      </div>
    </div>
  );
}
