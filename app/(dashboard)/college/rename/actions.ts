"use server";

import { revalidatePath } from "next/cache";
import { flashRedirect } from "../../../../lib/flash";
import { createAdminClient } from "../../../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { userMessage } from "../../../../lib/userMessage";
import { collegeShortNameProblem, nameProblem, normalizeName } from "../../../../lib/domain/names";

/** The dean renames their own college; the rename is recorded in its history. */
export async function renameCollege(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "dean" || !staff.collegeId) {
    return { error: "Only a dean can rename their college." };
  }

  const name = normalizeName(String(formData.get("collegeName") ?? ""));
  const shortName = normalizeName(String(formData.get("shortName") ?? "")).toUpperCase();
  const badName = nameProblem(name);
  if (badName) return { error: badName === "Enter a name." ? "Enter the college’s name." : badName };
  const badShortName = collegeShortNameProblem(shortName);
  if (badShortName) return { error: badShortName };

  // Checks that the user is still a dean, refuses a name another college has,
  // renames and records it, in one transaction.
  const { error } = await createAdminClient().rpc("rename_college", {
    p_dean_id: staff.id,
    p_name: name,
    p_short_name: shortName,
  });
  if (error) return { error: userMessage(error) };

  revalidatePath("/", "layout");
  return flashRedirect(`/college/rename?success=${encodeURIComponent(`The college is now ${name} (${shortName}).`)}`);
}
