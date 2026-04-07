import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ExternalLink, Command, Package } from 'lucide-react'
import { load as yamlLoad } from 'js-yaml'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { getLinksConfig, getHomerUrl, type LinkItem, type LinkGroup } from '../config'
import { catalogApi } from '../lib/api'
import type { Catalog } from '../types/api'

interface HomerLink { name: string; url: string; icon?: string }
interface HomerServiceItem { name: string; url: string; subtitle?: string; icon?: string }
interface HomerServiceGroup { name: string; items: HomerServiceItem[] }
interface HomerLinksResponse { links: HomerLink[]; services: HomerServiceGroup[] }

type ResultKind = 'link' | 'catalog'

interface FlatResult {
  kind: ResultKind
  name: string
  subtitle: string
  url?: string
  icon?: string
  serviceName?: string
  owner?: string
}

async function fetchHomerLinks(): Promise<HomerLinksResponse> {
  const homerUrl = getHomerUrl()
  if (import.meta.env.DEV && homerUrl) {
    const res = await fetch('/homer-proxy/assets/config.yml')
    if (!res.ok) throw new Error('Homer fetch failed')
    const text = await res.text()
    const cfg = yamlLoad(text) as { links?: HomerLink[]; services?: HomerServiceGroup[] }
    return { links: cfg.links ?? [], services: cfg.services ?? [] }
  }
  const res = await fetch('/api/homer-links')
  if (!res.ok) throw new Error('Homer fetch failed')
  return res.json()
}

function toFlatLinks(localGroups: LinkGroup[], homerData?: HomerLinksResponse): FlatResult[] {
  const out: FlatResult[] = []
  for (const g of localGroups) {
    for (const item of g.items) {
      const li = item as LinkItem & { icon?: string }
      out.push({ kind: 'link', name: item.name, subtitle: g.name, url: item.url, icon: li.icon })
    }
  }
  if (homerData?.links?.length) {
    for (const l of homerData.links) {
      out.push({ kind: 'link', name: l.name, subtitle: 'Quick Links', url: l.url, icon: l.icon })
    }
  }
  for (const svc of homerData?.services ?? []) {
    for (const item of svc.items) {
      out.push({ kind: 'link', name: item.name, subtitle: svc.name + (item.subtitle ? ` · ${item.subtitle}` : ''), url: item.url, icon: item.icon })
    }
  }
  return out
}

function catalogToFlat(catalogs: Catalog[]): FlatResult[] {
  return catalogs.map(c => ({
    kind: 'catalog' as ResultKind,
    name: c.name ?? c.service ?? '',
    subtitle: [c.type, c.owner].filter(Boolean).join(' · '),
    serviceName: c.service ?? c.name ?? '',
    owner: c.owner,
  }))
}

export default function LinksSearch({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const activeIdxRef = useRef(0)
  const resultsRef = useRef<FlatResult[]>([])
  const navigate = useNavigate()
  const homerUrl = getHomerUrl()
  const localGroups = getLinksConfig()

  const { data: homerData } = useQuery<HomerLinksResponse>({
    queryKey: ['homer-links'],
    queryFn: fetchHomerLinks,
    enabled: !!homerUrl,
    staleTime: 60_000,
  })

  const { data: catalogData } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 500 }),
    staleTime: 60_000,
  })

  const allLinks = useMemo(() => toFlatLinks(localGroups, homerData), [localGroups, homerData])
  const allCatalogs = useMemo(() => catalogToFlat(catalogData?.catalogs ?? []), [catalogData])

  const results = useMemo(() => {
    if (!query.trim()) {
      return [...allLinks.slice(0, 5), ...allCatalogs.slice(0, 3)]
    }
    const q = query.toLowerCase()
    const links = allLinks.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.subtitle.toLowerCase().includes(q) ||
      l.url?.toLowerCase().includes(q),
    )
    const catalogs = allCatalogs.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q) ||
      (c.owner ?? '').toLowerCase().includes(q),
    )
    return [...links, ...catalogs].slice(0, 12)
  }, [allLinks, allCatalogs, query])

  // Keep refs in sync so keydown handler always has latest values
  useEffect(() => {
    resultsRef.current = results
    activeIdxRef.current = 0
    setActiveIdx(0)
  }, [results])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const active = listRef.current.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const handleSelect = (result: FlatResult) => {
    if (result.kind === 'link' && result.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer')
    } else if (result.kind === 'catalog' && result.serviceName) {
      navigate(`/catalog/${result.serviceName}`)
    }
    setOpen(false)
  }

  // Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Keyboard navigation — active whenever the dialog is open, no focus dependency
  useEffect(() => {
    if (!open) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => {
          const next = Math.min(i + 1, resultsRef.current.length - 1)
          activeIdxRef.current = next
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => {
          const next = Math.max(i - 1, 0)
          activeIdxRef.current = next
          return next
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = resultsRef.current[activeIdxRef.current]
        if (!selected) return
        if (selected.kind === 'link' && selected.url) {
          window.open(selected.url, '_blank', 'noopener,noreferrer')
        } else if (selected.kind === 'catalog' && selected.serviceName) {
          navigate(`/catalog/${selected.serviceName}`)
        }
        setOpen(false)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, navigate])

  // Focus input when dialog opens, reset query
  useEffect(() => {
    if (open) {
      setQuery('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  if (allLinks.length === 0 && allCatalogs.length === 0) return null

  const linkResults = results.filter(r => r.kind === 'link')
  const catalogResults = results.filter(r => r.kind === 'catalog')

  return (
    <>
      {collapsed ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center w-8 h-8 text-hud-on-surface-var bg-hud-surface-low hover:bg-hud-surface-high rounded-md transition-colors border border-hud-outline-var"
          title="Search links & services (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 h-8 text-xs text-hud-on-surface-var bg-hud-surface-low hover:bg-hud-surface-high rounded-md transition-all duration-150 border border-hud-outline-var w-full max-w-xs"
          title="Search links & services (Ctrl+K)"
        >
          <Search className="w-3 h-3 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="flex items-center gap-0.5 text-hud-on-surface-var/50 text-[11px]">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogContent>
          <div className="flex items-center px-4 py-3 border-b border-hud-outline-var/40">
            <Search className="w-4 h-4 text-hud-on-surface-var flex-shrink-0 mr-3" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search links and services…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') e.preventDefault() }}
              className="flex-1 bg-transparent text-sm text-hud-on-surface placeholder:text-hud-on-surface-var/50 outline-none"
            />
            <kbd className="text-xs text-hud-on-surface-var bg-hud-surface-low px-1.5 py-0.5 rounded-ig-sm border border-hud-outline-var">
              ESC
            </kbd>
          </div>

          <div ref={listRef} className="max-h-96 overflow-y-auto py-2">
            {results.length === 0 ? (
              <p className="text-sm text-hud-on-surface-var text-center py-8">No results found</p>
            ) : (
              <>
                {linkResults.length > 0 && (
                  <>
                    <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-hud-on-surface-var/50">
                      Links
                    </p>
                    {linkResults.map((result) => {
                      const idx = results.indexOf(result)
                      return (
                        <ResultRow
                          key={`link-${idx}`}
                          result={result}
                          active={idx === activeIdx}
                          onSelect={() => handleSelect(result)}
                          onHover={() => setActiveIdx(idx)}
                        />
                      )
                    })}
                  </>
                )}
                {catalogResults.length > 0 && (
                  <>
                    <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-hud-on-surface-var/50">
                      Services
                    </p>
                    {catalogResults.map((result) => {
                      const idx = results.indexOf(result)
                      return (
                        <ResultRow
                          key={`catalog-${idx}`}
                          result={result}
                          active={idx === activeIdx}
                          onSelect={() => handleSelect(result)}
                          onHover={() => setActiveIdx(idx)}
                        />
                      )
                    })}
                  </>
                )}
              </>
            )}
          </div>

          <div className="px-4 py-2 border-t border-hud-outline-var/40 flex items-center gap-3 text-xs text-hud-on-surface-var/60">
            <span><kbd className="bg-hud-surface-low px-1 rounded-ig-sm border border-hud-outline-var">↑↓</kbd> navigate</span>
            <span><kbd className="bg-hud-surface-low px-1 rounded-ig-sm border border-hud-outline-var">↵</kbd> open</span>
            <span><kbd className="bg-hud-surface-low px-1 rounded-ig-sm border border-hud-outline-var">ESC</kbd> close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface ResultRowProps {
  result: FlatResult
  active: boolean
  onSelect: () => void
  onHover: () => void
}

function ResultRow({ result, active, onSelect, onHover }: ResultRowProps) {
  const isLink = result.kind === 'link'
  return (
    <button
      type="button"
      data-active={active ? 'true' : undefined}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
        active ? 'bg-hud-primary/10' : 'hover:bg-hud-surface-low'
      }`}
    >
      <div className={`flex-shrink-0 w-7 h-7 rounded-ig flex items-center justify-center text-white text-xs ${
        isLink ? 'bg-hud-primary' : 'bg-hud-tertiary'
      }`}>
        {isLink
          ? result.icon ? <i className={result.icon} aria-hidden="true" /> : <ExternalLink className="w-3.5 h-3.5" />
          : <Package className="w-3.5 h-3.5" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-hud-on-surface truncate">{result.name}</p>
        <p className="text-xs text-hud-on-surface-var truncate">{result.subtitle}</p>
      </div>

      <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
        isLink
          ? 'bg-hud-primary/10 text-hud-primary'
          : 'bg-hud-tertiary/10 text-hud-tertiary'
      }`}>
        {isLink ? 'link' : 'service'}
      </span>
    </button>
  )
}

