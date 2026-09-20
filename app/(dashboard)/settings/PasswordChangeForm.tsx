"use client";

import PasswordInput from "../../../components/PasswordInput";
import { updatePassword } from "./action";

export default function PasswordChangeForm() {
  return (
    <form action={updatePassword} className="mt-4 space-y-4">
      <PasswordInput name="currentPassword" label="Current Password" minLength={6} />
      <PasswordInput name="newPassword" label="New Password" minLength={6} />
      <PasswordInput name="confirmPassword" label="Confirm New Password" minLength={6} />
      <button type="submit" className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
        Update Password
      </button>
    </form>
  );
}