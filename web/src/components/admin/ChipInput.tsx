import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Input } from '../ui/input'

interface ChipInputProps {
  id: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  disabled?: boolean
}

/** Free-text list editor: Enter or comma adds a value, chips remove one. */
export function ChipInput({ id, values, onChange, placeholder = 'Type and press Enter', disabled = false }: ChipInputProps) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const v = draft.trim()
    setDraft('')
    if (!v) return
    onChange(values.includes(v) ? values : [...values, v])
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    }
  }

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-hud-surface-high text-hud-on-surface">
              {v}
              {!disabled && (
                <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="text-hud-on-surface-var hover:text-hud-on-surface">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <Input
        id={id}
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </div>
  )
}
