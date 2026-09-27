"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { importStudentsCsv, type ImportResult } from "./importActions";

interface VersionOption {
  id: string;
  effectiveYear: number;
}

export default function ImportStudentsModal({ versions }: { versions: VersionOption[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
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
      <button
        type="button"
        onClick={open}
        className="mt-4 block w-full border border-[color:var(--ledger-line)] px-5 py-2 text-center text-sm font-medium text-[color:var(--ink)] hover:bg-black/5"
      >
        Import Students (CSV/XLS)
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="import-students-title"
        // Start fresh each time the modal is dismissed, so a reopened modal
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
          versions={versions}
          onClose={close}
          onPendingChange={(pending) => {
            busyRef.current = pending;
          }}
        />
      </dialog>
    </>
  );
}

function ImportForm({
  versions,
  onClose,
  onPendingChange,
}: {
  versions: VersionOption[];
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState<ImportResult | null, FormData>(importStudentsCsv, null);

  useEffect(() => {
    onPendingChange(pending);
  }, [pending, onPendingChange]);

  const warnings = state?.warnings ?? [];

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id="import-students-title" className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Import Students
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
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Done
          </button>
        </div>
      ) : (
        <form
          // Submitting via onSubmit rather than `action` skips React's automatic
          // form reset, so the chosen curriculum and file survive a failed import.
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(() => formAction(formData));
          }}
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="import-curriculumId"
              className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60"
            >
              Curriculum Version
            </label>
            <select
              id="import-curriculumId"
              name="curriculumId"
              required
              className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
            >
              <option value="">Select…</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.effectiveYear}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[color:var(--ink)]/50">
              All students in the file will be registered under this one curriculum version.
            </p>
          </div>

          <div>
            <label
              htmlFor="import-file"
              className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60"
            >
              CSV/XLS File
            </label>
            <input
              id="import-file"
              type="file"
              name="file"
              accept=".csv, .xls"
              required
              className="mt-1 block w-full text-sm file:mr-3 file:border-0 file:bg-[color:var(--accent-maroon)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
            />
          </div>

          {state?.error && (
            <div aria-live="polite">
              <p className="text-sm text-[color:var(--status-violation)]">{state.error}</p>
              <WarningList warnings={warnings} />
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
              {pending ? "Importing…" : "Import"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <details className="mt-3 text-xs text-[color:var(--status-pending)]" open={warnings.length <= 5}>
      <summary className="cursor-pointer font-medium">
        {warnings.length} row{warnings.length === 1 ? "" : "s"} skipped or flagged
      </summary>
      <ul className="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pl-5">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </details>
  );
}
