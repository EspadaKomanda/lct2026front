import type { HTMLAttributes } from "react";
import { cx } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export function Card({ bordered = false, className, children, ...rest }: CardProps) {
  return (
    <div className={cx("bg-surface rounded-card", bordered && "border border-line", className)} {...rest}>
      {children}
    </div>
  );
}
