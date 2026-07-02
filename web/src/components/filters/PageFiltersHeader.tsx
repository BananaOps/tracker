import type { CSSProperties } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ActiveFilterTag = {
  key: string
  label: string
  onRemove: () => void
  style?: CSSProperties
}

type PageFiltersHeaderProps = {
  title: string
  subtitle: string
  filterCount: number
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  onClearAllFilters: () => void
  tags: ActiveFilterTag[]
}

const defaultTagStyle: CSSProperties = {
  background: '#F3F6FC',
  color: '#1B3575',
  borderColor: '#D7E0F0',
}

export default function PageFiltersHeader({
  title,
  subtitle,
  filterCount,
  isSidebarOpen,
  onToggleSidebar,
  onClearAllFilters,
  tags,
}: PageFiltersHeaderProps) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.2)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-9 w-9 shrink-0"
            style={isSidebarOpen
              ? { background: '#EAF0FF', color: '#1B3575', border: '1px solid #C9D8F5' }
              : { background: '#F3F6FC', color: '#6E7891', border: '1px solid #E1E7F2' }}
            aria-label="Toggle filters panel"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold truncate" style={{ color: 'rgb(var(--hud-on-surface))' }}>{title}</h2>
            <p className="text-xs" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>{subtitle}</p>
          </div>
        </div>
        {filterCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-xs"
            onClick={onClearAllFilters}
            style={{ background: '#F3F6FC', color: '#1B3575', border: '1px solid #D7E0F0' }}
          >
            Clear all ({filterCount})
          </Button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <button
              key={tag.key}
              type="button"
              onClick={tag.onRemove}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
              style={{ ...defaultTagStyle, ...tag.style }}
            >
              <span className="truncate max-w-[200px]">{tag.label}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
