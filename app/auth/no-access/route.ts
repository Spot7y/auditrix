import { NextResponse } from "next/server";
import { createServerClientForUser } from "../../../lib/domain/supabase/serverClient";

// Signs out an account that is logged in but has no staff record, then shows
// the login page with an explanation.
export async function GET(request: Request) {
  const supabase = await createServerClientForUser();
  await supabase.auth.signOut();

  const url = new URL("/login", request.url);
  url.searchParams.set("error", "This account doesn't have access to Auditrix. Contact your dean if you think this is a mistake.");
  return NextResponse.redirect(url);
}
