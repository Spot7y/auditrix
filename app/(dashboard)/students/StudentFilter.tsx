"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { inputClasses, Select } from "../../../components/ui/Field";

const STATUS_OPTIONS = [
  ["", "All statuses"],
  ["REGULAR", "Regular"],
  ["IRREGULAR", "Irregular"],
  ["NOT_DETERMINED", "Not determined"],
  ["VIOLATIONS", "With violations"],
  ["CLOSED", "Dropped or transferred out"],
] as const;

/**
 * Filters the student list by updating the URL: ?q= as you type, and the
 * year level, curriculum version and status from their dropdowns.
 */
export default function StudentFilter({ curriculumYears }: { curriculumYears: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  const go = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, val] of Object.entries(changes)) {
      if (val) next.set(key, val);
      else next.delete(key);
    }
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (value.trim() === current) return;
    const timeout = setTimeout(() => go({ q: value.trim() }), 300);
    return () => clearTimeout(timeout);
    // `go` changes with `params`, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, params]);

  return (
    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
      <div className="relative w-full sm:w-64 sm:shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Filter by ID or name…"
          aria-label="Filter students by ID or name"
          className={`${inputClasses} pl-9 pr-9`}
        />
        {pending && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-400" aria-hidden />}
      </div>
      <div className="w-32 shrink-0">
        <Select aria-label="Year level" value={params.get("year") ?? ""} onChange={(e) => go({ year: e.target.value })}>
          <option value="">All years</option>
          <option value="1">1st year</option>
          <option value="2">2nd year</option>
          <option value="3">3rd year</option>
          <option value="4">4th year</option>
        </Select>
      </div>
      {curriculumYears.length > 1 && (
        <div className="w-40 shrink-0">
          <Select aria-label="Curriculum version" value={params.get("curriculum") ?? ""} onChange={(e) => go({ curriculum: e.target.value })}>
            <option value="">All curricula</option>
            {curriculumYears.map((y) => (
              <option key={y} value={y}>
                {y} curriculum
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="w-56 shrink-0">
        <Select aria-label="Status" value={params.get("status") ?? ""} onChange={(e) => go({ status: e.target.value })}>
          {STATUS_OPTIONS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
