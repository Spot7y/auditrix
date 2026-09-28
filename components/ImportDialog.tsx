"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface ImportResult {
  error?: string;
  success?: string;
  warnings?: string[];
}

// Keep in step with serverActions.bodySizeLimit in next.config.ts, which
// allows a little extra for the form's own overhead.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type ImportAction = (prev: ImportResult | null, formData: FormData) => Promise<ImportResult>;

export interface PreviewResult<P> {
  error?: string;
  warnings?: string[];
  preview?: P;
}

export interface ImportPreviewStep<P> {
  /** Checks the file and reports what the import would do, without writing anything. */
  action: (prev: PreviewResult<P> | null, formData: FormData) => Promise<PreviewResult<P>>;
  render: (preview: P) => ReactNode;
}

interface ImportDialogProps<P> {
  /** Text on the button that opens the dialog. */
  triggerLabel: string;
  triggerClassName: string;
  title: string;
  action: ImportAction;
  /** Form fields (file input, selects, hidden inputs) rendered above the error and buttons. */
  children: ReactNode;
  /** Where "Done" goes after a successful import; without it, "Done" just closes the dialog. */
  doneHref?: string;
  /** When given, "Import" first shows a preview and the import runs only after the user confirms it. */
  preview?: ImportPreviewStep<P>;
}

export default function ImportDialog<P>({
  triggerLabel,
  triggerClassName,
  title,
  action,
  children,
  doneHref,
  preview,
}: ImportDialogProps<P>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [formKey, setFormKey] = useState(0);
  // Don't let Esc or a backdrop click drop the result of an import in flight.
  const busyRef = useRef(false);

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    if (!busyRef.current) dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" onClick={open} className={triggerClassName}>
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // Start fresh each time the dialog is dismissed, so reopening it
        // doesn't show the previous import's results.
        onClose={() => setFormKey((k) => k + 1)}
        onCancel={(e) => {
          if (busyRef.current) e.preventDefault();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg border-t-4 border-t-[color:var(--accent-maroon)] bg-white p-0 shadow-xl backdrop:bg-black/40"
      >
        <ImportForm
          key={formKey}
          title={title}
          titleId={titleId}
          action={action}
          doneHref={doneHref}
          preview={preview}
          onClose={close}
          onPendingChange={(pending) => {
            busyRef.current = pending;
          }}
        >
          {children}
        </ImportForm>
      </dialog>
    </>
  );
}

async function noPreview<P>(): Promise<PreviewResult<P>> {
  return {};
}

function ImportForm<P>({
  title,
  titleId,
  action,
  children,
  doneHref,
  preview,
  onClose,
  onPendingChange,
}: {
  title: string;
  titleId: string;
  action: ImportAction;
  children: ReactNode;
  doneHref?: string;
  preview?: ImportPreviewStep<P>;
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [state, formAction, importPending] = useActionState<ImportResult | null, FormData>(action, null);
  const [previewState, previewAction, previewPending] = useActionState<PreviewResult<P> | null, FormData>(
    preview?.action ?? noPreview<P>,
    null
  );
  // The form data the preview was made from; confirming imports exactly this.
  const previewedData = useRef<FormData | null>(null);
  const [showingPreview, setShowingPreview] = useState(false);
  // Checked before uploading, since an over-limit request fails without a useful message.
  const [sizeError, setSizeError] = useState<string | null>(null);
  const pending = importPending || previewPending;

  useEffect(() => {
    onPendingChange(pending);
  }, [pending, onPendingChange]);

  const warnings = state?.warnings ?? [];
  const previewReady = preview && showingPreview && !previewPending && previewState?.preview !== undefined;
  const formError = sizeError ?? (preview ? previewState?.error : state?.error);
  const formWarnings = (preview ? previewState?.warnings : state?.warnings) ?? [];
  const doneClassName =
    "mt-6 block w-full bg-[color:var(--accent-maroon)] px-5 py-2 text-center text-sm font-medium text-white hover:opacity-90";

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 -mt-1 px-2 text-xl leading-none text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]"
        >
          ×
        </button>
      </div>

      {state?.success ? (
        <div className="mt-6">
          <p className="text-sm font-medium text-[color:var(--status-completed)]">{state.success}</p>
          <WarningList warnings={warnings} />
          {doneHref ? (
            <Link href={doneHref} className={doneClassName}>
              Done
            </Link>
          ) : (
            <button type="button" onClick={onClose} className={doneClassName}>
              Done
            </button>
          )}
        </div>
      ) : (
        <>
          {previewReady && (
            <div className="mt-6" aria-live="polite">
              {preview.render(previewState!.preview as P)}
              <WarningList warnings={previewState?.warnings ?? []} />
              {state?.error && (
                <div className="mt-3">
                  <p className="text-sm text-[color:var(--status-violation)]">{state.error}</p>
                  <WarningList warnings={warnings} />
                </div>
              )}
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowingPreview(false)}
                  disabled={pending}
                  className="flex-1 border border-[color:var(--ledger-line)] px-5 py-2 text-sm font-medium text-[color:var(--ink)] hover:bg-black/5 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const formData = previewedData.current;
                    if (formData) startTransition(() => formAction(formData));
                  }}
                  disabled={pending}
                  className="flex-1 bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {importPending ? "Importing…" : "Confirm import"}
                </button>
              </div>
            </div>
          )}
          <form
            // Hidden rather than unmounted during the preview, so "Back" keeps
            // the chosen file and options.
            hidden={previewReady}
            // Submitting via onSubmit rather than `action` skips React's automatic
            // form reset, so the chosen options and file survive a failed import.
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const tooLarge = [...formData.values()].find(
                (v): v is File => v instanceof File && v.size > MAX_FILE_BYTES
              );
              if (tooLarge) {
                setSizeError(`${tooLarge.name} is too large. Files can be up to 10 MB.`);
                return;
              }
              setSizeError(null);
              if (preview) {
                previewedData.current = formData;
                setShowingPreview(true);
                startTransition(() => previewAction(formData));
              } else {
                startTransition(() => formAction(formData));
              }
            }}
            className="mt-6 space-y-4"
          >
            {children}

            {formError && (
              <div aria-live="polite">
                <p className="text-sm text-[color:var(--status-violation)]">{formError}</p>
                <WarningList warnings={formWarnings} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="flex-1 border border-[color:var(--ledger-line)] px-5 py-2 text-sm font-medium text-[color:var(--ink)] hover:bg-black/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {previewPending ? "Checking file…" : pending ? "Importing…" : preview ? "Preview import" : "Import"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <details className="mt-3 text-xs text-[color:var(--status-pending)]" open={warnings.length <= 5}>
      <summary className="cursor-pointer font-medium">
        {warnings.length} note{warnings.length === 1 ? "" : "s"}
      </summary>
      <ul className="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pl-5">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </details>
  );
}
