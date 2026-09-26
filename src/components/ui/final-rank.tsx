import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export type FinalRankSize = "sm" | "md" | "lg";

const SIZES: Record<FinalRankSize, string> = {
  sm: "w-6 h-6 text-13 rounded-field",
  md: "w-8 h-8 text-base rounded-field",
  lg: "w-16 h-16 text-5xl rounded-card",
};

export interface FinalRankProps {
  rank: ReactNode;
  size?: FinalRankSize;
  title?: ReactNode;
  className?: string;
  titleClassName?: string;
}

export function FinalRank({ rank, size = "md", title, className, titleClassName }: FinalRankProps) {
  return (
    <span className={cx("inline-flex items-center gap-2.5 min-w-0", className)}>
      <span
        className={cx(
          "inline-flex items-center justify-center border border-night font-semibold text-center leading-none shrink-0",
          SIZES[size]
        )}
      >
        {rank}
      </span>
      {title !== undefined && (
        <span className={cx("font-medium truncate max-w-[240px]", titleClassName)} title={typeof title === "string" ? title : undefined}>
          {title}
        </span>
      )}
    </span>
  );
}
