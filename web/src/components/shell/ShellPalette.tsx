import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHomerUrl, getLinksConfig } from '../../config'
import { useCreatePanel } from '../../contexts/createPanel'
import { useTimeQueryMemory } from '../../contexts/timeQuery'
import { fetchHomerLinks, toFlatLinks } from '../../lib/homer-links'
import { NAV_SECTIONS } from '../../lib/navigation'
import { catalogListQuery } from '../../lib/queries'
import { CommandPalette, type PaletteGroup } from '../ui/command-palette'
import { CREATE_ACTIONS } from './create-actions'

interface ShellPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The ⌘K palette of the shell: jump to a page, create, or find a service or a link. */
export function ShellPalette({ open, onOpenChange }: ShellPaletteProps) {
  const navigate = useNavigate()
  const { open: openPanel } = useCreatePanel()
  const { remembered } = useTimeQueryMemory()
  const homerUrl = getHomerUrl()

  const { data: homerData } = useQuery({ queryKey: ['homer-links'], queryFn: fetchHomerLinks, enabled: open && !!homerUrl, staleTime: 60_000 })
  const { data: catalogData } = useQuery({ ...catalogListQuery, enabled: open, staleTime: 60_000 })

  const groups = useMemo<PaletteGroup[]>(() => {
    const links = toFlatLinks(getLinksConfig(), homerData)
    return [
      {
        label: 'Jump to',
        items: NAV_SECTIONS.flatMap((s) => s.items).map((item) => ({
          id: `page:${item.to}`,
          label: item.name,
          icon: item.icon,
          run: () => navigate(item.timeView && remembered ? `${item.to}?${remembered}` : item.to),
        })),
      },
      {
        label: 'Create',
        items: CREATE_ACTIONS.map((action) => ({ id: `create:${action.panel}`, label: action.label, icon: action.icon, kbd: action.kbd, run: () => openPanel(action.panel) })),
      },
      {
        label: 'Services',
        searchOnly: true,
        items: (catalogData?.catalogs ?? []).map((c) => ({
          id: `service:${c.name}`,
          label: c.name,
          icon: 'service' as const,
          hint: [c.type, c.owner].filter(Boolean).join(' · '),
          run: () => navigate(`/catalog/${encodeURIComponent(c.name)}`),
        })),
      },
      {
        label: 'Links',
        searchOnly: true,
        items: links.map((l, i) => ({
          id: `link:${i}:${l.url}`,
          label: l.name,
          icon: 'links' as const,
          hint: l.subtitle,
          run: () => window.open(l.url, '_blank', 'noopener,noreferrer'),
        })),
      },
    ]
  }, [homerData, catalogData, navigate, openPanel, remembered])

  return <CommandPalette open={open} onOpenChange={onOpenChange} groups={groups} />
}
