"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/utils";
import { Icon, type IconName } from "@/components/icons";
import { IconButton } from "./button";

export interface MenuItem {
  key: string;
  label: ReactNode;
  icon?: IconName;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface MenuProps {
  items: MenuItem[];
  triggerTitle?: string;
  triggerSize?: 40 | 36 | 32;
  align?: "right" | "left";
  className?: string;
}

export function Menu({ items, triggerTitle = "Ещё", triggerSize = 32, align = "right", className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cx("relative inline-block", className)}>
      <IconButton
        name="moreHorizontal"
        size={triggerSize}
        title={triggerTitle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      />
      {open && (
        <div
          role="menu"
          className={cx(
            "absolute top-full mt-1 bg-surface border border-line rounded-card shadow-panel p-1 min-w-[220px] z-40 flex flex-col",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onClick?.();
              }}
              className={cx(
                "h-9 px-3 rounded-field flex gap-2 items-center text-left text-sm whitespace-nowrap transition-colors",
                it.danger ? "text-danger hover:bg-danger-bg" : "hover:bg-frost",
                it.disabled && "text-gray cursor-not-allowed hover:bg-transparent"
              )}
            >
              {it.icon && <Icon name={it.icon} size={16} className="shrink-0" />}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
