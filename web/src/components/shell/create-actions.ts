import type { IconName } from '../ui/icons'
import type { CreatePanelType } from '../../contexts/createPanel'

/** What the New menu and the palette can create, with the palette shortcut letter. */
export const CREATE_ACTIONS: { panel: CreatePanelType; label: string; icon: IconName; kbd: string }[] = [
  { panel: 'event', label: 'New event', icon: 'plus', kbd: 'E' },
  { panel: 'lock', label: 'New lock', icon: 'locks', kbd: 'L' },
  { panel: 'drift', label: 'New drift', icon: 'drifts', kbd: 'D' },
  { panel: 'service', label: 'New service', icon: 'service', kbd: 'S' },
  { panel: 'rpa', label: 'New RPA operation', icon: 'rpa', kbd: 'R' },
]
