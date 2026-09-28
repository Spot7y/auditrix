"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { Hint, Label, inputClasses } from "./ui/Field";

export default function PasswordInput({
  name,
  label,
  required = true,
  minLength,
  autoComplete,
  hint,
}: {
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          name={name}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className={`${inputClasses} pr-10`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-ink-400 hover:text-ink-700"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}
