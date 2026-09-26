import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export interface SegmentOption<V extends string = string> {
  value: V;
  label: ReactNode;
}

export interface SegmentControlProps<V extends string = string> {
  options: SegmentOption<V>[];
  value: V;
  onChange?: (value: V) => void;
  className?: string;
}

export function SegmentControl<V extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentControlProps<V>) {
  return (
    <div className={cx("inline-flex bg-frost rounded-field p-0.5 gap-0.5 w-max", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange?.(o.value)}
          className={cx(
            "h-7 px-3 rounded-[3px] text-13 text-dusk whitespace-nowrap transition-colors",
            o.value === value ? "bg-surface text-accent font-medium shadow-sm" : "hover:text-night"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
