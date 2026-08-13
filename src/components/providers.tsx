"use client";

import { SessionProvider } from "next-auth/react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; kind: "success" | "error" };
const ToastContext = createContext<(message: string, kind?: Toast["kind"]) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function Providers({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = Date.now();
    setToasts((items) => [...items, { id, message, kind }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3500);
  }, []);
  const value = useMemo(() => notify, [notify]);
  return (
    <SessionProvider>
      <ToastContext.Provider value={value}>
        {children}
        <div className="fixed right-4 top-4 z-50 grid max-w-sm gap-2" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className="card px-4 py-3 text-sm" style={{ borderColor: toast.kind === "error" ? "var(--danger)" : "var(--accent)" }}>
              {toast.message}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </SessionProvider>
  );
}
