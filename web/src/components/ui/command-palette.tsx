import * as Dialog from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from './icon'
import type { IconName } from './icons'
import { Kbd } from './kbd'

export interface PaletteItem {
  /** Unique within the palette; defaults to the label. */
  id?: string
  label: string
  icon?: IconName
  /** Subscript in mono: "failed · 15:04" for an event. */
  hint?: string
  /** Shortcut letter of a creation (E, L, D, S, R). */
  kbd?: string
  /** Run when the item is chosen; onSelect of the palette is called too. */
  run?: () => void
}

export interface PaletteGroup {
  /** Groups keep the given order: Jump to, Create, then the results. */
  label: string
  items: PaletteItem[]
  /** Results groups (services, links): shown only once something is typed. */
  searchOnly?: boolean
}

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: PaletteGroup[]
  onSelect?: (item: PaletteItem) => void
  placeholder?: string
  defaultQuery?: string
}

// Substring match on the label and the hint, like the reference: no fuzzy reordering.
function filter(value: string, search: string, keywords?: string[]) {
  const q = search.trim().toLowerCase()
  if (!q) return 1
  return [value, ...(keywords ?? [])].join(' ').toLowerCase().includes(q) ? 1 : 0
}

/**
 * The ⌘K palette: search, create and navigate from one field, over a scrim. ↑ ↓ move the
 * active item (signature-wash), ↵ opens it, esc closes the palette.
 */
export function CommandPalette({
  open,
  onOpenChange,
  groups,
  onSelect,
  placeholder = 'Search events, services, teams — or type a command',
  defaultQuery = '',
}: CommandPaletteProps) {
  const [query, setQuery] = useState(defaultQuery)

  function choose(item: PaletteItem) {
    item.run?.()
    onSelect?.(item)
    onOpenChange(false)
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery(defaultQuery)
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed top-[15vh] left-1/2 z-50 box-border w-[calc(100%-2rem)] max-w-[640px] -translate-x-1/2 overflow-hidden',
            'rounded-lg border border-rule bg-overlay text-ink shadow-overlay',
            'focus-visible:outline-hidden motion-safe:animate-palette-in',
          )}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          {/* cmdk names its input after this label. */}
          <Command label="Search or run a command" filter={filter} loop={false}>
            <div className="flex h-[52px] items-center gap-2.5 border-b border-rule px-space-4 text-muted">
              <Icon name="search" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder={placeholder}
                className="min-w-0 flex-1 border-0 bg-transparent font-sans text-[16px] text-ink outline-0 placeholder:text-muted"
              />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="max-h-[360px] overflow-y-auto py-1.5">
              <Command.Empty className="px-space-4 pt-2.5 pb-1 font-mono text-[11px] leading-4 text-muted">
                {`No results for “${query}”`}
              </Command.Empty>
              {groups
                .filter((group) => !group.searchOnly || query.trim())
                .map((group) => (
                  <Command.Group
                    key={group.label}
                    heading={group.label}
                    className="[&_[cmdk-group-heading]]:px-space-4 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:leading-4 [&_[cmdk-group-heading]]:text-muted"
                  >
                    {group.items.map((item) => (
                      <Command.Item
                        key={item.id ?? item.label}
                        value={item.id ?? item.label}
                        keywords={[item.label, item.hint ?? ''].filter(Boolean)}
                        onSelect={() => choose(item)}
                        className={cn(
                          'group/item flex cursor-pointer items-center gap-2.5 px-space-4 py-2 text-[14px] text-ink',
                          'data-[selected=true]:bg-signature-wash',
                        )}
                      >
                        {item.icon && <Icon name={item.icon} className="text-muted group-data-[selected=true]/item:text-ink" />}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.hint && <span className="whitespace-nowrap font-mono text-[11px] text-muted">{item.hint}</span>}
                        {item.kbd && <Kbd>{item.kbd}</Kbd>}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
            </Command.List>
            <div aria-hidden="true" className="flex flex-wrap gap-space-4 border-t border-rule px-space-4 py-2.5 font-mono text-[11px] text-muted">
              <span>↑ ↓ move</span>
              <span>↵ open</span>
              <span>esc close</span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
