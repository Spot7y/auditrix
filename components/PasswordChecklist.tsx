import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES } from "../lib/domain/passwordPolicy";

/**
 * The password rules, each ticked green as soon as the typed password meets
 * it. With `confirmation`, also whether the two passwords match.
 */
export default function PasswordChecklist({ password, confirmation }: { password: string; confirmation?: string }) {
  const items = PASSWORD_RULES.map((rule) => ({ label: rule.label, met: rule.test(password) }));
  if (confirmation !== undefined) {
    items.push({ label: "Passwords match", met: password.length > 0 && password === confirmation });
  }

  return (
    <ul className="space-y-1 text-sm" aria-live="polite">
      {items.map(({ label, met }) => (
        <li key={label} className={`flex items-center gap-2 ${met ? "text-status-completed" : "text-ink-500"}`}>
          {met ? (
            <span className="flex size-4 items-center justify-center rounded-full bg-status-completed text-white">
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </span>
          ) : (
            <Circle className="size-4 text-ink-300" aria-hidden />
          )}
          {label}
          <span className="sr-only">{met ? " — done" : " — not yet"}</span>
        </li>
      ))}
    </ul>
  );
}
