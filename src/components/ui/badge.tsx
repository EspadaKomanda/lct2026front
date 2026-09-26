import type { ReactNode } from "react";
import { cx } from "@/lib/utils";
import { Icon, type IconName } from "@/components/icons";

export type BadgeVariant =
  | "assessment" | "training" | "demo" | "rehearsal" | "statusGray" | "lucky"
  | "simplified" | "violation" | "noDecision" | "objection" | "reviewed"
  | "smallData" | "default" | "draft" | "published" | "archived";

const VARIANTS: Record<BadgeVariant, { cls: string; icon?: IconName }> = {
  assessment: { cls: "bg-frost text-night", icon: "fileCheck" },
  training: { cls: "bg-transparent text-[#3F4B5E] border border-gray", icon: "repeat" },
  demo: { cls: "bg-transparent text-gray2 border border-dashed border-gray", icon: "dot" },
  rehearsal: { cls: "bg-transparent text-gray2 border border-dashed border-gray", icon: "info" },
  statusGray: { cls: "bg-[#F1F3F6] text-night" },
  lucky: { cls: "bg-banner-bg text-banner", icon: "alert" },
  simplified: { cls: "bg-transparent text-gray2 border border-dashed border-gray", icon: "info" },
  violation: { cls: "bg-violation-bg text-violation", icon: "tri" },
  noDecision: { cls: "bg-neutral-bg text-neutral h-auto whitespace-normal px-2.5 py-1.5", icon: "info" },
  objection: { cls: "bg-surface text-night border border-contour", icon: "msg" },
  reviewed: { cls: "bg-transparent text-success", icon: "check" },
  smallData: { cls: "bg-transparent text-dusk italic font-normal", icon: "hour" },
  default: { cls: "bg-[#F1F3F6] text-night", icon: "check" },
  draft: { cls: "bg-[#F1F3F6] text-night", icon: "pencil" },
  published: { cls: "bg-[#F1F3F6] text-night", icon: "check" },
  archived: { cls: "bg-[#F1F3F6] text-night", icon: "archive" },
};

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: IconName | null;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "default", icon, title, children, className }: BadgeProps) {
  const v = VARIANTS[variant];
  const iconName = icon === undefined ? v.icon : icon;
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1.5 h-6 px-2 rounded-field text-xs font-medium whitespace-nowrap",
        v.cls,
        className
      )}
    >
      {iconName && <Icon name={iconName} size={14} className="shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
