"use client";

import { useMemo, useState } from "react";
import type { CheckResult, ScenarioDocument } from "@/lib/api/types";
import { cx } from "@/lib/utils";
import { Icon } from "@/components/icons";
import { EmptyState, Notice } from "@/components/ui";
import {
  finalStageIdByPathIndex,
  parseStages,
  prettyJson,
  stageIdByPathIndex,
  type SchemeStage,
} from "./document";

export interface ScenarioTabProps {
  scenarioId: string;
  document: ScenarioDocument;
  check: CheckResult | null;
}

type Severity = "danger" | "warning";

interface FlowMessage {
  severity: Severity;
  message: string;
  path: string;
}

/** Диагностики по этапам и переходам: rule flow или пути /stages, /finals. */
function flowMessages(document: ScenarioDocument, check: CheckResult | null): FlowMessage[] {
  if (!check) return [];
  return check.messages
    .filter(
      (m) =>
        m.rule === "flow" ||
        m.path.startsWith("/stages") ||
        m.path.startsWith("/finals") ||
        m.path === "/flow",
    )
    .map((m) => ({
      severity: m.severity === "blocking" ? ("danger" as const) : ("warning" as const),
      message: m.message,
      path: m.path,
    }));
}

function stageSeverityMap(
  document: ScenarioDocument,
  messages: FlowMessage[],
): Map<string, Severity> {
  const map = new Map<string, Severity>();
  for (const m of messages) {
    const ids = [
      ...new Set(
        [stageIdByPathIndex(document, m.path), finalStageIdByPathIndex(document, m.path)].filter(
          (v): v is string => v !== null,
        ),
      ),
    ];
    for (const id of ids) {
      if (map.get(id) !== "danger") map.set(id, m.severity);
    }
  }
  return map;
}

function StageBlock({ stage, severity }: { stage: SchemeStage; severity: Severity | undefined }) {
  return (
    <span
      title={severity === "danger" ? "Есть ошибки в проверке" : undefined}
      className={cx(
        "h-8 px-3 inline-flex items-center rounded-field border text-13 whitespace-nowrap shrink-0",
        stage.exit
          ? "bg-frost border-line"
          : stage.row === "main"
            ? "bg-surface border-contour"
            : "bg-bg border-dashed border-gray",
        severity === "danger" && "bg-danger-bg border-danger text-danger",
        severity === "warning" && !stage.exit && "bg-warning-bg border-warning text-warning",
      )}
    >
      {stage.title}
    </span>
  );
}

function StageRow({ stages, severity }: { stages: SchemeStage[]; severity: Map<string, Severity> }) {
  if (stages.length === 0) return null;
  return (
    <div className="flex items-center gap-2 min-w-max">
      {stages.map((s, i) => (
        <span key={s.id} className="flex items-center gap-2">
          {i > 0 && <span className="text-gray">→</span>}
          <StageBlock stage={s} severity={severity.get(s.id)} />
        </span>
      ))}
    </div>
  );
}

function StageAccordion({
  stage,
  severity,
  titles,
}: {
  stage: SchemeStage;
  severity: Severity | undefined;
  titles: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 h-11 px-4 hover:bg-bg transition-colors text-left"
      >
        <Icon
          name="chevR"
          size={14}
          className={cx("shrink-0 text-dusk transition-transform duration-150", open && "rotate-90")}
        />
        <span
          className={cx(
            "font-medium text-sm whitespace-nowrap",
            severity === "danger" && "text-danger",
            severity === "warning" && "text-warning",
          )}
        >
          {stage.title}
        </span>
        {stage.exit && (
          <span className="text-13 text-gray shrink-0">выход</span>
        )}
        <span className="ml-auto text-13 text-dusk truncate">
          {stage.instruction ? "указание · " : ""}переходов: {stage.transitions.length}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-11 flex flex-col gap-3">
          {stage.instruction && (
            <div className="text-13 text-night leading-relaxed">{stage.instruction}</div>
          )}
          {stage.fallbackReply && (
            <div className="flex flex-col gap-1">
              <span className="text-13 text-dusk">Ответ по умолчанию</span>
              <div className="text-13 text-night leading-relaxed">{stage.fallbackReply}</div>
            </div>
          )}
          {stage.transitions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-13 text-dusk">
                Переходы, проверяются по порядку
              </span>
              {stage.transitions.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-13">
                  <pre className="bg-bg rounded-field p-2 font-mono text-13 overflow-auto max-w-[70%]">
                    {Object.keys(t.condition).length > 0 ? prettyJson(t.condition) : "иначе"}
                  </pre>
                  <span className="text-gray">→</span>
                  <span className="font-medium whitespace-nowrap">
                    {t.to ? (titles.get(t.to) ?? t.to) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SchemeTab({ document, check }: ScenarioTabProps) {
  const stages = useMemo(() => parseStages(document), [document]);
  const messages = useMemo(() => flowMessages(document, check), [document, check]);
  const severity = useMemo(() => stageSeverityMap(document, messages), [document, messages]);
  const titles = useMemo(() => new Map(stages.map((s) => [s.id, s.title])), [stages]);

  if (stages.length === 0) {
    return <EmptyState icon="bars" text="В документе сценария нет этапов разговора." />;
  }

  const above = stages.filter((s) => s.row === "above");
  const main = stages.filter((s) => s.row === "main");
  const below = stages.filter((s) => s.row === "below");
  const exits = stages.filter((s) => s.exit);
  const flowStages = stages.filter((s) => !s.exit);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface border border-line rounded-card p-5 overflow-x-auto">
        <div className="flex flex-col gap-2 min-w-max">
          <StageRow stages={above} severity={severity} />
          <StageRow stages={flowStages.length > 0 ? flowStages : main} severity={severity} />
          <StageRow stages={below} severity={severity} />
          {exits.length > 0 && (
            <div className="flex items-center gap-2 pt-2 mt-1 border-t border-line min-w-max">
              <span className="text-13 text-dusk shrink-0">Выходы</span>
              <span className="text-gray">·</span>
              {exits.map((s) => (
                <StageBlock key={s.id} stage={s} severity={severity.get(s.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {messages.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-medium">Диагностики этапов и переходов</h3>
          {messages.map((m, i) => (
            <Notice
              key={i}
              variant={m.severity === "danger" ? "error" : "warning"}
              className="items-start"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span>{m.message}</span>
                <span className="font-mono text-xs opacity-80">{m.path}</span>
              </div>
            </Notice>
          ))}
        </div>
      )}

      <div className="bg-surface border border-line rounded-card overflow-hidden">
        {stages.map((s) => (
          <StageAccordion key={s.id} stage={s} severity={severity.get(s.id)} titles={titles} />
        ))}
      </div>
    </div>
  );
}

export type { ScenarioTabProps as SchemeTabProps };
