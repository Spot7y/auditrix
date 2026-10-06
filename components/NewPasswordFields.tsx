"use client";

import { useState } from "react";
import PasswordInput from "./PasswordInput";
import PasswordChecklist from "./PasswordChecklist";
import { MIN_PASSWORD_LENGTH } from "../lib/domain/passwordPolicy";

/**
 * "New password" and "Confirm new password", posted as `newPassword` and
 * `confirmPassword`, with a checklist that ticks each rule as it's met.
 */
export default function NewPasswordFields({ sideBySide = false }: { sideBySide?: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  return (
    <div className="space-y-3">
      <div className={sideBySide ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
        <PasswordInput
          name="newPassword"
          label="New password"
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <PasswordInput
          name="confirmPassword"
          label="Confirm new password"
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          value={confirmation}
          onChange={setConfirmation}
        />
      </div>
      <PasswordChecklist password={password} confirmation={confirmation} />
    </div>
  );
}
