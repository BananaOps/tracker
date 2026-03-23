import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExternalLink, Link2, X } from 'lucide-react'
import type { StoredLink } from '../lib/linksApi'

interface LinkFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: (link: Omit<StoredLink, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  initial?: StoredLink | null
  existingGroups?: string[]
}

const EMPTY: Omit<StoredLink, 'id' | 'created_at' | 'updated_at'> = {
  group: '',
  name: '',
  url: '',
  description: '',
  icon: '',
  color: '#6366f1',
}

export default function LinkFormDialog({
  open,
  onClose,
  onSave,
  initial,
  existingGroups = [],
}: LinkFormDialogProps) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              group: initial.group,
              name: initial.name,
              url: initial.url,
              description: initial.description ?? '',
              icon: initial.icon ?? '',
              color: initial.color ?? '#6366f1',
            }
          : EMPTY,
      )
      setError('')
    }
  }, [open, initial])

  const set = (field: keyof typeof EMPTY, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.url.trim()) {
      setError('Name and URL are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, group: form.group.trim() || 'Custom' })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save link.')
    } finally {
      setSaving(false)
    }
  }

  // Live preview helpers
  const hostname = (() => { try { return new URL(form.url).hostname } catch { return '' } })()
  const faviconUrl = hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32` : null

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {initial ? 'Edit link' : 'Add a link'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {initial ? 'Update the link details' : 'Save a URL to your links page'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* Live preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: !form.icon && !faviconUrl ? form.color || '#6366f1' : undefined }}
              >
                {form.icon ? (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: form.color || '#6366f1' }}
                  >
                    <i className={form.icon} aria-hidden="true" />
                  </div>
                ) : faviconUrl ? (
                  <img src={faviconUrl} alt="" className="w-6 h-6 object-contain" />
                ) : (
                  <ExternalLink className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {form.name || <span className="text-gray-400">Link name</span>}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {form.description || form.url || <span className="text-gray-300 dark:text-gray-600">https://example.com</span>}
                </p>
              </div>
              {form.group && (
                <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                  {form.group}
                </span>
              )}
            </div>

            {/* Name + Group row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lf-name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lf-name"
                  placeholder="Grafana"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lf-group">Group</Label>
                <Input
                  id="lf-group"
                  placeholder="Monitoring"
                  value={form.group}
                  onChange={e => set('group', e.target.value)}
                  list="lf-group-list"
                />
                <datalist id="lf-group-list">
                  {existingGroups.map(g => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* URL */}
            <div className="space-y-1.5">
              <Label htmlFor="lf-url">
                URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lf-url"
                type="url"
                placeholder="https://grafana.example.com"
                value={form.url}
                onChange={e => set('url', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="lf-desc">
                Description
                <span className="ml-1 text-xs font-normal text-gray-400">optional</span>
              </Label>
              <Input
                id="lf-desc"
                placeholder="Short description shown below the name"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            {/* Icon + Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lf-icon">
                  Icon
                  <span className="ml-1 text-xs font-normal text-gray-400">Font Awesome class</span>
                </Label>
                <Input
                  id="lf-icon"
                  placeholder="fas fa-chart-line"
                  value={form.icon}
                  onChange={e => set('icon', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lf-color-text">Icon color</Label>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="lf-color"
                    className="flex-shrink-0 w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden"
                    style={{ backgroundColor: form.color }}
                  >
                    <input
                      id="lf-color"
                      type="color"
                      value={form.color}
                      onChange={e => set('color', e.target.value)}
                      className="opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                  <Input
                    id="lf-color-text"
                    value={form.color}
                    onChange={e => set('color', e.target.value)}
                    className="font-mono text-xs"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="min-w-[100px]">
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : initial ? 'Save changes' : 'Add link'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
