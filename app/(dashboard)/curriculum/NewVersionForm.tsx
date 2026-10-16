"use client";

import { useId, useRef, useState } from "react";
import { Copy, FileSpreadsheet, Plus } from "lucide-react";
import { createCurriculumVersion, createVersionFromFile, previewVersionFromFile, type NewVersionPreview } from "./actions";
import { Button } from "../../../components/ui/Button";
import { DialogCloseButton, DialogPanel } from "../../../components/ui/Dialog";
import { Field, Input } from "../../../components/ui/Field";
import FileInput from "../../../components/ui/FileInput";
import { Badge } from "../../../components/ui/Badge";
import SubmitButton from "../../../components/ui/SubmitButton";
import ActionForm from "../../../components/ui/ActionForm";
import { ImportForm } from "../../../components/ImportDialog";
import { plural } from "../../../lib/format";

const thisYear = new Date().getFullYear();

type StartFrom = "copy" | "file";

/**
 * Creates a curriculum version, either as a copy of the latest one (to edit
 * what changed) or from an Excel or CSV file (a revised curriculum that
 * arrives as a whole), with a preview before anything is saved.
 */
export default function NewVersionForm({ latestYear }: { latestYear: number | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [startFrom, setStartFrom] = useState<StartFrom>("copy");
  const [year, setYear] = useState(String(thisYear));
  // A fresh form each time the dialog opens, so an earlier file or result isn't shown again.
  const [formKey, setFormKey] = useState(0);
  const busyRef = useRef(false);
  const close = () => {
    if (!busyRef.current) dialogRef.current?.close();
  };

  const fields = (
    <>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink-800">Start from</legend>
        <div className="grid gap-2">
          <Choice
            checked={startFrom === "copy"}
            onSelect={() => setStartFrom("copy")}
            icon={Copy}
            title={latestYear ? `A copy of the ${latestYear} version` : "An empty version"}
            description={
              latestYear
                ? "Every subject and requirement is copied, so you only edit what changed."
                : "Add the subjects afterwards, one by one."
            }
          />
          <Choice
            checked={startFrom === "file"}
            onSelect={() => setStartFrom("file")}
            icon={FileSpreadsheet}
            title="An Excel or CSV file"
            description="For a revised curriculum you have as a file. You’ll see a preview before anything is saved."
          />
        </div>
      </fieldset>
      <Field label="Effective year" htmlFor="effectiveYear">
        <Input
          id="effectiveYear"
          name="effectiveYear"
          type="number"
          required
          min={2000}
          max={thisYear + 10}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-32"
        />
      </Field>
    </>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setFormKey((k) => k + 1);
          setStartFrom("copy");
          dialogRef.current?.showModal();
        }}
      >
        <Plus aria-hidden />
        New version
      </Button>

      <DialogPanel
        ref={dialogRef}
        labelledBy={titleId}
        onBackdropClick={close}
        onCancel={(e) => {
          if (busyRef.current) e.preventDefault();
        }}
        className="max-w-lg"
      >
        {startFrom === "copy" ? (
          <ActionForm key={formKey} action={createCurriculumVersion}>
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-ink-900">
                  New curriculum version
                </h2>
                <p className="mt-0.5 text-sm text-ink-500">For students admitted under a revised curriculum.</p>
              </div>
              <DialogCloseButton onClick={close} />
            </div>
            <div className="space-y-4 px-6 py-5">{fields}</div>
            <div className="flex flex-col-reverse gap-2 rounded-b-2xl border-t border-line bg-ink-50 px-6 py-4 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <SubmitButton pendingLabel="Creating…">Create version</SubmitButton>
            </div>
          </ActionForm>
        ) : (
          <ImportForm<NewVersionPreview>
            key={formKey}
            title="New curriculum version"
            description="For students admitted under a revised curriculum."
            titleId={titleId}
            action={createVersionFromFile}
            preview={{ action: previewVersionFromFile, render: (preview) => <VersionPreview preview={preview} /> }}
            onClose={close}
            onPendingChange={(pending) => {
              busyRef.current = pending;
            }}
          >
            {fields}
            <div>
              <FileInput
                id="new-version-file"
                label="File"
                accept=".xlsx,.xls,.csv"
                hint="Excel (.xlsx or .xls) or CSV. Columns: code, title, units, year level, semester (1, 2 or S for midyear), prerequisites (separate several with “;”)."
              />
              <a
                href="/curriculum-import-template.csv"
                download
                className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline"
              >
                Download template
              </a>
            </div>
          </ImportForm>
        )}
      </DialogPanel>
    </>
  );
}

function Choice({
  checked,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  icon: typeof Copy;
  title: string;
  description: string;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
        checked ? "border-brand-600 bg-brand-50" : "border-line hover:bg-ink-50"
      }`}
    >
      <input type="radio" name="startFrom" checked={checked} onChange={onSelect} className="mt-1 accent-brand-700" />
      <Icon className={`mt-0.5 size-4 shrink-0 ${checked ? "text-brand-700" : "text-ink-400"}`} aria-hidden />
      <span>
        <span className="block font-medium text-ink-900">{title}</span>
        <span className="block text-ink-600">{description}</span>
      </span>
    </label>
  );
}

function VersionPreview({ preview }: { preview: NewVersionPreview }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-ink-700">
        The <span className="font-medium text-ink-900">{preview.effectiveYear}</span> version will be created with{" "}
        <span className="font-medium text-ink-900">{plural(preview.codes.length, "subject")}</span> (
        {plural(preview.units, "unit")}) and their prerequisites from the file.
      </p>
      <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
        {preview.codes.map((code) => (
          <Badge key={code} tone="green">
            {code}
          </Badge>
        ))}
      </div>
    </div>
  );
}
