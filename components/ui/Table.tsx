import type { ComponentProps } from "react";

/** Scrolls sideways on small screens instead of squashing columns. */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="-mx-px overflow-x-auto">
      <table className={`w-full border-collapse text-left text-sm ${className ?? ""}`} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={`border-b border-line bg-ink-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-500 first:pl-5 last:pr-5 ${className ?? ""}`}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={`border-b border-line px-4 py-3 align-top first:pl-5 last:pr-5 ${className ?? ""}`} {...props} />;
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={`transition-colors hover:bg-ink-50/60 ${className ?? ""}`} {...props} />;
}
