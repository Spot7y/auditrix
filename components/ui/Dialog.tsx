"use client";

import { X } from "lucide-react";
import { forwardRef, type ReactNode } from "react";

/** Shared look for every modal: rounded panel, green top accent, blurred backdrop. */
export const dialogClassName =
  "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-white p-0 text-ink-900 shadow-overlay open:animate-dialog-in";

export const DialogPanel = forwardRef<
  HTMLDialogElement,
  {
    labelledBy: string;
    onClose?: () => void;
    onCancel?: (e: React.SyntheticEvent<HTMLDialogElement>) => void;
    onBackdropClick?: () => void;
    children: ReactNode;
    className?: string;
  }
>(function DialogPanel({ labelledBy, onClose, onCancel, onBackdropClick, children, className }, ref) {
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onCancel={onCancel}
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackdropClick?.();
      }}
      className={`${dialogClassName} ${className ?? ""}`}
    >
      {children}
    </dialog>
  );
});

export function DialogCloseButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Close"
      className="-mr-1.5 -mt-1 rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-50"
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}
