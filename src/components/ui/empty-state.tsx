import type { ReactNode } from "react";
import { cx } from "@/lib/utils";
import { Icon, type IconName } from "@/components/icons";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: IconName;
  text: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon = "inbox", text, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cx("flex flex-col items-center gap-4 py-16 px-6 text-center", className)}>
      <Icon name={icon} size={36} className="text-contour" />
      <p className="text-13 text-dusk max-w-[420px] leading-relaxed">{text}</p>
      {actionLabel !== undefined && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
