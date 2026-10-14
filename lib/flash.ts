import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FLASH_COOKIE_NAME } from "./flashCookie";

/**
 * Results of an action ("Saved 3 grades…") travel in this short-lived cookie,
 * set by the server, instead of in the page address. The address only gets a
 * random `flash` id that must match the cookie, so a link someone sends can't
 * put its own words on screen as an Auditrix message.
 */
export const FLASH_COOKIE = FLASH_COOKIE_NAME;

export interface Flash {
  id: string;
  success?: string;
  error?: string;
}

/**
 * Redirects to `url` (in a server action), showing its `?success=` and
 * `?error=` texts as a notification. Those two are taken out of the address.
 */
export async function flashRedirect(url: string): Promise<never> {
  const target = new URL(url, "http://auditrix.local");
  const success = target.searchParams.get("success") ?? undefined;
  const error = target.searchParams.get("error") ?? undefined;
  target.searchParams.delete("success");
  target.searchParams.delete("error");

  if (success || error) {
    const flash: Flash = { id: randomUUID().slice(0, 8), success, error };
    (await cookies()).set(FLASH_COOKIE, JSON.stringify(flash), {
      path: "/",
      maxAge: 60,
      sameSite: "lax",
      // Read (and then removed) by the notification area in the browser.
      // Next URL-encodes the value itself.
      httpOnly: false,
    });
    target.searchParams.set("flash", flash.id);
  }
  redirect(target.pathname + (target.search || ""));
}
