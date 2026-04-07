"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { IconTooltip } from "./icon-tooltip";

const iconButtonVariants = cva("rounded-full transition", {
  variants: {
    variant: {
      ghost:
        "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300",
      primary: "bg-indigo-600 text-white hover:bg-indigo-500",
      danger:
        "text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/30 dark:hover:text-red-400",
    },
    size: {
      xs: "p-0.5",
      sm: "p-1",
      md: "p-1.5",
      lg: "p-2",
    },
  },
  defaultVariants: {
    variant: "ghost",
    size: "md",
  },
});

type IconButtonProps = {
  label?: string;
  children: React.ReactNode;
} & VariantProps<typeof iconButtonVariants> &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function IconButton({
  variant,
  size,
  label,
  className,
  children,
  ...props
}: IconButtonProps) {
  const button = (
    <button
      {...props}
      className={cn(iconButtonVariants({ variant, size }), className)}
    >
      {children}
    </button>
  );

  if (label) {
    return <IconTooltip label={label}>{button}</IconTooltip>;
  }

  return button;
}
