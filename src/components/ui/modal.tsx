"use client";

import { useEffect, type ReactNode } from "react";
import { cx } from "@/lib/utils";
import { IconButton } from "./button";

export type ModalWidth = 480 | 520 | 560;

const WIDTH: Record<ModalWidth, string> = {
  480: "w-[480px]",
  520: "w-[520px]",
  560: "w-[560px]",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  width?: ModalWidth;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Modal({ open, onClose, title, width = 480, footer, children, className, bodyClassName }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-night/40 animate-fade-in" />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          "relative bg-surface rounded-card shadow-modal p-6 animate-scale-in",
          "max-h-[calc(100vh-64px)] overflow-auto",
          WIDTH[width],
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          {title !== undefined && <h3 className="text-xl font-medium leading-tight">{title}</h3>}
          <IconButton
            name="x"
            size={32}
            title="Закрыть"
            onClick={onClose}
            className="ml-auto shrink-0 -mt-1 -mr-1"
          />
        </div>
        <div className={bodyClassName}>{children}</div>
        {footer !== undefined && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
