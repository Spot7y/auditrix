"use client";

import { useState } from "react";

export default function FeedbackModal({ error, success }: { error?: string; success?: string }) {
  const [visible, setVisible] = useState(!!(error || success));

  if (!visible) return null;

  const isError = !!error;
  const message = error || success;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => setVisible(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-4 max-w-md border-t-4 bg-white p-6 shadow-xl"
        style={{ borderTopColor: isError ? "var(--status-violation)" : "var(--status-completed)" }}
      >
        <p
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: isError ? "var(--status-violation)" : "var(--status-completed)" }}
        >
          {isError ? "Error" : "Success"}
        </p>
        <p className="mt-2 text-sm text-[color:var(--ink)]">{message}</p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="mt-4 bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Close
        </button>
      </div>
    </div>
  );
}