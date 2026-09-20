import { getCurrentStaff } from "../../../lib/queries/staff";
import { updateName, updatePassword } from "./action";
import PasswordChangeForm from "./PasswordChangeForm";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const staff = await getCurrentStaff();

  return (
    <main className="max-w-lg px-8 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Account Settings</h1>
      {error && <p className="mt-4 text-sm text-[color:var(--status-violated)]">{error}</p>}
      {success && <p className="mt-4 text-sm text-[color:var(--status-completed)]">{success}</p>}

      <section className="mt-10 border-t border-[color:var(--ledger-line)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Name</h2>
        <form action={updateName} className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Full Name</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={staff?.name}
              className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
            />
          </div>
          <button type="submit" className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Save
          </button>
        </form>
      </section>

      <section className="mt-10 border-t border-[color:var(--ledger-line)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Change Password</h2>
                <PasswordChangeForm />
      </section>
    </main>
  );
}