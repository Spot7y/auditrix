import { Suspense } from "react";
import { redirect } from "next/navigation";
import AppShell from "../../components/AppShell";
import Toaster from "../../components/ui/Toaster";
import { getCurrentStaff } from "../../lib/queries/staff";
import { getCurrentTerm } from "../../lib/queries/yearLevels";
import { countActiveStudents } from "../../lib/queries/students";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  // A signed-in account without a staff record (e.g. a replaced chairperson)
  // must be signed out: redirecting to /login alone would bounce straight
  // back here, since the proxy sends signed-in users away from /login.
  if (!staff) redirect("/auth/no-access");
  if (staff.mustChangePassword) redirect("/change-password");

  const [term, activeStudents] = await Promise.all([
    getCurrentTerm(),
    staff.role === "chairperson" ? countActiveStudents() : null,
  ]);
  const badges: Record<string, number> = activeStudents === null ? {} : { "/students": activeStudents };

  return (
    <AppShell staff={staff} term={term?.term ?? null} badges={badges}>
      {children}
      <Suspense>
        <Toaster />
      </Suspense>
    </AppShell>
  );
}
