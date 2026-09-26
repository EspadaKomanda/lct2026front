"use client";

import type { Criterion, ProgressLine } from "@/lib/api/types";
import { CRITERION_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

const W = 760;
const H = 220;
const LEFT = 40;
const RIGHT = 20;
const AXIS_Y = 170;

function yOf(proc: number): number {
  return AXIS_Y - proc * 1.5;
}

export function ProgressChart({ line, letter }: { line: ProgressLine; letter: string }) {
  const points = line.points
    .map((p) => ({ ...p, proc: p.process_number }))
    .filter((p): p is typeof p & { proc: number } => p.proc !== null && p.proc !== undefined);
  const n = points.length;
  const xOf = (i: number) => (n === 1 ? W / 2 : LEFT + (i * (W - LEFT - RIGHT)) / (n - 1));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Динамика: ${line.scenario_title}`}>
      <line x1={LEFT - 10} y1={AXIS_Y} x2={W - RIGHT + 10} y2={AXIS_Y} stroke="var(--color-line)" strokeWidth="1" />
      {points.map((p, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const dashed = p.simplified || prev.simplified;
        return (
          <line
            key={`seg-${p.session_id}`}
            x1={xOf(i - 1)}
            y1={yOf(prev.proc)}
            x2={xOf(i)}
            y2={yOf(p.proc)}
            stroke="var(--color-process)"
            strokeWidth={2}
            strokeDasharray={dashed ? "3 2" : undefined}
          />
        );
      })}
      {points.map((p, i) => {
        const cx = xOf(i);
        const cy = yOf(p.proc);
        const criteria = p.criteria_bands
          ? (Object.keys(p.criteria_bands) as Criterion[])
              .map((c) => `${CRITERION_LABEL[c]}: ${p.criteria_bands?.[c] ?? "—"}`)
              .join("\n")
          : "";
        return (
          <g key={p.session_id}>
            {criteria && <title>{criteria}</title>}
            <circle cx={cx} cy={cy} r={6} fill="#ffffff" stroke="var(--color-process)" strokeWidth={2} />
            <text x={cx} y={cy - 14} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--color-night)">
              {p.proc}
            </text>
            <text x={cx} y={AXIS_Y + 18} textAnchor="middle" fontSize={12} fill="var(--color-dusk)">
              {formatDate(p.started_at)}
            </text>
            <text x={cx} y={AXIS_Y + 36} textAnchor="middle" fontSize={12} fill="var(--color-gray)">
              {letter}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
