"use client";

import { useEffect, useRef, useState } from "react";
import { createCurriculumVersion } from "./actions";

const thisYear = new Date().getFullYear();
const minYear = 2000;
const maxYear = thisYear + 10;

export default function NewVersionForm() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer border border-dashed border-[color:var(--ledger-line)] px-3 py-1.5 text-sm text-[color:var(--ink)]/60 hover:bg-black/5"
      >
        + New Version
      </button>
      {open && (
        <form
          action={createCurriculumVersion}
          className="absolute z-10 mt-2 flex items-center gap-2 border border-[color:var(--ledger-line)] bg-white p-3 shadow-lg"
        >
          <input
            type="number"
            name="effectiveYear"
            required
            min={minYear}
            max={maxYear}
            placeholder="e.g. 2026"
            className="w-28 border border-[color:var(--ledger-line)] px-2 py-1 text-sm [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="submit"
            className="bg-[color:var(--accent-maroon)] px-3 py-1 text-sm font-medium text-white hover:opacity-90"
          >
            Create
          </button>
        </form>
      )}
    </div>
  );
}