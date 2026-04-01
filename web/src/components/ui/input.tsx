import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-hud-outline-var bg-hud-surface px-3 py-2 text-sm text-hud-on-surface",
          "placeholder:text-hud-on-surface-var/60",
          "transition-all duration-150",
          "focus:outline-none focus:border-hud-primary focus:ring-3 focus:ring-hud-primary/12",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-hud-surface-low",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
