"use client";

import { AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonSize, type ButtonVariant } from "./Button";
import { DialogPanel } from "./Dialog";

/**
 * Use in place of a form's submit button for actions that are hard to undo.
 * Clicking opens a confirmation; the surrounding form is submitted only when
 * the user confirms.
 */
export default function ConfirmButton({
  children,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  variant,
  size,
  block,
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { pending } = useFormStatus();
  const Icon = tone === "danger" ? AlertTriangle : HelpCircle;

  return (
    <>
      <Button
        ref={triggerRef}
        variant={variant ?? (tone === "danger" ? "danger" : "primary")}
        size={size}
        block={block}
        className={className}
        disabled={pending}
        aria-label={ariaLabel}
        onClick={() => {
          // Let the browser flag missing or invalid fields before asking "are you sure?".
          const form = triggerRef.current?.form;
          if (form && !form.reportValidity()) return;
          dialogRef.current?.showModal();
        }}
      >
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </Button>

      <DialogPanel
        ref={dialogRef}
        labelledBy={titleId}
        onBackdropClick={() => dialogRef.current?.close()}
        className="max-w-md"
      >
        <div className="flex gap-4 p-6">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
              tone === "danger" ? "bg-red-50 text-status-violation" : "bg-brand-50 text-brand-700"
            }`}
          >
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-ink-900">
              {title}
            </h2>
            {description && <div className="mt-1.5 text-sm leading-relaxed text-ink-600">{description}</div>}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 rounded-b-2xl border-t border-line bg-ink-50 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => {
              dialogRef.current?.close();
              triggerRef.current?.form?.requestSubmit();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogPanel>
    </>
  );
}
