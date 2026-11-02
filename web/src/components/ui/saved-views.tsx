import { useState, type FormEvent } from 'react'
import type { SavedView } from '@/lib/saved-views'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Icon } from './icon'

export interface SavedViewsProps {
  views: SavedView[]
  /** Id of the view showing the current query; none when the query is custom. */
  currentId?: string
  /** Number of events of each view, by id. */
  counts?: Record<string, number>
  onSelect: (view: SavedView) => void
  /** Saves the current query under this name. Omit to hide "Save view". */
  onSave?: (label: string) => void
  onDelete?: (id: string) => void
  className?: string
}

/** Saved views as tabs with their count, an underline on the current one, and "Save view". */
export function SavedViews({ views, currentId, counts = {}, onSelect, onSave, onDelete, className }: SavedViewsProps) {
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !onSave) return
    onSave(name.trim())
    setName('')
    setNaming(false)
  }

  return (
    <nav aria-label="Saved views" className={cn('flex flex-wrap items-center gap-1 border-b border-rule', className)}>
      {views.map((view) => {
        const current = view.id === currentId
        return (
          <span key={view.id} className="group/view inline-flex items-center">
            <button
              type="button"
              aria-current={current ? 'page' : undefined}
              aria-label={counts[view.id] !== undefined ? `${view.label} (${counts[view.id]})` : undefined}
              onClick={() => onSelect(view)}
              className={cn(
                '-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-2.5 pt-2 pb-2.5 text-[14px]',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                current ? 'border-ink font-semibold text-ink' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {view.label}
              {counts[view.id] !== undefined && <span className="font-mono text-[11px] font-normal text-muted">{counts[view.id]}</span>}
            </button>
            {!view.builtIn && onDelete && (
              <button
                type="button"
                aria-label={`Delete view ${view.label}`}
                onClick={() => onDelete(view.id)}
                className="inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-xs text-muted hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </span>
        )
      })}
      <span className="flex-auto" />
      {onSave &&
        (naming ? (
          <form onSubmit={submit} className="flex items-center gap-1.5 pb-1">
            <input
              autoFocus
              aria-label="View name"
              placeholder="View name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  setNaming(false)
                }
              }}
              className="h-control-sm w-40 rounded-md border border-rule-strong bg-surface px-2 text-[13px] text-ink outline-0 focus:border-ink"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={!name.trim()}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setNaming(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setNaming(true)}>
            Save view
          </Button>
        ))}
    </nav>
  )
}
