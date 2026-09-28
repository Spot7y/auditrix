"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Toast = { id: number; tone: "success" | "error"; message: string };

const TOAST_EVENT = "auditrix:toast";
const SUCCESS_MS = 5000;
let nextId = 1;

/** Shows a toast from client code, e.g. after an action that doesn't redirect. */
export function showToast(tone: Toast["tone"], message: string) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { tone, message } }));
}

function withToast(all: Toast[], tone: Toast["tone"], message: string): Toast[] {
  return [...all.filter((t) => t.message !== message), { id: nextId++, tone, message }];
}

/**
 * Server actions report results by redirecting with ?success= or ?error=.
 * This turns those into toasts and removes them from the URL, so a refresh
 * doesn't show the message again. Success toasts fade out; errors stay until
 * dismissed.
 */
export default function Toaster() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [handled, setHandled] = useState<string | null>(null);

  const success = params.get("success");
  const error = params.get("error");
  const flash = success || error ? `${pathname}?${params.toString()}` : null;

  // Pick up a new flash message while rendering (React's pattern for state
  // that follows a changing input), rather than in an effect.
  if (flash !== handled) {
    setHandled(flash);
    if (flash) {
      setToasts((all) => {
        let next = all;
        if (success) next = withToast(next, "success", success);
        if (error) next = withToast(next, "error", error);
        return next;
      });
    }
  }

  // Remove the message from the URL once it's shown.
  useEffect(() => {
    if (!success && !error) return;
    const rest = new URLSearchParams(params);
    rest.delete("success");
    rest.delete("error");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [success, error, params, pathname, router]);

  useEffect(() => {
    const timers = toasts
      .filter((t) => t.tone === "success")
      .map((t) => setTimeout(() => setToasts((all) => all.filter((x) => x.id !== t.id)), SUCCESS_MS));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const { tone, message } = (e as CustomEvent<{ tone: Toast["tone"]; message: string }>).detail;
      setToasts((all) => withToast(all, tone, message));
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  const dismiss = (id: number) => setToasts((all) => all.filter((t) => t.id !== id));

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
    >
      {toasts.map((t) => {
        const Icon = t.tone === "success" ? CheckCircle2 : XCircle;
        return (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-overlay"
          >
            <Icon
              className={`mt-0.5 size-5 shrink-0 ${t.tone === "success" ? "text-status-completed" : "text-status-violation"}`}
              aria-hidden
            />
            <p className="min-w-0 flex-1 leading-relaxed text-ink-800">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="-mr-1 rounded-md p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
