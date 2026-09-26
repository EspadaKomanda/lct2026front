import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange?: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cx("flex gap-6 border-b border-line", className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange?.(t.key)}
          className={cx(
            "-mb-px border-b-2 px-1 pb-2 text-sm transition-colors",
            t.key === active
              ? "border-accent text-night font-medium"
              : "border-transparent text-dusk hover:text-night"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
