import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

type FilterOption = {
  key: string
  label: string
  checked: boolean
  onToggle: () => void
  palette: { bg: string; text: string; border: string }
}

type FilterSection = {
  title: string
  options: FilterOption[]
}

type ServiceFilter = {
  title: string
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  options: Array<{ key: string; label: string; checked: boolean; onToggle: () => void }>
  emptyText?: string
  noDataText?: string
}

type FiltersSidebarProps = {
  activeFiltersCount: number
  onClearAllFilters: () => void
  searchQuery?: string
  onSearchQueryChange?: (value: string) => void
  sections: FilterSection[]
  serviceFilter: ServiceFilter
}

const primary = '#1B3575'

export default function FiltersSidebar({
  activeFiltersCount,
  onClearAllFilters,
  searchQuery,
  onSearchQueryChange,
  sections,
  serviceFilter,
}: FiltersSidebarProps) {
  return (
    <div className="w-64 flex flex-col shrink-0 rounded-xl overflow-hidden" style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.2)' }}>
      <div className="p-3" style={{ background: 'rgb(var(--hud-surface-high))', borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.16)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--hud-on-surface))' }}>
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </h3>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearAllFilters} className="h-7 text-xs">
              Clear all
            </Button>
          )}
        </div>
        {searchQuery !== undefined && onSearchQueryChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--hud-on-surface-var))' }} />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {sections.map((section, sectionIndex) => (
            <div key={section.title}>
              {sectionIndex > 0 && <Separator className="mb-4" />}
              <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
                {section.title}
              </h4>
              <div className="space-y-2">
                {section.options.map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                    style={{ background: option.checked ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                  >
                    <div
                      onClick={option.onToggle}
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: option.checked ? option.palette.bg : 'rgb(var(--hud-outline-var) / 0.2)',
                        border: `1.5px solid ${option.checked ? option.palette.border : 'rgb(var(--hud-outline-var) / 0.55)'}`,
                      }}
                    >
                      {option.checked && <div className="w-2 h-2 rounded-sm" style={{ background: option.palette.text }} />}
                    </div>
                    <span className="text-sm font-medium truncate" style={{ color: option.checked ? option.palette.text : 'rgb(var(--hud-on-surface))' }} title={option.label}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <Separator />
          <div>
            <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
              {serviceFilter.title}
            </h4>
            {serviceFilter.options.length > 0 || serviceFilter.searchQuery ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: 'rgb(var(--hud-on-surface-var))' }} />
                  <Input
                    placeholder="Search services..."
                    value={serviceFilter.searchQuery}
                    onChange={(e) => serviceFilter.onSearchQueryChange(e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                  {serviceFilter.searchQuery && (
                    <button
                      type="button"
                      onClick={() => serviceFilter.onSearchQueryChange('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgb(var(--hud-on-surface-var))' }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {serviceFilter.options.length > 0 ? serviceFilter.options.map((option) => (
                    <label
                      key={option.key}
                      className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                      style={{ background: option.checked ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                    >
                      <div
                        onClick={option.onToggle}
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: option.checked ? 'rgb(var(--hud-primary) / 0.18)' : 'rgb(var(--hud-outline-var) / 0.2)',
                          border: `1.5px solid ${option.checked ? 'rgb(var(--hud-primary) / 0.6)' : 'rgb(var(--hud-outline-var) / 0.55)'}`,
                        }}
                      >
                        {option.checked && <div className="w-2 h-2 rounded-sm" style={{ background: primary }} />}
                      </div>
                      <span className="text-sm font-medium truncate" style={{ color: option.checked ? primary : 'rgb(var(--hud-on-surface))' }} title={option.label}>
                        {option.label}
                      </span>
                    </label>
                  )) : (
                    <p className="text-xs italic" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
                      {serviceFilter.emptyText ?? 'No services found'}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs italic" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
                {serviceFilter.noDataText ?? 'No services'}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
