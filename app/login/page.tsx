import { login } from "./actions";
import PasswordInput from "../../components/PasswordInput";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Auditrix</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">KSU-CEIT Curriculum Audit System</p>

      <form action={login} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
        
                <PasswordInput name="password" label="Password" />

        {error && <p className="text-sm text-[color:var(--status-violated)]">{error}</p>}
        <button
          type="submit"
          className="w-full bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Log in
        </button>
      </form>
    </main>
  );
}