"use client";

import { useEffect, type ReactNode } from "react";
import { cx } from "@/lib/utils";
import { IconButton } from "./button";
import "./drawer.css";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  width?: number;
  children: ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, title, width = 480, children, className }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      className={cx(
        "ui-drawer-in fixed right-0 top-14 bottom-0 bg-surface border-l border-line shadow-panel p-6 z-40 overflow-auto",
        className
      )}
      style={{ width }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        {title !== undefined && <h3 className="text-xl font-medium leading-tight">{title}</h3>}
        <IconButton name="x" size={32} title="Закрыть" onClick={onClose} className="ml-auto shrink-0 -mt-1 -mr-1" />
      </div>
      {children}
    </div>
  );
}
