"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { inputClasses } from "./ui/Field";
import { liveSearchStudents } from "../app/(dashboard)/students/searchAction";

interface Result {
  id: string;
  name: string;
  program: string;
}

/**
 * Search-as-you-type with a dropdown of matches; arrow keys and Enter work.
 * With `shortcut`, Ctrl+K (⌘K on a Mac) jumps to it from anywhere.
 */
export default function StudentSearchBar({
  placeholder = "Search by ID or name…",
  shortcut = false,
}: {
  placeholder?: string;
  shortcut?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const request = ++latest.current;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const matches = await liveSearchStudents(trimmed);
        if (request === latest.current) {
          setResults(matches);
          setHighlighted(0);
          setOpen(true);
        }
      } finally {
        if (request === latest.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!shortcut) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  function go(result: Result | undefined) {
    if (!result) return;
    setOpen(false);
    router.push(`/students/${result.id}`);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Search students"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!e.target.value.trim()) {
            setResults([]);
            setOpen(false);
          }
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(results[highlighted]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        aria-keyshortcuts={shortcut ? "Control+K" : undefined}
        className={`${inputClasses} pl-9 ${shortcut ? "pr-16" : "pr-9"}`}
      />
      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-400" aria-hidden />
      ) : (
        shortcut &&
        !query && (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-ink-50 px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-500 sm:block">
            Ctrl K
          </kbd>
        )
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-20 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-overlay"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-500">No students match “{query.trim()}”.</li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.id}
                role="option"
                aria-selected={i === highlighted}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => go(r)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                  i === highlighted ? "bg-brand-50" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink-900">{r.name}</span>
                  <span className="font-mono text-xs text-ink-500">{r.id}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-500">{r.program}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
