import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { buttonVariants } from "./button-variants"
import { Icon } from "./icon"
import type { IconName } from "./icons"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, "iconOnly"> {
  asChild?: boolean
  /** Icon before the label. Without children, the button is square: give it an aria-label. */
  icon?: IconName
  /** Icon after the label, at 12 px (the chevron of the New button). */
  iconRight?: IconName
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, icon, iconRight, children, type = "button", ...props }, ref) => {
    const iconOnly = Boolean(icon) && (children === undefined || children === null)
    return (
      <button
        type={type}
        className={cn(buttonVariants({ variant, size, iconOnly, className }))}
        ref={ref}
        {...props}
      >
        {icon && <Icon name={icon} />}
        {children}
        {iconRight && <Icon name={iconRight} size={12} />}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
