import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

export type Tone = "success" | "error" | "warning" | "info";

const tones: Record<Tone, { box: string; icon: typeof Info }> = {
  success: { box: "border-green-200 bg-green-50 text-green-900", icon: CheckCircle2 },
  error: { box: "border-red-200 bg-red-50 text-red-900", icon: XCircle },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: AlertTriangle },
  info: { box: "border-blue-200 bg-blue-50 text-blue-900", icon: Info },
};

export default function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${box} ${className ?? ""}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}
