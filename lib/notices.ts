/** Why a curriculum version with students can't be changed, and what to do instead. */
export const LOCKED_CURRICULUM_MESSAGE =
  "This curriculum version is locked because students are registered on it. To change the curriculum, create a new version.";

/**
 * Messages a page can show after sending someone elsewhere, by code
 * (`?notice=page-unavailable`). Pages can't set the flash cookie, and a code
 * outside this list shows nothing.
 */
export const NOTICES = {
  "page-unavailable": "That page isn’t available to your account.",
  "curriculum-locked": LOCKED_CURRICULUM_MESSAGE,
  "record-locked": "This record is locked. Reopen it to enter grades.",
  "record-locked-edit": "This record is locked. Reopen it to make changes.",
} as const;

export type NoticeCode = keyof typeof NOTICES;

export function noticeUrl(path: string, code: NoticeCode): string {
  return `${path}${path.includes("?") ? "&" : "?"}notice=${code}`;
}
