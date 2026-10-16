"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Trash2, X } from "lucide-react";
import { deleteSubjects } from "./actions";
import ConfirmButton from "../../../components/ui/ConfirmButton";
import { Button } from "../../../components/ui/Button";
import { describeLost, lostRequirements } from "../../../lib/domain/requirements/lostRequirements";
import { plural } from "../../../lib/format";

interface Selection {
  selected: Set<string>;
  toggle: (ids: string[], on: boolean) => void;
}

const SelectionContext = createContext<Selection | null>(null);

function useSelection(): Selection {
  const selection = useContext(SelectionContext);
  if (!selection) throw new Error("Subject checkboxes must be inside <SubjectSelection>.");
  return selection;
}

/**
 * Lets the chairperson tick several subjects of an unlocked version and delete
 * them at once. The confirmation lists the subjects and any requirement the
 * remaining subjects lose because of it.
 */
export default function SubjectSelection({
  curriculumId,
  subjects,
  children,
}: {
  curriculumId: string;
  /** Every subject of the version, with the codes it requires. */
  subjects: { id: string; code: string; requires: string[] }[];
  children: ReactNode;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // Only subjects still in the version count (e.g. after another one was deleted).
  const selected = useMemo(() => new Set(subjects.filter((s) => picked.has(s.id)).map((s) => s.id)), [subjects, picked]);
  const toggle = (ids: string[], on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const codes = subjects.filter((s) => selected.has(s.id)).map((s) => s.code);
  const lost = describeLost(lostRequirements(subjects, codes));

  return (
    <SelectionContext.Provider value={{ selected, toggle }}>
      {children}
      {selected.size > 0 && (
        <div className="sticky bottom-4 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-overlay">
          <p className="text-sm font-medium text-ink-900">{plural(selected.size, "subject")} selected</p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}>
              <X aria-hidden />
              Clear
            </Button>
            <form action={deleteSubjects}>
              <input type="hidden" name="curriculumId" value={curriculumId} />
              {[...selected].map((id) => (
                <input key={id} type="hidden" name="subjectId" value={id} />
              ))}
              <ConfirmButton
                size="sm"
                title={`Delete ${plural(selected.size, "subject")}?`}
                confirmLabel="Delete subjects"
                description={
                  <>
                    <p>{codes.join(", ")} will be removed from this version, with their own requirements.</p>
                    {lost.length > 0 && (
                      <>
                        <p className="mt-2 font-medium text-red-800">Subjects you keep lose these requirements:</p>
                        <ul className="mt-1 list-disc pl-5">
                          {lost.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                        <p className="mt-2">You can add a different requirement to them afterwards.</p>
                      </>
                    )}
                  </>
                }
              >
                <Trash2 aria-hidden />
                Delete selected
              </ConfirmButton>
            </form>
          </div>
        </div>
      )}
    </SelectionContext.Provider>
  );
}

/** One subject's checkbox. */
export function SubjectCheckbox({ id, code }: { id: string; code: string }) {
  const { selected, toggle } = useSelection();
  return (
    <input
      type="checkbox"
      aria-label={`Select ${code}`}
      checked={selected.has(id)}
      onChange={(e) => toggle([id], e.target.checked)}
      className="size-4 accent-brand-700"
    />
  );
}

/** Ticks or clears every subject of one semester. */
export function SelectAllCheckbox({ ids, label }: { ids: string[]; label: string }) {
  const { selected, toggle } = useSelection();
  const ref = useRef<HTMLInputElement>(null);
  const count = ids.filter((id) => selected.has(id)).length;
  const all = ids.length > 0 && count === ids.length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = count > 0 && !all;
  }, [count, all]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={all}
      onChange={() => toggle(ids, !all)}
      className="size-4 accent-brand-700"
    />
  );
}
