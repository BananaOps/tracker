// API client for custom links CRUD

export interface StoredLink {
  id?: string
  group: string
  name: string
  url: string
  description?: string
  icon?: string
  color?: string
  logo?: string
  created_at?: number
  updated_at?: number
}

const BASE = '/api/links'

export const linksApi = {
  async list(): Promise<StoredLink[]> {
    const res = await fetch(BASE)
    if (!res.ok) throw new Error(`Failed to fetch links: ${res.status}`)
    return res.json()
  },

  async create(link: Omit<StoredLink, 'id' | 'created_at' | 'updated_at'>): Promise<StoredLink> {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(link),
    })
    if (!res.ok) throw new Error(`Failed to create link: ${res.status}`)
    return res.json()
  },

  async update(id: string, link: Omit<StoredLink, 'id' | 'created_at' | 'updated_at'>): Promise<StoredLink> {
    const res = await fetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(link),
    })
    if (!res.ok) throw new Error(`Failed to update link: ${res.status}`)
    return res.json()
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Failed to delete link: ${res.status}`)
  },
}

