import type { ReactNode } from "react";
import { cx } from "@/lib/utils";
import { Icon } from "@/components/icons";

export type StepStatus = "done" | "current" | "wait" | "fail";

export interface StepItem {
  key: string;
  label: ReactNode;
  status?: StepStatus;
  statusText?: ReactNode;
}

export interface StepsProps {
  steps: StepItem[];
  className?: string;
}

export function Steps({ steps, className }: StepsProps) {
  return (
    <div className={cx("flex items-start gap-8 flex-wrap", className)}>
      {steps.map((s, i) => {
        const st = s.status ?? "wait";
        return (
          <div key={s.key} className="flex items-center gap-3">
            <span
              className={cx(
                "w-7 h-7 rounded-full inline-flex items-center justify-center text-13 font-medium shrink-0",
                st === "done" && "bg-success-bg text-success",
                st === "current" && "border-2 border-accent text-accent",
                st === "wait" && "border border-contour text-dusk",
                st === "fail" && "bg-danger-bg text-danger"
              )}
            >
              {st === "done" && <Icon name="check" size={14} />}
              {st === "fail" && <Icon name="x" size={14} />}
              {(st === "current" || st === "wait") && <span>{i + 1}</span>}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-sm">{s.label}</span>
              {s.statusText !== undefined && <span className="text-13 text-dusk">{s.statusText}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
