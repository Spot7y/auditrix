import type { ReactNode } from "react";
import type { AuditStatus } from "../../lib/domain/AuditResult";

export type BadgeTone = "green" | "blue" | "amber" | "gray" | "red" | "brand";

const tones: Record<BadgeTone, string> = {
  green: "bg-green-50 text-green-800 ring-green-600/20",
  blue: "bg-blue-50 text-blue-800 ring-blue-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  gray: "bg-ink-100 text-ink-700 ring-ink-500/20",
  red: "bg-red-50 text-red-800 ring-red-600/20",
  brand: "bg-brand-50 text-brand-800 ring-brand-600/20",
};

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

const statusTone: Record<AuditStatus, BadgeTone> = {
  COMPLETED: "green",
  AVAILABLE: "blue",
  PENDING: "amber",
  UNAVAILABLE: "gray",
  VIOLATION: "red",
};

const statusLabel: Record<AuditStatus, string> = {
  COMPLETED: "Completed",
  AVAILABLE: "Available",
  PENDING: "Pending",
  UNAVAILABLE: "Unavailable",
  VIOLATION: "Violation",
};

export function StatusBadge({ status }: { status: AuditStatus }) {
  return <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>;
}
