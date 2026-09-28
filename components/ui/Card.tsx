import type { ComponentProps, ReactNode } from "react";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={`rounded-xl border border-line bg-white shadow-card ${className ?? ""}`} {...props} />;
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={`px-5 py-5 ${className ?? ""}`} {...props} />;
}
