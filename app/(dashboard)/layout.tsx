import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "../../lib/queries/staff";
import { logout } from "../login/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  const roleLabel = staff.role === "chairperson" ? "Chairperson" : staff.role === "dean" ? "Dean" : "Admin";

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-[color:var(--ledger-line)] px-6 py-8">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[color:var(--accent-maroon)]">
          Auditrix
        </h1>
        <p className="mt-1 text-xs text-[color:var(--ink)]/60">KSU-CEIT</p>

        <nav className="mt-10 space-y-1">
          <Link href="/home" className="block px-3 py-2 text-sm hover:bg-black/5">
            Dashboard
          </Link>
                    {staff.role === "chairperson" && (
            <Link href="/students" className="block px-3 py-2 text-sm hover:bg-black/5">
              Search Students
            </Link>
          )}
          {staff.role === "chairperson" && (
            <Link href="/students/new" className="block px-3 py-2 text-sm hover:bg-black/5">
              Register New Student
            </Link>
          )}

                    {staff.role === "chairperson" && (
            <Link href="/students/shift-in" className="block px-3 py-2 text-sm hover:bg-black/5">
              Shift In a Student
            </Link>
          )}


          {staff.role === "chairperson" && (
            <Link href="/curriculum" className="block px-3 py-2 text-sm hover:bg-black/5">
              Manage Curriculum
            </Link>
          )}

                    {staff.role === "dean" && (
            <Link href="/programs/new" className="block px-3 py-2 text-sm hover:bg-black/5">
              Create New Course
            </Link>
          )}
        </nav>

          {staff.role === "dean" && (
            <Link href="/programs/reassign" className="block px-3 py-2 text-sm hover:bg-black/5">
              Reassign Chairperson
            </Link>
          )}

                    <Link href="/settings" className="block px-3 py-2 text-sm hover:bg-black/5">
            Account Settings
          </Link>

        <div className="mt-12 border-t border-[color:var(--ledger-line)] pt-4">
          <p className="text-sm font-medium">{staff.name}</p>
          <p className="text-xs text-[color:var(--ink)]/60">
            {roleLabel}{staff.program ? ` · ${staff.program}` : staff.collegeName ? ` · ${staff.collegeName}` : ""}
          </p>
                    <form action={logout} className="mt-3">
            <button
              type="submit"
              className="w-full bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1">{children}</div>
    </div>
  );
}