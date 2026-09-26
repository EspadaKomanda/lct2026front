import type { ReactNode } from "react";
import { cx } from "@/lib/utils";
import { Icon, type IconName } from "@/components/icons";

export type NoticeVariant = "error" | "warning" | "banner";

const VARIANTS: Record<NoticeVariant, { icon: IconName; cls: string }> = {
  error: { icon: "xCircle", cls: "bg-danger-bg text-danger" },
  warning: { icon: "tri", cls: "bg-warning-bg text-warning" },
  banner: { icon: "alert", cls: "bg-banner-bg text-banner" },
};

export interface NoticeProps {
  variant?: NoticeVariant;
  title?: ReactNode;
  message?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Notice({ variant = "error", title, message, children, className }: NoticeProps) {
  const v = VARIANTS[variant];
  return (
    <div className={cx("px-4 py-3 rounded-field flex gap-2.5 text-sm", v.cls, className)}>
      <Icon name={v.icon} size={16} className="mt-px shrink-0" />
      <div className="min-w-0">
        {title !== undefined && <div className="font-medium">{title}</div>}
        {message !== undefined && <div>{message}</div>}
        {children}
      </div>
    </div>
  );
}
