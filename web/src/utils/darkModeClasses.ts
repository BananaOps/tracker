// Utility to generate theme-aware class names backed by Tracker tokens.
export const darkModeClasses = {
  // Text colors
  textGray900: 'text-hud-on-surface',
  textGray800: 'text-hud-on-surface',
  textGray700: 'text-hud-on-surface',
  textGray600: 'text-hud-on-surface-var',
  textGray500: 'text-hud-on-surface-var',
  
  // Background colors
  bgWhite: 'bg-hud-surface',
  bgGray50: 'bg-hud-surface-low',
  bgGray100: 'bg-hud-surface-high',
  bgGray200: 'bg-hud-surface-highest',
  
  // Border colors
  borderGray200: 'border-hud-outline-var/60',
  borderGray300: 'border-hud-outline',
  
  // Hover states
  hoverBgGray100: 'hover:bg-hud-surface-high',
  hoverTextGray700: 'hover:text-hud-on-surface',
}
