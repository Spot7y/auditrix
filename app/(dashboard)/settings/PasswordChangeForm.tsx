"use client";

import PasswordInput from "../../../components/PasswordInput";
import { CardBody } from "../../../components/ui/Card";
import SubmitButton from "../../../components/ui/SubmitButton";
import NewPasswordFields from "../../../components/NewPasswordFields";
import { updatePassword } from "./action";

export default function PasswordChangeForm() {
  return (
    <form action={updatePassword}>
      <CardBody className="space-y-4">
        <PasswordInput name="currentPassword" label="Current password" autoComplete="current-password" />
        <NewPasswordFields sideBySide />
      </CardBody>
      <div className="flex justify-end rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
        <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
      </div>
    </form>
  );
}
