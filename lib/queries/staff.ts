import { cache } from "react";
import { createServerClientForUser } from "../domain/supabase/serverClient";

export interface CurrentStaff {
  id: string;
  name: string;
  role: "chairperson" | "dean" | "admin";
  program: string | null;
  collegeId: string | null;
  collegeName: string | null;
  mustChangePassword: boolean;
}

/** The signed-in staff member, looked up once per request. */
export const getCurrentStaff = cache(async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const supabase = await createServerClientForUser();
  // The token's signature is checked locally; whether the account still
  // counts is decided by its staff row below (removed on handover).
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return null;

  // "*" rather than a column list, so this keeps working on a database that
  // doesn't have the must_change_password column yet.
  const { data, error } = await supabase
    .from("staff")
    .select("*, colleges(name)")
    .eq("id", userId)
    .single();
  if (error) return null;

  const college = Array.isArray(data.colleges) ? data.colleges[0] : data.colleges;

  return {
    id: data.id,
    name: data.name,
    role: data.role,
    program: data.program,
    collegeId: data.college_id,
    collegeName: college?.name ?? null,
    mustChangePassword: data.must_change_password === true,
  };
});
