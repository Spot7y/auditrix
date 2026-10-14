"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FLASH_COOKIE_NAME as FLASH_COOKIE } from "../../lib/flashCookie";
import { NOTICES, type NoticeCode } from "../../lib/notices";

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

/** The flash cookie's contents, if it belongs to this page's `flash` id. Removes the cookie either way. */
function takeFlash(id: string): { success?: string; error?: string } | null {
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${FLASH_COOKIE}=`))
    ?.slice(FLASH_COOKIE.length + 1);
  if (!raw) return null;
  document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0; samesite=lax`;
  try {
    const flash = JSON.parse(decodeURIComponent(raw)) as { id?: string; success?: string; error?: string };
    return flash.id === id ? flash : null;
  } catch {
    return null;
  }
}

/**
 * Server actions report results through a short-lived cookie the server
 * sets, and the address only carries a matching `flash` id (see lib/flash);
 * pages that send someone elsewhere pass a `notice` code instead. Neither
 * lets a link put its own words on screen. This shows them as toasts and
 * removes them from the address, so a refresh doesn't show them again.
 * Success toasts fade out; errors stay until dismissed.
 */
export default function Toaster() {
  const params = useSearchParams();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const flashId = params.get("flash");
  const notice = params.get("notice");

  // Registered first, so messages picked up on the first render below are not missed.
  useEffect(() => {
    const onToast = (e: Event) => {
      const { tone, message } = (e as CustomEvent<{ tone: Toast["tone"]; message: string }>).detail;
      setToasts((all) => withToast(all, tone, message));
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  useEffect(() => {
    if (!flashId && !notice) return;
    if (flashId) {
      const flash = takeFlash(flashId);
      if (flash?.success) showToast("success", flash.success);
      if (flash?.error) showToast("error", flash.error);
    }
    // Only codes in the list count (not e.g. "constructor").
    const noticeText = notice && Object.hasOwn(NOTICES, notice) ? NOTICES[notice as NoticeCode] : undefined;
    if (noticeText) showToast("error", noticeText);

    const rest = new URLSearchParams(params);
    rest.delete("flash");
    rest.delete("notice");
    const query = rest.toString();
    // The browser's own history call: Next keeps its router in step, and
    // unlike router.replace it doesn't ask the server for the page again.
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [flashId, notice, params, pathname]);

  useEffect(() => {
    const timers = toasts
      .filter((t) => t.tone === "success")
      .map((t) => setTimeout(() => setToasts((all) => all.filter((x) => x.id !== t.id)), SUCCESS_MS));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

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
