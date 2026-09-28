"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { inputClasses } from "../../../components/ui/Field";

/** Filters the student list as you type by updating ?q= in the URL. */
export default function StudentFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (value.trim() === current) return;
    const timeout = setTimeout(() => {
      startTransition(() => {
        router.replace(value.trim() ? `${pathname}?q=${encodeURIComponent(value.trim())}` : pathname, { scroll: false });
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [value, params, pathname, router]);

  return (
    <div className="relative w-full sm:max-w-sm">
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
  );
}
