import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Link as LinkIcon, RefreshCw, AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react'
import { load as yamlLoad } from 'js-yaml'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getLinksConfig, getHomerUrl, type LinkGroup, type LinkItem } from '../config'
import { linksApi, type StoredLink } from '../lib/linksApi'
import LinkFormDialog from '../components/LinkFormDialog'

interface HomerLink { name: string; url: string; icon?: string; logo?: string }
interface HomerServiceItem { name: string; url: string; subtitle?: string; logo?: string; icon?: string }
interface HomerServiceGroup { name: string; icon?: string; logo?: string; items: HomerServiceItem[] }
interface HomerLinksResponse { links: HomerLink[]; services: HomerServiceGroup[] }

async function fetchHomerLinks(): Promise<HomerLinksResponse> {
  const homerUrl = getHomerUrl()
  if (import.meta.env.DEV && homerUrl) {
    const res = await fetch('/homer-proxy/assets/config.yml')
    if (!res.ok) throw new Error(`Homer YAML fetch failed: ${res.status}`)
    const text = await res.text()
    const cfg = yamlLoad(text) as { links?: HomerLink[]; services?: HomerServiceGroup[] }
    return { links: cfg.links ?? [], services: cfg.services ?? [] }
  }
  const res = await fetch('/api/homer-links')
  if (!res.ok) throw new Error(`Homer fetch failed: ${res.status}`)
  return res.json()
}

function homerToGroups(data: HomerLinksResponse): LinkGroup[] {
  const groups: LinkGroup[] = []
  if (data.links?.length) {
    groups.push({
      name: 'Quick Links',
      items: data.links.map(l => ({ name: l.name, url: l.url, icon: l.icon, logo: l.logo, _fromHomer: true })),
    })
  }
  for (const svc of data.services ?? []) {
    groups.push({
      name: svc.name,
      items: (svc.items ?? []).map(i => ({
        name: i.name, url: i.url, description: i.subtitle, icon: i.icon, logo: i.logo, _fromHomer: true,
      })),
    })
  }
  return groups
}

type RichLinkItem = LinkItem & { logo?: string; _id?: string; _fromHomer?: boolean }

function storedToGroups(items: StoredLink[]): LinkGroup[] {
  const map = new Map<string, RichLinkItem[]>()
  for (const item of items) {
    const g = item.group || 'Custom'
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push({
      name: item.name, url: item.url, description: item.description,
      icon: item.icon, color: item.color, logo: item.logo, _id: item.id,
    })
  }
  return Array.from(map.entries()).map(([name, its]) => ({ name, items: its }))
}

export default function Links() {
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StoredLink | null>(null)

  const homerUrl = getHomerUrl()
  const localGroups = getLinksConfig()
  const queryClient = useQueryClient()

  const { data: homerData, isLoading: homerLoading, isError: homerError, refetch } =
    useQuery<HomerLinksResponse>({
      queryKey: ['homer-links'],
      queryFn: fetchHomerLinks,
      enabled: !!homerUrl,
      staleTime: 60_000,
      retry: 1,
    })

  const { data: storedLinks = [], isLoading: dbLoading } = useQuery<StoredLink[]>({
    queryKey: ['custom-links'],
    queryFn: linksApi.list,
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: (link: Omit<StoredLink, 'id' | 'created_at' | 'updated_at'>) => linksApi.create(link),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-links'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, link }: { id: string; link: Omit<StoredLink, 'id' | 'created_at' | 'updated_at'> }) =>
      linksApi.update(id, link),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-links'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => linksApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-links'] }),
  })

  const isLoading = homerLoading || dbLoading

  const allGroups = useMemo(() => {
    const homer = homerData ? homerToGroups(homerData) : []
    const stored = storedToGroups(storedLinks)
    return [...localGroups, ...stored, ...homer]
  }, [localGroups, homerData, storedLinks])

  const filtered = useMemo(() => {
    if (!search.trim()) return allGroups
    const q = search.toLowerCase()
    return allGroups
      .map(group => ({
        ...group,
        items: group.items.filter(
          item =>
            item.name.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.url.toLowerCase().includes(q),
        ),
      }))
      .filter(group => group.items.length > 0)
  }, [allGroups, search])

  const existingGroups = useMemo(
    () => [...new Set(storedLinks.map(l => l.group).filter(Boolean))],
    [storedLinks],
  )

  const handleSave = async (link: Omit<StoredLink, 'id' | 'created_at' | 'updated_at'>) => {
    if (editTarget?.id) {
      await updateMutation.mutateAsync({ id: editTarget.id, link })
    } else {
      await createMutation.mutateAsync(link)
    }
  }

  const openAdd = () => {
    setEditTarget(null)
    setDialogOpen(true)
  }

  const openEdit = (item: StoredLink) => {
    setEditTarget(item)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this link?')) deleteMutation.mutate(id)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-3">
            <LinkIcon className="w-8 h-8" />
            <span>Links</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Quick access to all your tools and resources
            {homerUrl && (
              <span className="ml-2 text-xs text-indigo-500 dark:text-indigo-400">· synced from Homer</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter… (Ctrl+K)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-52 text-sm pl-3 pr-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {homerUrl && (
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={homerLoading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${homerLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          <Button size="sm" onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Link
          </Button>
        </div>
      </div>

      {/* Homer error banner */}
      {homerError && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Could not load Homer dashboard links. Showing local links only.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="columns-1 sm:columns-2 lg:columns-4 gap-4">
          {Array.from({ length: 4 }).map((_, col) => (
            <div key={col} className="break-inside-avoid-column mb-4 space-y-1.5">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
              {Array.from({ length: 5 }).map((_, row) => (
                <div key={row} className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No links found</p>
          <p className="text-xs mt-2">
            <button onClick={openAdd} className="text-indigo-500 hover:underline">
              Add your first link
            </button>
            {' '}or{' '}
            <a href="https://github.com/BananaOps/tracker/blob/main/docs/LINKS.md" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
              configure Homer integration
            </a>
          </p>
        </div>
      )}

      {/* 4-column masonry layout */}
      {!isLoading && filtered.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-4 gap-4">
          {filtered.map(group => (
            <GroupColumn
              key={group.name}
              group={group}
              storedLinks={storedLinks}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <LinkFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        initial={editTarget}
        existingGroups={existingGroups}
      />
    </div>
  )
}

// ── GroupColumn ───────────────────────────────────────────────────────────────

interface GroupColumnProps {
  group: LinkGroup
  storedLinks: StoredLink[]
  onEdit: (link: StoredLink) => void
  onDelete: (id: string) => void
}

function GroupColumn({ group, storedLinks, onEdit, onDelete }: GroupColumnProps) {
  return (
    <div className="break-inside-avoid-column mb-5">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {group.name}
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-1">
        {group.items.map((item, idx) => {
          const rich = item as RichLinkItem
          const stored = rich._id ? storedLinks.find(s => s.id === rich._id) : undefined
          return (
            <LinkRow
              key={`${idx}-${item.url}`}
              item={rich}
              stored={stored}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── LinkRow ───────────────────────────────────────────────────────────────────

interface LinkRowProps {
  item: RichLinkItem
  stored?: StoredLink
  onEdit: (link: StoredLink) => void
  onDelete: (id: string) => void
}

function LinkRow({ item, stored, onEdit, onDelete }: LinkRowProps) {
  const iconColor = item.color || '#6366f1'
  const hostname = (() => {
    try { return new URL(item.url).hostname } catch { return '' }
  })()
  const faviconUrl = hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32` : null

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      {/* Icon */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
        style={!item.logo && !faviconUrl ? { backgroundColor: iconColor } : {}}
        tabIndex={-1}
      >
        {item.logo ? (
          <img src={item.logo} alt="" className="w-8 h-8 object-contain rounded-lg" />
        ) : item.icon ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
            style={{ backgroundColor: iconColor }}
          >
            <i className={item.icon} aria-hidden="true" />
          </div>
        ) : faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            className="w-5 h-5 object-contain"
            onError={e => {
              const el = e.currentTarget
              el.style.display = 'none'
              el.parentElement!.style.backgroundColor = iconColor
            }}
          />
        ) : (
          <ExternalLink className="w-4 h-4 text-white" />
        )}
      </a>

      {/* Text */}
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
          {item.name}
        </p>
        {item.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">
            {item.description}
          </p>
        )}
      </a>

      {/* Right side: Homer badge OR edit/delete actions OR external link icon */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {item._fromHomer && (
          <span
            title="From Homer dashboard"
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 opacity-50 group-hover:opacity-100 transition-opacity select-none"
          >
            homer
          </span>
        )}
        {stored ? (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(stored)}
              className="p-1 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(stored.id!)}
              className="p-1 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : !item._fromHomer && (
          <ExternalLink className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  )
}

