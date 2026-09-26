import { cx } from "@/lib/utils";

export function Spinner({
  size = 16,
  light = false,
  className,
}: {
  size?: 16 | 20;
  light?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-block rounded-full animate-spin border-2",
        size === 20 ? "w-5 h-5" : "w-4 h-4",
        light ? "border-white/30 border-t-white" : "border-contour border-t-accent",
        className
      )}
      aria-hidden="true"
    />
  );
}
