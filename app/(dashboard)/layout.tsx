import { Suspense } from "react";
import { redirect } from "next/navigation";
import AppShell from "../../components/AppShell";
import Toaster from "../../components/ui/Toaster";
import { getCurrentStaff } from "../../lib/queries/staff";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  // A signed-in account without a staff record (e.g. a replaced chairperson)
  // must be signed out: redirecting to /login alone would bounce straight
  // back here, since the proxy sends signed-in users away from /login.
  if (!staff) redirect("/auth/no-access");
  if (staff.mustChangePassword) redirect("/change-password");

  return (
    <AppShell staff={staff}>
      {children}
      <Suspense>
        <Toaster />
      </Suspense>
    </AppShell>
  );
}
