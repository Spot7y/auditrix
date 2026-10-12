import type { ChangeEvent } from "react";
import { Input, Select } from "./Field";

/**
 * A term as two fields: the two-digit school year and the semester, posted
 * as `termYear` and `termSemester`. Pass `year`/`semester` with change
 * handlers to control them, or `defaultYear`/`defaultSemester` otherwise.
 */
export default function TermFields({
  id = "termYear",
  year,
  semester,
  defaultYear,
  defaultSemester,
  onYearChange,
  onSemesterChange,
  children,
}: {
  id?: string;
  year?: string;
  semester?: string;
  defaultYear?: string;
  defaultSemester?: string;
  onYearChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onSemesterChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  /** Shown after the fields, e.g. a submit button. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-24 shrink-0">
        <Input
          id={id}
          name="termYear"
          type="number"
          required
          min={0}
          max={99}
          placeholder="25"
          value={year}
          defaultValue={defaultYear}
          onChange={onYearChange}
          aria-label="School year, two digits"
        />
      </div>
      <span className="text-ink-400">–</span>
      <div className="w-44 shrink-0">
        <Select
          name="termSemester"
          required
          value={semester}
          defaultValue={defaultSemester}
          onChange={onSemesterChange}
          aria-label="Semester"
        >
          <option value="">Semester…</option>
          <option value="1">1 · First</option>
          <option value="2">2 · Second</option>
          {/* As on KSU records: 26-S is the midyear before 26-1. */}
          <option value="S">S · Midyear</option>
        </Select>
      </div>
      {children}
    </div>
  );
}
