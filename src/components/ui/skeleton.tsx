import { cx } from "@/lib/utils";
import { Spinner } from "./spinner";

export interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  className?: string;
}

export function Skeleton({ height = 14, width, className }: SkeletonProps) {
  return (
    <div
      className={cx("bg-frost rounded animate-skeleton", className)}
      style={{ height, width }}
      aria-hidden="true"
    />
  );
}

export function PageSpinner({ label = "Загрузка…", className }: { label?: string; className?: string }) {
  return (
    <div className={cx("flex items-center justify-center gap-3 py-16 text-dusk", className)}>
      <Spinner size={20} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx("bg-surface rounded-card border border-line p-6 flex flex-col gap-3", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={14} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}
