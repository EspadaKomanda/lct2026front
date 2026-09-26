import type { ReactNode } from "react";
import { cx } from "@/lib/utils";
import { formatPercent } from "@/lib/utils";

export interface StatBarProps {
  label: ReactNode;
  share: number;
  value?: ReactNode;
  className?: string;
  barClassName?: string;
}

export function StatBar({ label, share, value, className, barClassName }: StatBarProps) {
  const pct = Math.min(100, Math.max(0, share * 100));
  return (
    <div className={cx("grid grid-cols-[minmax(0,1fr)_140px_64px] gap-3 items-center h-8 text-sm", className)}>
      <span className="truncate text-dusk">{label}</span>
      <span className="h-2 rounded-[2px] bg-frost overflow-hidden">
        <span className={cx("block h-full rounded-[2px] bg-accent", barClassName)} style={{ width: `${pct}%` }} />
      </span>
      <span className="font-medium text-right">{value ?? `${formatPercent(share)}%`}</span>
    </div>
  );
}
