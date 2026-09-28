"use client";

import { useId, useRef } from "react";
import { Copy, Plus } from "lucide-react";
import { createCurriculumVersion } from "./actions";
import { Button } from "../../../components/ui/Button";
import { DialogCloseButton, DialogPanel } from "../../../components/ui/Dialog";
import { Field, Input } from "../../../components/ui/Field";
import SubmitButton from "../../../components/ui/SubmitButton";

const thisYear = new Date().getFullYear();

export default function NewVersionForm({ latestYear }: { latestYear: number | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => dialogRef.current?.showModal()}>
        <Plus aria-hidden />
        New version
      </Button>

      <DialogPanel ref={dialogRef} labelledBy={titleId} onBackdropClick={() => dialogRef.current?.close()} className="max-w-md">
        <form action={createCurriculumVersion}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-ink-900">
                New curriculum version
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">For students admitted under a revised curriculum.</p>
            </div>
            <DialogCloseButton onClick={() => dialogRef.current?.close()} />
          </div>
          <div className="space-y-4 px-6 py-5">
            <Field label="Effective year" htmlFor="effectiveYear">
              <Input
                id="effectiveYear"
                name="effectiveYear"
                type="number"
                required
                min={2000}
                max={thisYear + 10}
                defaultValue={thisYear}
                className="w-32"
              />
            </Field>
            {latestYear && (
              <p className="flex gap-2 rounded-lg bg-ink-50 px-3 py-2.5 text-sm text-ink-600">
                <Copy className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                Starts as a copy of every subject and requirement in the {latestYear} version, so you only edit what
                changed.
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 rounded-b-2xl border-t border-line bg-ink-50 px-6 py-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Creating…">Create version</SubmitButton>
          </div>
        </form>
      </DialogPanel>
    </>
  );
}
