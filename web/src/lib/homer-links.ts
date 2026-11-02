// Links shown by the command palette: the configured link groups plus the Homer dashboard
// (quick links and services). Moved from the former LinksSearch bar.

import { load as yamlLoad } from 'js-yaml'
import { getHomerUrl, type LinkGroup } from '../config'

interface HomerLink { name: string; url: string; icon?: string }
interface HomerServiceItem { name: string; url: string; subtitle?: string; icon?: string }
interface HomerServiceGroup { name: string; items: HomerServiceItem[] }
export interface HomerLinksResponse { links: HomerLink[]; services: HomerServiceGroup[] }

export interface FlatLink {
  name: string
  /** Group of the link, and its subtitle in Homer. */
  subtitle: string
  url: string
}

export async function fetchHomerLinks(): Promise<HomerLinksResponse> {
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

export function toFlatLinks(localGroups: LinkGroup[], homerData?: HomerLinksResponse): FlatLink[] {
  const out: FlatLink[] = []
  for (const g of localGroups) {
    for (const item of g.items) out.push({ name: item.name, subtitle: g.name, url: item.url })
  }
  for (const l of homerData?.links ?? []) out.push({ name: l.name, subtitle: 'Quick links', url: l.url })
  for (const svc of homerData?.services ?? []) {
    for (const item of svc.items) {
      out.push({ name: item.name, subtitle: svc.name + (item.subtitle ? ` · ${item.subtitle}` : ''), url: item.url })
    }
  }
  return out
}
