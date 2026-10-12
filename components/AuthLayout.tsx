import { BookOpenCheck, ShieldCheck, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "./AppShell";

/** Split-screen frame for the signed-out pages: brand panel + form. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-800 p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-brand-600/40 blur-3xl"
        />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-brand-950/50 blur-3xl" />
        <div className="relative">
          <Brand onDark />
        </div>
        <div className="relative mt-auto max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Curriculum audits for every KSU college and program.
          </h2>
          <p className="mt-3 text-brand-100">
            Track every student’s progress against their curriculum and catch prerequisite problems before enrollment.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-brand-50">
            {[
              { icon: BookOpenCheck, text: "Live audit of completed, available and blocked subjects" },
              { icon: TriangleAlert, text: "Flags subjects taken before their prerequisites" },
              { icon: ShieldCheck, text: "Access limited to each program’s chairperson and the dean" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
