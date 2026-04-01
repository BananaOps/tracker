import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-hud-primary/30 focus:ring-offset-1 border",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-hud-primary/10 text-hud-primary dark:bg-hud-primary/20",
        secondary:
          "border-transparent bg-hud-surface-high text-hud-on-surface-var",
        destructive:
          "border-transparent bg-hud-error/10 text-hud-error dark:bg-hud-error/20",
        outline:
          "border-hud-outline-var text-hud-on-surface",
        success:
          "border-transparent bg-hud-success/10 text-hud-success dark:bg-hud-success/20",
        warning:
          "border-transparent bg-hud-warning/10 text-hud-warning dark:bg-hud-warning/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
