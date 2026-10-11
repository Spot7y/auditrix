import type { Metadata } from "next";
import { login } from "./actions";
import AuthLayout from "../../components/AuthLayout";
import PasswordInput from "../../components/PasswordInput";
import Alert from "../../components/ui/Alert";
import { Field, Input } from "../../components/ui/Field";
import SubmitButton from "../../components/ui/SubmitButton";

export const metadata: Metadata = { title: "Log in" };

// The only messages this page shows: links can pass a code, never the text.
const ERRORS: Record<string, string> = {
  credentials: "Incorrect email or password.",
  "too-many": "Too many login attempts. Wait a few minutes, then try again.",
};
const NOTICES: Record<string, string> = {
  idle: "You were signed out after 30 minutes without activity. Log in again to continue.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; reason?: string }> }) {
  const params = await searchParams;
  const error = ERRORS[params.error ?? ""];
  const notice = NOTICES[params.reason ?? ""];

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-500">Log in with your KSU staff account.</p>

      {error && (
        <Alert tone="error" className="mt-6">
          {error}
        </Alert>
      )}
      {notice && !error && (
        <Alert tone="info" className="mt-6">
          {notice}
        </Alert>
      )}

      <form action={login} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@ksu.edu.ph" required />
        </Field>
        <PasswordInput name="password" label="Password" autoComplete="current-password" />
        <SubmitButton block pendingLabel="Logging in…">
          Log in
        </SubmitButton>
      </form>

      <p className="mt-8 text-center text-xs text-ink-400">
        Staff accounts are created by the college dean.
      </p>
    </AuthLayout>
  );
}
