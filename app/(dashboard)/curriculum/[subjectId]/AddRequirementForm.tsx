"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { addRequirement } from "../actions";
import { Field, Input, Select } from "../../../../components/ui/Field";
import SubmitButton from "../../../../components/ui/SubmitButton";

export default function AddRequirementForm({ subjectId, codes }: { subjectId: string; codes: string[] }) {
  const [type, setType] = useState("PREREQUISITE");
  const listId = useId();

  return (
    <form action={addRequirement} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="subjectId" value={subjectId} />
      <Field label="Add requirement" htmlFor="type" className="w-full sm:w-52">
        <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="PREREQUISITE">Prerequisite</option>
          <option value="COREQUISITE">Corequisite</option>
          <option value="YEAR_STANDING">Year standing</option>
          <option value="COMPLETION">All subjects completed</option>
        </Select>
      </Field>

      {(type === "PREREQUISITE" || type === "COREQUISITE") && (
        <Field label="Subject code" htmlFor="requiredSubjectCode" className="w-full sm:w-44">
          <Input id="requiredSubjectCode" name="requiredSubjectCode" list={listId} placeholder="CC 101" required className="font-mono" />
          <datalist id={listId}>
            {codes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      )}

      {type === "YEAR_STANDING" && (
        <Field label="Year level" htmlFor="requiredYearLevel" className="w-full sm:w-40">
          <Select id="requiredYearLevel" name="requiredYearLevel" required>
            <option value="2">2nd year</option>
            <option value="3">3rd year</option>
            <option value="4">4th year</option>
          </Select>
        </Field>
      )}

      <SubmitButton variant="secondary" pendingLabel="Adding…">
        <Plus aria-hidden />
        Add
      </SubmitButton>
    </form>
  );
}
