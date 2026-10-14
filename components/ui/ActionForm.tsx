"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import Alert from "./Alert";
import { FormPendingContext } from "./formPending";

/** What a form's server action returns when it can't go ahead (on success it redirects). */
export type FormResult = { error: string } | void | undefined | null;

/**
 * A form for a server action that keeps what was typed when the action fails:
 * the action returns `{ error }` instead of redirecting, the message shows at
 * the top of the form, and the fields keep their values (React would
 * otherwise clear them after the action).
 */
export default function ActionForm({
  action,
  children,
  className,
  errorClassName = "mb-6",
}: {
  action: (formData: FormData) => Promise<FormResult>;
  children: ReactNode;
  className?: string;
  /** Spacing around the error message, e.g. when the form is a card's footer. */
  errorClassName?: string;
}) {
  const [state, dispatch, pending] = useActionState(
    async (_previous: FormResult, formData: FormData) => (await action(formData)) ?? null,
    null
  );
  const errorRef = useRef<HTMLDivElement>(null);

  // Bring the message into view: forms can be longer than the screen.
  useEffect(() => {
    if (state?.error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // Handled here rather than by React's form action, which would reset the
    // fields once the action finishes. (Without JavaScript, `action` still works.)
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  }

  return (
    <form action={dispatch} onSubmit={onSubmit} className={className}>
      {state?.error && (
        <div ref={errorRef} className={errorClassName}>
          <Alert tone="error">{state.error}</Alert>
        </div>
      )}
      <FormPendingContext.Provider value={pending}>{children}</FormPendingContext.Provider>
    </form>
  );
}
