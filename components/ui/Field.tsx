import type { ComponentProps, ReactNode } from "react";

const control =
  "block w-full rounded-lg border border-line bg-white px-3 text-sm text-ink-900 shadow-sm placeholder:text-ink-400 " +
  "focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 disabled:bg-ink-50 disabled:text-ink-500 " +
  "aria-invalid:border-status-violation";

export const inputClasses = `${control} h-10`;

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={`mb-1.5 block text-sm font-medium text-ink-800 ${className ?? ""}`} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={`${inputClasses} ${className ?? ""}`} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={`${control} h-10 pr-8 ${className ?? ""}`} {...props} />;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs text-ink-500">{children}</p>;
}

/** Label + control + optional hint, with the label tied to the control by id. */
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}
