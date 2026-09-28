import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="font-medium text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
