import { cx } from "@/lib/utils";

export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({ value, max = 100, className, barClassName }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cx("h-1 rounded-[2px] bg-frost overflow-hidden", className)}>
      <div
        className={cx("h-full rounded-[2px] bg-accent transition-[width] duration-200", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
