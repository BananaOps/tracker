import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"
import tokens from "@/design/tokens.json"

/** Type styles of the design system, exposed as `text-<name>` utilities in index.css. */
export const typeStyles = tokens.type.groups.flatMap((group) => group.styles.map((style) => style.name))

// Without this, tailwind-merge reads `text-title` as a text colour and drops it
// in favour of `text-ink` (or the reverse).
/** Spacing keys exposed in index.css (p-space-5, h-control-md, w-drawer-w…). */
export const spacingKeys = [
  ...tokens.spacing.tokens.map((t) => t.name),
  ...tokens.size.tokens.map((t) => t.name),
]

const twMerge = extendTailwindMerge({
  extend: {
    // Without this, h-control-md and h-7 both stay and the CSS order decides.
    theme: {
      spacing: spacingKeys,
    },
    classGroups: {
      "font-size": [{ text: typeStyles }],
      shadow: [{ shadow: ["overlay"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
