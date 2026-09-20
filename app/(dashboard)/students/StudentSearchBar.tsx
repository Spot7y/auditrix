"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { liveSearchStudents } from "./searchAction";

interface Result {
  id: string;
  name: string;
  program: string;
}

export default function StudentSearchBar({ placeholder = "Search by ID or name…" }: { placeholder?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
    }
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!trimmed) return;

    timeoutRef.current = setTimeout(async () => {
      const matches = await liveSearchStudents(trimmed);
      setResults(matches);
      setOpen(true);
    }, 250);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
      />
            {open && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-10 mt-1 w-full border border-[color:var(--ledger-line)] bg-white shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[color:var(--ink)]/50">No matches</p>
          ) : (
            results.map((r) => (
              <Link
                key={r.id}
                href={`/students/${r.id}`}
                className="flex items-center justify-between px-4 py-2 text-sm hover:bg-black/5"
              >
                <span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--ink)]/60">{r.id}</span>
                  <span className="ml-2 font-medium">{r.name}</span>
                </span>
                <span className="text-xs text-[color:var(--ink)]/50">{r.program}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}