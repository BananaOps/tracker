import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-600 text-white",
        secondary: "border-transparent bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100",
        destructive: "border-transparent bg-red-600 text-white",
        outline: "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600",
        success: "border-transparent bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
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
