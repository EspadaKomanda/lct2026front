"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";

export interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}

export function CopyButton({ text, label = "Копировать", copiedLabel = "Скопировано", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // буфер обмена недоступен — просто показываем состояние
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "h-7 px-2 text-xs border border-contour rounded-field hover:bg-frost inline-flex items-center gap-1.5 transition-colors",
        copied && "text-success border-success",
        className
      )}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
