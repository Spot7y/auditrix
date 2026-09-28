import Link from "next/link";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "danger-ghost";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
  secondary: "border border-line bg-white text-ink-800 shadow-sm hover:bg-ink-50 active:bg-ink-100",
  danger: "bg-status-violation text-white shadow-sm hover:bg-red-800",
  ghost: "text-ink-700 hover:bg-ink-100",
  "danger-ghost": "text-status-violation hover:bg-red-50",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}) {
  return [base, variants[variant], sizes[size], block ? "w-full" : "", className ?? ""].filter(Boolean).join(" ");
}

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean };

export function Button({ variant, size, block, className, type = "button", ...props }: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={buttonClasses({ variant, size, block, className })} {...props} />;
}

export function LinkButton({ variant, size, block, className, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClasses({ variant, size, block, className })} {...props} />;
}
