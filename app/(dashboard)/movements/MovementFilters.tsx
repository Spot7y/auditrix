"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { inputClasses, Select } from "../../../components/ui/Field";

const TYPES = [
  ["", "All movements"],
  ["SHIFTED_IN", "Shifted in"],
  ["SHIFTED_OUT", "Shifted out"],
  ["TRANSFERRED_IN", "Transferred in"],
  ["TRANSFERRED_OUT", "Transferred out"],
  ["DROPPED", "Dropped"],
  ["REOPENED", "Record reopened"],
] as const;

/** Filters for the movements list, kept in the URL like the student list's. */
export default function MovementFilters({ programs, years }: { programs: string[]; years: number[] }) {
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
    if (value.trim() === (params.get("q") ?? "")) return;
    const timeout = setTimeout(() => go({ q: value.trim() }), 300);
    return () => clearTimeout(timeout);
    // `go` changes with `params`, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, params]);

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64 sm:shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Filter by student…"
          aria-label="Filter movements by student ID or name"
          className={`${inputClasses} pl-9 pr-9`}
        />
        {pending && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-400" aria-hidden />}
      </div>
      <div className="w-48 shrink-0">
        <Select aria-label="Movement" value={params.get("type") ?? ""} onChange={(e) => go({ type: e.target.value })}>
          {TYPES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      {programs.length > 1 && (
        <div className="w-40 shrink-0">
          <Select aria-label="Program" value={params.get("program") ?? ""} onChange={(e) => go({ program: e.target.value })}>
            <option value="">All programs</option>
            {programs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
      )}
      {years.length > 1 && (
        <div className="w-32 shrink-0">
          <Select aria-label="Year recorded" value={params.get("year") ?? ""} onChange={(e) => go({ year: e.target.value })}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
