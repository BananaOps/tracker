import { cva } from "class-variance-authority"

// Shared by Button and the calendar navigation buttons. Kept out of
// button.tsx, which only exports components.
//
// Design system variants: primary (ink, rare: one per zone), secondary
// (surface with a rule-strong border) and ghost; sizes md (control-md) and sm
// (control-sm). Signature is never a button colour.
//
// TEMPORARY, removed in lot 5: the legacy names (default, outline,
// destructive, link; sizes default, lg, icon) keep the screens that are not
// redesigned yet working. default and outline map to primary and secondary.
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-space-2 whitespace-nowrap rounded-md border border-transparent",
    "text-[14px] font-medium leading-none",
    "transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
    "disabled:cursor-not-allowed disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        primary: "bg-ink text-on-ink hover:bg-ink-hover",
        secondary: "border-rule-strong bg-surface text-ink hover:bg-sunken",
        ghost: "bg-transparent text-ink hover:bg-sunken",
        // Legacy aliases.
        default: "bg-ink text-on-ink hover:bg-ink-hover",
        outline: "border-rule-strong bg-surface text-ink hover:bg-sunken",
        destructive: "bg-failed text-on-status hover:opacity-90",
        link: "h-auto border-0 p-0 text-ink underline-offset-4 hover:underline",
      },
      size: {
        md: "h-control-md px-[14px]",
        sm: "h-control-sm px-[10px] text-[13px]",
        // Legacy aliases.
        default: "h-control-md px-[14px]",
        lg: "h-10 px-6",
        icon: "h-control-md w-control-md px-0",
      },
      iconOnly: {
        true: "px-0",
        false: "",
      },
    },
    compoundVariants: [
      { iconOnly: true, size: ["md", "default"], className: "w-control-md" },
      { iconOnly: true, size: "sm", className: "w-control-sm" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
      iconOnly: false,
    },
  }
)
