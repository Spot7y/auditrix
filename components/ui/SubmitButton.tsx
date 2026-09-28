"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "./Button";

/** A form's submit button that disables itself and shows a spinner while the action runs. */
export default function SubmitButton({
  children,
  pendingLabel,
  variant,
  size,
  block,
  ...props
}: Omit<ComponentProps<"button">, "type"> & {
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} block={block} disabled={pending || props.disabled} {...props}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
