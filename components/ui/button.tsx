import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "lime" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className, ...rest }, ref
) {
  const base = "inline-flex items-center justify-center gap-2 font-bold transition-all rounded-2xl whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-[var(--color-orange)] hover:bg-[var(--color-orange-hover)] text-[#0a0a0a] shadow-lg shadow-[rgba(250,204,21,0.32)]",
    secondary: "bg-white/5 hover:bg-white/10 text-[var(--color-text-primary)] border border-[var(--color-border)] backdrop-blur",
    lime: "bg-[var(--color-lime)] hover:bg-[var(--color-lime-hover)] text-[#0a0a0a] shadow-lg shadow-[rgba(200,245,62,0.3)]",
    ghost: "hover:bg-white/5 text-[var(--color-text-primary)]",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...rest} />;
});
