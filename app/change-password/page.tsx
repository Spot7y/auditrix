import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getCurrentStaff } from "../../lib/queries/staff";
import { MIN_PASSWORD_LENGTH } from "../../lib/domain/passwordPolicy";
import { logout } from "../login/actions";
import { setFirstPassword } from "./actions";
import AuthLayout from "../../components/AuthLayout";
import PasswordInput from "../../components/PasswordInput";
import Alert from "../../components/ui/Alert";
import SubmitButton from "../../components/ui/SubmitButton";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const staff = await getCurrentStaff();
  if (!staff) redirect("/auth/no-access");
  if (!staff.mustChangePassword) redirect("/home");

  return (
    <AuthLayout>
      <div className="mb-5 flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <KeyRound className="size-5" aria-hidden />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Choose your own password</h1>
      <p className="mt-1 text-sm text-ink-500">
        Welcome, {staff.name}. Your account was set up by your dean, so please replace the temporary password before
        continuing.
      </p>

      {error && (
        <Alert tone="error" className="mt-6">
          {error}
        </Alert>
      )}

      <form action={setFirstPassword} className="mt-6 space-y-4">
        <PasswordInput
          name="newPassword"
          label="New password"
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters, with letters and numbers.`}
        />
        <PasswordInput
          name="confirmPassword"
          label="Confirm new password"
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
        />
        <SubmitButton block pendingLabel="Saving…">
          Save password and continue
        </SubmitButton>
      </form>

      <form action={logout} className="mt-4 text-center">
        <button type="submit" className="text-sm font-medium text-ink-500 hover:text-ink-800">
          Log out instead
        </button>
      </form>
    </AuthLayout>
  );
}
