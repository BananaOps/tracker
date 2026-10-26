import { cva } from "class-variance-authority"

// Shared by Button and the calendar navigation buttons. Kept out of
// button.tsx, which only exports components.
export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-hud-primary/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-hud-primary text-white shadow-[0_1px_2px_rgb(var(--hud-primary)/0.25)] hover:bg-hud-primary-dim hover:shadow-[0_2px_6px_rgb(var(--hud-primary)/0.35)]",
        destructive:
          "bg-hud-error text-white shadow-[0_1px_2px_rgb(var(--hud-error)/0.25)] hover:bg-hud-error/90",
        outline:
          "border border-hud-outline-var bg-hud-surface text-hud-on-surface hover:bg-hud-surface-high hover:border-hud-outline",
        secondary:
          "bg-hud-surface-high text-hud-on-surface border border-hud-outline-var/60 hover:bg-hud-surface-highest hover:border-hud-outline-var",
        ghost:
          "text-hud-on-surface-var hover:bg-hud-surface-high hover:text-hud-on-surface",
        link:
          "text-hud-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-7 rounded-md px-3 text-xs",
        lg:      "h-10 rounded-md px-6",
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
