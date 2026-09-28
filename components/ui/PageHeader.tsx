import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export default function PageHeader({
  title,
  description,
  eyebrow,
  back,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-700"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 font-mono text-sm text-ink-500">{eyebrow}</p>}
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-[1.75rem]">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
