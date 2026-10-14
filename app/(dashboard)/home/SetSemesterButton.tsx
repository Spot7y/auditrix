"use client";

import { useEffect, useRef, useState } from "react";
import ConfirmButton from "../../../components/ui/ConfirmButton";
import { compareTerms, describeTerm, isValidTerm } from "../../../lib/domain/Term";

/**
 * The Set semester button. Its confirmation reads the semester typed in the
 * same form, and warns when it's earlier than the current one: moving back
 * changes every student's year level and regular/irregular status.
 */
export default function SetSemesterButton({ currentTerm, collegeName }: { currentTerm: string | null; collegeName: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [entered, setEntered] = useState("");

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const read = () => {
      const data = new FormData(form);
      const year = String(data.get("termYear") ?? "").trim();
      const semester = String(data.get("termSemester") ?? "").trim();
      setEntered(/^\d{1,2}$/.test(year) && semester ? `${year.padStart(2, "0")}-${semester}` : "");
    };
    read();
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("change", read);
    };
  }, []);

  const backwards = isValidTerm(entered) && isValidTerm(currentTerm) && compareTerms(entered, currentTerm) < 0;
  const description = (
    <>
      <p>
        This applies to every program in {collegeName}. New grades default to this semester, and students’ year levels
        count the subjects passed before it, so moving to a new school year moves students up.
      </p>
      {backwards && (
        <p className="mt-2 font-medium text-red-800">
          {entered} ({describeTerm(entered)}) is earlier than the current semester, {currentTerm}. Moving back changes
          every student’s year level and regular/irregular status. Continue only if the current semester was set ahead
          by mistake.
        </p>
      )}
    </>
  );

  return (
    <span ref={ref} className="contents">
      <ConfirmButton
        tone={backwards ? "danger" : "primary"}
        title={isValidTerm(entered) ? `Set the current semester to ${entered}?` : "Change the current semester?"}
        description={description}
        confirmLabel={backwards ? "Move back" : "Set semester"}
      >
        Set semester
      </ConfirmButton>
    </span>
  );
}
