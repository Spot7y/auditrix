"use client";

import PasswordInput from "../../../components/PasswordInput";
import { CardBody } from "../../../components/ui/Card";
import SubmitButton from "../../../components/ui/SubmitButton";
import { MIN_PASSWORD_LENGTH } from "../../../lib/domain/passwordPolicy";
import { updatePassword } from "./action";

export default function PasswordChangeForm() {
  return (
    <form action={updatePassword}>
      <CardBody className="space-y-4">
        <PasswordInput name="currentPassword" label="Current password" autoComplete="current-password" />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput
            name="newPassword"
            label="New password"
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD_LENGTH} characters, with letters and numbers.`}
          />
          <PasswordInput name="confirmPassword" label="Confirm new password" minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
        </div>
      </CardBody>
      <div className="flex justify-end rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
        <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
      </div>
    </form>
  );
}
