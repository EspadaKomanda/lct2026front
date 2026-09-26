import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export interface RankDotsProps {
  value: number;
  label?: ReactNode;
  className?: string;
}

export function RankDots({ value, label, className }: RankDotsProps) {
  const v = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <span className="text-process tracking-[2px]" aria-label={`${v} из 5`}>
        {"●".repeat(v)}
        {"○".repeat(5 - v)}
      </span>
      {label !== undefined && <span className="text-dusk">{label}</span>}
    </span>
  );
}
