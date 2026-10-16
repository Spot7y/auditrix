import { History } from "lucide-react";
import { formatDateTime } from "../../../lib/format";
import type { CollegeHistoryEntry } from "../../../lib/queries/college";
import { Card, CardHeader } from "../../../components/ui/Card";
import EmptyState from "../../../components/ui/EmptyState";

/** Past deanship handovers, splits and renames of the dean's college. */
export default function CollegeHistory({ entries }: { entries: CollegeHistoryEntry[] }) {
  return (
    <Card className="mt-6">
      <CardHeader title="College history" description="Deanship handovers, splits and renames, newest first." />
      {entries.length === 0 ? (
        <EmptyState icon={History} title="Nothing recorded yet" description="Handovers, splits and renames will be listed here." />
      ) : (
        <ol className="divide-y divide-line">
          {entries.map((h) => (
            <li key={h.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <p className="text-sm text-ink-800">{h.summary}</p>
              <p className="shrink-0 text-xs text-ink-500">
                {h.recordedBy} · {formatDateTime(h.recordedAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
