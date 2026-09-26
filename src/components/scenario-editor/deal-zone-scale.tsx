"use client";

import { useMemo, useState } from "react";
import type { Difficulty, ScenarioDocument } from "@/lib/api/types";
import { DIFFICULTY_LABEL } from "@/lib/labels";
import { formatNumber } from "@/lib/utils";
import { SegmentControl } from "@/components/ui";

const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

export interface IssueScaleProps {
  issue: Record<string, unknown>;
  difficultyConfig?: Record<string, unknown>;
}

export function DealZoneScale({ issue, difficultyConfig }: IssueScaleProps) {
  const [level, setLevel] = useState<Difficulty>("normal");

  const label = typeof issue.label === "string" ? issue.label : "Предмет торга";
  const unit = typeof issue.unit === "string" ? issue.unit : "₽";
  const direction = issue.direction === "higher_better" ? "higher_better" : "lower_better";

  const part = (issue.participant ?? {}) as Record<string, unknown>;
  const opp = (issue.opponent ?? {}) as Record<string, unknown>;

  // Base values
  const baseOppStart = Number(opp.start) || 23400;
  const baseOppLimit = Number(opp.limit) || 17200;
  const basePartTarget = Number(part.target) || 18500;
  const basePartLimit = Number(part.limit) || 21000;

  // Apply difficulty shifts if configured
  const { oppStart, oppLimit, partTarget, partLimit } = useMemo(() => {
    let start = baseOppStart;
    let limit = baseOppLimit;
    if (level === "easy") {
      start = Math.round(baseOppStart * 0.97);
      limit = Math.round(baseOppLimit * 0.97);
    } else if (level === "hard") {
      start = Math.round(baseOppStart * 1.03);
      limit = Math.round(baseOppLimit * 1.03);
    }
    return {
      oppStart: start,
      oppLimit: limit,
      partTarget: basePartTarget,
      partLimit: basePartLimit,
    };
  }, [baseOppStart, baseOppLimit, basePartTarget, basePartLimit, level]);

  const allVals = [oppStart, oppLimit, partTarget, partLimit].filter(Number.isFinite);
  const minVal = Math.min(...allVals) * 0.9;
  const maxVal = Math.max(...allVals) * 1.1;

  const toPercent = (v: number) => {
    if (maxVal === minVal) return 50;
    const p = ((v - minVal) / (maxVal - minVal)) * 100;
    return Math.max(3, Math.min(97, p));
  };

  // Deal zone calculation
  // For lower_better (e.g. procurement price: buyer wants lower, seller wants higher):
  // Deal zone is between oppLimit (seller won't sell below X) and partLimit (buyer won't buy above Y)
  // If oppLimit > partLimit => EMPTY ZONE!
  const isLowerBetter = direction === "lower_better";
  const zoneStart = Math.min(oppLimit, partLimit);
  const zoneEnd = Math.max(oppLimit, partLimit);
  const zoneEmpty = isLowerBetter ? oppLimit > partLimit : oppLimit < partLimit;

  const zoneLeft = toPercent(zoneStart);
  const zoneRight = toPercent(zoneEnd);
  const zoneWidth = Math.max(2, zoneRight - zoneLeft);

  return (
    <div className="flex flex-col gap-3 p-4 bg-frost rounded-card border border-line">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-13 font-semibold text-night">{label}</span>
          <span className="text-xs text-dusk">
            {isLowerBetter ? "Участнику выгоднее: меньше ←" : "Участнику выгоднее: больше →"}
          </span>
        </div>

        <div className="w-[280px]">
          <SegmentControl
            value={level}
            onChange={(v) => setLevel(v as Difficulty)}
            options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
          />
        </div>
      </div>

      {/* Graphical Scale */}
      <div className="relative h-24 mt-2 px-2">
        {/* Baseline Axis */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-contour" />

        {/* Deal Zone Band */}
        <div
          style={{ left: `${zoneLeft}%`, width: `${zoneWidth}%` }}
          className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-sm transition-all duration-200 ${
            zoneEmpty
              ? "border border-danger bg-danger/10"
              : "border-x-2 border-success bg-success/20"
          }`}
          title={
            zoneEmpty
              ? "Зона сделки пуста: предел оппонента хуже предела участника"
              : `Зона сделки: ${formatNumber(zoneStart)} – ${formatNumber(zoneEnd)} ${unit}`
          }
        />

        {/* Markers above line: Opponent Start & Opponent Limit */}
        <div
          style={{ left: `${toPercent(oppStart)}%` }}
          className="absolute top-1 -translate-x-1/2 flex flex-col items-center pointer-events-none group"
        >
          <span className="text-[11px] font-medium text-night whitespace-nowrap bg-surface px-1 py-0.5 rounded shadow-sm border border-line">
            Старт оппонента: {formatNumber(oppStart)} {unit}
          </span>
          <div className="w-2.5 h-2.5 rotate-45 bg-night border border-surface mt-1" />
        </div>

        <div
          style={{ left: `${toPercent(oppLimit)}%` }}
          className="absolute top-1 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        >
          <span className="text-[11px] font-medium text-night whitespace-nowrap bg-surface px-1 py-0.5 rounded shadow-sm border border-line">
            Предел оппонента: {formatNumber(oppLimit)} {unit}
          </span>
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-night mt-1" />
        </div>

        {/* Markers below line: Participant Target & Participant Limit */}
        <div
          style={{ left: `${toPercent(partTarget)}%` }}
          className="absolute bottom-1 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        >
          <div className="w-2 h-2 rounded-full bg-accent border border-surface mb-1" />
          <span className="text-[11px] font-medium text-accent whitespace-nowrap bg-surface px-1 py-0.5 rounded shadow-sm border border-accent/40">
            Цель: {formatNumber(partTarget)} {unit}
          </span>
        </div>

        <div
          style={{ left: `${toPercent(partLimit)}%` }}
          className="absolute bottom-1 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        >
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-accent mb-1" />
          <span className="text-[11px] font-medium text-dusk whitespace-nowrap bg-surface px-1 py-0.5 rounded shadow-sm border border-line">
            Предел участника: {formatNumber(partLimit)} {unit}
          </span>
        </div>
      </div>

      {/* Status Line */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-line/60">
        <span className="text-dusk">
          {formatNumber(Math.round(minVal))} {unit}
        </span>
        <span
          className={`font-medium ${
            zoneEmpty ? "text-danger flex items-center gap-1" : "text-success"
          }`}
        >
          {zoneEmpty
            ? "⚠️ Зона сделки пуста: стороны не могут договориться на этом уровне сложности"
            : `✓ Зона сделки: ${formatNumber(zoneStart)} – ${formatNumber(zoneEnd)} ${unit}`}
        </span>
        <span className="text-dusk">
          {formatNumber(Math.round(maxVal))} {unit}
        </span>
      </div>
    </div>
  );
}
