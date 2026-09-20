"use client";

import { useState } from "react";
import { addRequirement } from "../actions";

export default function AddRequirementForm({ subjectId }: { subjectId: string }) {
  const [type, setType] = useState("PREREQUISITE");

  return (
    <form action={addRequirement} className="mt-4 flex flex-wrap items-end gap-3">
      <input type="hidden" name="subjectId" value={subjectId} />
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Type</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 border border-[color:var(--ledger-line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
        >
          <option value="PREREQUISITE">Prerequisite</option>
          <option value="COREQUISITE">Corequisite</option>
          <option value="YEAR_STANDING">Year Standing</option>
          <option value="COMPLETION">Completion (All Subjects)</option>
        </select>
      </div>

      {(type === "PREREQUISITE" || type === "COREQUISITE") && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
            Required Subject Code
          </label>
          <input
            type="text"
            name="requiredSubjectCode"
            placeholder="e.g. CC 101"
            required
            className="mt-1 border border-[color:var(--ledger-line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
      )}

      {type === "YEAR_STANDING" && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
            Required Year Level
          </label>
          <select
            name="requiredYearLevel"
            required
            className="mt-1 border border-[color:var(--ledger-line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          >
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>
      )}

      <button
        type="submit"
        className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Add Requirement
      </button>
    </form>
  );
}