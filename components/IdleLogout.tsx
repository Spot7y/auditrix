"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Clock } from "lucide-react";
import { logoutAfterInactivity } from "../app/login/actions";
import { Button } from "./ui/Button";

/** Signed out after this long without using Auditrix in any tab. */
export const IDLE_LIMIT_MS = 30 * 60 * 1000;
const WARNING_MS = 60 * 1000;
const STORAGE_KEY = "auditrix:last-activity";
const EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

function readShared(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Signs the user out after 30 minutes without activity, e.g. a computer left
 * open in the office, with a minute's warning first. Activity in any open
 * tab counts, since the tabs share the last-activity time.
 */
export default function IdleLogout() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const lastActivity = useRef(0);
  const signingOut = useRef(false);

  useEffect(() => {
    const record = () => {
      const now = Date.now();
      // Write at most every few seconds; mouse movement fires constantly.
      if (now - lastActivity.current < 5000 && readShared() >= lastActivity.current) return;
      lastActivity.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // Private windows may refuse storage; this tab's own timer still works.
      }
    };
    record();
    for (const event of EVENTS) window.addEventListener(event, record, { passive: true });

    const timer = setInterval(() => {
      const last = Math.max(lastActivity.current, readShared());
      const idle = Date.now() - last;
      if (idle >= IDLE_LIMIT_MS) {
        if (!signingOut.current) {
          signingOut.current = true;
          startTransition(() => logoutAfterInactivity());
        }
      } else if (idle >= IDLE_LIMIT_MS - WARNING_MS) {
        setSecondsLeft(Math.ceil((IDLE_LIMIT_MS - idle) / 1000));
      } else {
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      for (const event of EVENTS) window.removeEventListener(event, record);
    };
  }, []);

  if (secondsLeft === null) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        aria-describedby="idle-description"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <Clock className="size-5" aria-hidden />
          </span>
          <h2 id="idle-title" className="text-base font-semibold text-ink-900">
            Still there?
          </h2>
        </div>
        <p id="idle-description" className="mt-3 text-sm text-ink-600">
          For security, you’ll be signed out in <span className="tabular font-medium text-ink-900">{secondsLeft}</span>{" "}
          {secondsLeft === 1 ? "second" : "seconds"} because Auditrix hasn’t been used for a while.
        </p>
        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => {
              lastActivity.current = Date.now();
              try {
                localStorage.setItem(STORAGE_KEY, String(lastActivity.current));
              } catch {}
              setSecondsLeft(null);
            }}
          >
            Stay signed in
          </Button>
        </div>
      </div>
    </div>
  );
}
