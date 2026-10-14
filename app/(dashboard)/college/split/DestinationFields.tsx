"use client";

import { useState } from "react";
import { Field, Input, Select } from "../../../../components/ui/Field";
import type { EmptyCollege } from "../../../../lib/queries/college";

/**
 * Where the programs go: a college that exists but has no programs or dean
 * yet, or a new college (name and short name).
 */
export default function DestinationFields({ emptyColleges }: { emptyColleges: EmptyCollege[] }) {
  const [destination, setDestination] = useState(emptyColleges.length > 0 ? "" : "new");

  return (
    <div className="space-y-4">
      {emptyColleges.length > 0 && (
        <Field
          label="College"
          htmlFor="existingCollege"
          hint="Colleges listed here are already in Auditrix but have no programs and no dean yet."
        >
          <Select
            id="existingCollege"
            name="existingCollege"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="" disabled>
              Select…
            </option>
            {emptyColleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shortName} — {c.name}
              </option>
            ))}
            <option value="new">A new college…</option>
          </Select>
        </Field>
      )}
      {destination === "new" && (
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field label="Name" htmlFor="collegeName">
            <Input
              id="collegeName"
              name="collegeName"
              required
              autoComplete="off"
              placeholder="College of Information Technology and Mathematics"
            />
          </Field>
          <Field label="Short name" htmlFor="shortName">
            <Input id="shortName" name="shortName" required autoComplete="off" placeholder="CITM" className="uppercase" />
          </Field>
        </div>
      )}
    </div>
  );
}
