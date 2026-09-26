"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastState {
  message: ReactNode;
  action?: ToastAction;
  key: number;
}

const ToastContext = createContext<{ show: (message: ReactNode, action?: ToastAction) => void }>({
  show: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: ReactNode, action?: ToastAction) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, action, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    timer.current = setTimeout(() => setToast(null), 5000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          key={toast.key}
          className="fixed left-1/2 bottom-6 -translate-x-1/2 z-50 bg-night text-white px-4 py-3 rounded-card shadow-panel flex gap-4 items-center animate-fade-in whitespace-nowrap"
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="text-link-light text-sm font-medium hover:underline"
              onClick={() => {
                toast.action?.onClick();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}
