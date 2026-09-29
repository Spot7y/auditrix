"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { promoteStudents } from "./actions";
import type { PromotionCandidate } from "../../../../lib/queries/yearLevels";
import { MAX_YEAR_LEVEL, type PromotionSkipReason } from "../../../../lib/domain/yearLevels";
import { plural } from "../../../../lib/format";
import { Card, CardHeader, CardBody } from "../../../../components/ui/Card";
import { Hint, Label, Select } from "../../../../components/ui/Field";
import TermFields from "../../../../components/ui/TermFields";
import { Table, Td, Th, Tr } from "../../../../components/ui/Table";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import ConfirmButton from "../../../../components/ui/ConfirmButton";

const YEAR_LABEL: Record<number, string> = { 1: "1st year", 2: "2nd year", 3: "3rd year", 4: "4th year" };

const SKIP_LABEL: Record<PromotionSkipReason, string> = {
  SENIOR: "4th year",
  DROPPED: "Dropped",
  TRANSFERRED_OUT: "Transferred out",
};

export default function PromoteForm({
  candidates,
  defaultTerm,
  currentTermLabel,
}: {
  candidates: PromotionCandidate[];
  defaultTerm: string;
  currentTermLabel: string;
}) {
  const [defaultYear, defaultSemester] = defaultTerm.split("-");
  const [termYear, setTermYear] = useState(defaultYear);
  const [termSemester, setTermSemester] = useState(defaultSemester);
  const [yearFilter, setYearFilter] = useState("");
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(candidates.filter((c) => c.skipReason === null).map((c) => c.id))
  );

  const shown = useMemo(
    () => (yearFilter ? candidates.filter((c) => c.yearLevel === Number(yearFilter)) : candidates),
    [candidates, yearFilter]
  );
  const promotable = (c: PromotionCandidate) => c.yearLevel < MAX_YEAR_LEVEL;
  const selected = candidates.filter((c) => checked.has(c.id));
  const term = `${termYear.padStart(2, "0")}-${termSemester}`;

  const toggle = (id: string, on: boolean) =>
    setChecked((all) => {
      const next = new Set(all);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const setShown = (on: boolean, onlyEligible: boolean) =>
    setChecked((all) => {
      const next = new Set(all);
      for (const c of shown) {
        if (!on) next.delete(c.id);
        else if (promotable(c) && (!onlyEligible || c.skipReason === null)) next.add(c.id);
      }
      return next;
    });

  const byLevel = [1, 2, 3].map((level) => selected.filter((c) => c.yearLevel === level).length);

  return (
    <form action={promoteStudents} className="space-y-6">
      {/* Every checked student, including ones hidden by the year level filter. */}
      {selected.map((c) => (
        <input key={c.id} type="hidden" name="studentId" value={c.id} />
      ))}
      <Card>
        <CardHeader title="1. New year levels start from" description={`The current semester is ${currentTermLabel}.`} />
        <CardBody>
          <Label htmlFor="termYear">School year and semester</Label>
          <TermFields
            year={termYear}
            semester={termSemester}
            onYearChange={(e) => setTermYear(e.target.value)}
            onSemesterChange={(e) => setTermSemester(e.target.value)}
          />
          <Hint>Usually the first semester of the new school year.</Hint>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="2. Students to promote"
          description={`${plural(selected.length, "student")} selected`}
          actions={
            <>
              <Select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="h-9 w-36"
                aria-label="Show year level"
              >
                <option value="">All year levels</option>
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>
                    {YEAR_LABEL[y]}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShown(true, true)}>
                Check all
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShown(false, false)}>
                Uncheck all
              </Button>
            </>
          }
        />
        <Table className="table-fixed">
          <colgroup>
            <col className="w-12" />
            <col className="w-32" />
            <col />
            <col className="w-44" />
          </colgroup>
          <thead>
            <tr>
              <Th>
                <span className="sr-only">Promote</span>
              </Th>
              <Th>ID number</Th>
              <Th>Name</Th>
              <Th>Year level</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => {
              const on = checked.has(c.id);
              return (
                <Tr key={c.id} className={on ? "bg-brand-50/50" : ""}>
                  <Td>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!promotable(c)}
                      onChange={(e) => toggle(c.id, e.target.checked)}
                      aria-label={`Promote ${c.name}`}
                      className="size-4 accent-brand-600"
                    />
                  </Td>
                  <Td className="font-mono text-ink-600">{c.id}</Td>
                  <Td className="text-ink-900">
                    {c.name}
                    {c.skipReason && c.skipReason !== "SENIOR" && (
                      <span className="ml-2">
                        <Badge tone="gray">{SKIP_LABEL[c.skipReason]}</Badge>
                      </span>
                    )}
                  </Td>
                  <Td className="text-ink-600">
                    {on ? (
                      <span>
                        {YEAR_LABEL[c.yearLevel]} → <span className="font-medium text-brand-800">{YEAR_LABEL[c.yearLevel + 1]}</span>
                      </span>
                    ) : (
                      YEAR_LABEL[c.yearLevel] ?? `Year ${c.yearLevel}`
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/students" className="text-sm font-medium text-ink-500 hover:text-ink-800">
          Cancel
        </Link>
        {selected.length === 0 ? (
          <Button type="button" disabled>
            Promote students
          </Button>
        ) : (
          <ConfirmButton
            tone="primary"
            title={`Promote ${plural(selected.length, "student")} from ${term}?`}
            confirmLabel="Promote"
            description={
              <>
                <p>
                  {byLevel
                    .map((count, i) => (count > 0 ? `${count} to ${YEAR_LABEL[i + 2]}` : null))
                    .filter(Boolean)
                    .join(", ")}
                  .
                </p>
                <p className="mt-2">
                  Each student’s year level history records the change from {term}. A single student can be corrected later
                  from their Edit page.
                </p>
              </>
            }
          >
            Promote {plural(selected.length, "student")}
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}
