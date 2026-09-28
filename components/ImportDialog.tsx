"use client";

import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { startTransition, useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button, LinkButton, type ButtonVariant } from "./ui/Button";
import { DialogCloseButton, DialogPanel } from "./ui/Dialog";
import Alert from "./ui/Alert";

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
  triggerVariant?: ButtonVariant;
  title: string;
  /** One line under the title explaining what the import does. */
  description?: string;
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
  triggerVariant = "secondary",
  title,
  description,
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
      <Button variant={triggerVariant} onClick={open}>
        <Upload aria-hidden />
        {triggerLabel}
      </Button>

      <DialogPanel
        ref={dialogRef}
        labelledBy={titleId}
        // Start fresh each time the dialog is dismissed, so reopening it
        // doesn't show the previous import's results.
        onClose={() => setFormKey((k) => k + 1)}
        onCancel={(e) => {
          if (busyRef.current) e.preventDefault();
        }}
        onBackdropClick={close}
      >
        <ImportForm
          key={formKey}
          title={title}
          description={description}
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
      </DialogPanel>
    </>
  );
}

async function noPreview<P>(): Promise<PreviewResult<P>> {
  return {};
}

function ImportForm<P>({
  title,
  description,
  titleId,
  action,
  children,
  doneHref,
  preview,
  onClose,
  onPendingChange,
}: {
  title: string;
  description?: string;
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

  return (
    <div>
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-ink-900">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
        </div>
        <DialogCloseButton onClick={onClose} disabled={pending} />
      </div>

      {state?.success ? (
        <>
          <div className="px-6 py-6">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-status-completed" aria-hidden />
              <p className="text-sm font-medium text-ink-900">{state.success}</p>
            </div>
            <WarningList warnings={warnings} />
          </div>
          <Footer>
            {doneHref ? (
              <LinkButton href={doneHref}>Done</LinkButton>
            ) : (
              <Button onClick={onClose}>Done</Button>
            )}
          </Footer>
        </>
      ) : (
        <>
          {previewReady && (
            <div aria-live="polite">
              <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
                {preview.render(previewState!.preview as P)}
                <WarningList warnings={previewState?.warnings ?? []} />
                {state?.error && (
                  <Alert tone="error" className="mt-4">
                    {state.error}
                    <WarningList warnings={warnings} />
                  </Alert>
                )}
              </div>
              <Footer>
                <Button variant="secondary" onClick={() => setShowingPreview(false)} disabled={pending}>
                  Back
                </Button>
                <Button
                  onClick={() => {
                    const formData = previewedData.current;
                    if (formData) startTransition(() => formAction(formData));
                  }}
                  disabled={pending}
                >
                  {importPending && <Loader2 className="animate-spin" aria-hidden />}
                  {importPending ? "Importing…" : "Confirm import"}
                </Button>
              </Footer>
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
          >
            <div className="space-y-4 px-6 py-5">
              {children}

              {formError && (
                <Alert tone="error">
                  {formError}
                  <WarningList warnings={formWarnings} />
                </Alert>
              )}
            </div>

            <Footer>
              <Button variant="secondary" onClick={onClose} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" aria-hidden />}
                {previewPending ? "Checking file…" : pending ? "Importing…" : preview ? "Preview import" : "Import"}
              </Button>
            </Footer>
          </form>
        </>
      )}
    </div>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 rounded-b-2xl border-t border-line bg-ink-50 px-6 py-4 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <details className="mt-3 text-xs text-amber-800" open={warnings.length <= 5}>
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
