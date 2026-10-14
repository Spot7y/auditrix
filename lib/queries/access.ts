import { redirect } from "next/navigation";
import { noticeUrl } from "../notices";
import { getCurrentStaff, type CurrentStaff } from "./staff";

/**
 * The signed-in staff member, when their role may open this page. Anyone
 * else is sent back to their own dashboard, so typing or pasting another
 * role's address (e.g. a dean's page in a chairperson's browser) doesn't
 * open it. Called at the top of every page rather than in a layout, since
 * layouts aren't re-run on every navigation; server actions and row-level
 * security check permissions again on their own.
 */
export async function requireRole(...roles: CurrentStaff["role"][]): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/auth/no-access");
  if (!roles.includes(staff.role)) {
    redirect(noticeUrl("/home", "page-unavailable"));
  }
  return staff;
}
