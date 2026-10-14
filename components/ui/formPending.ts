"use client";

import { createContext, useContext } from "react";
import { useFormStatus } from "react-dom";

/** Set by ActionForm while its action runs (it submits without React's form status). */
export const FormPendingContext = createContext(false);

/** Whether the surrounding form's action is running, for submit buttons. */
export function useFormPending(): boolean {
  const { pending } = useFormStatus();
  const actionFormPending = useContext(FormPendingContext);
  return pending || actionFormPending;
}
