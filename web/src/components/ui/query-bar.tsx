import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { EMPTY_QUERY, addValues, isEmptyQuery, parseQuery, removeToken, serializeQuery, type Query } from '@/lib/query'
import { buildSuggestions, isKeyDraft, relaxations, type Suggestion } from '@/lib/query-suggestions'
import { loadRecent, pushRecent, type RecentQuery } from '@/lib/saved-views'
import { cn } from '@/lib/utils'
import type { Event } from '@/types/api'
import { Button } from './button'
import { Icon } from './icon'
import { ImpactMark } from './impact-mark'
import { Kbd } from './kbd'
import { StatusMark } from './status-mark'

export interface QueryBarProps {
  query: Query
  onChange: (query: Query) => void
  /** Events in view: values and counts of the suggestions come from them. */
  events: Event[]
  /** Accessible name of the field. */
  label?: string
  className?: string
}

const textOf = (query: Query) => serializeQuery({ tokens: [], text: query.text })

/**
 * The page filter: removable key:value tokens and a field with suggestions (recent queries,
 * keys, values with their count, free text). ↵ adds, ⌫ on an empty field removes the last
 * token, esc closes. `/` focuses it from anywhere (data-page-filter).
 */
export function QueryBar({ query, onChange, events, label = 'Filter events', className }: QueryBarProps) {
  const id = useId()
  const listId = `${id}-suggestions`
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(() => textOf(query))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useState<RecentQuery[]>([])

  // The free text can change from outside (a saved view, the URL): the field follows it,
  // unless a key is being typed.
  const [syncedText, setSyncedText] = useState(textOf(query))
  if (textOf(query) !== syncedText) {
    setSyncedText(textOf(query))
    // Compare parsed forms, so that a trailing space being typed survives.
    const draftText = textOf({ tokens: [], text: parseQuery(draft).text })
    if (!isKeyDraft(draft) && draftText !== textOf(query)) setDraft(textOf(query))
  }

  const groups = useMemo(() => (open ? buildSuggestions(draft, query, events, recent) : []), [open, draft, query, events, recent])
  const flat = groups.flatMap((g) => g.items)
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0))

  function commit(next: Query) {
    onChange(next)
    if (!isEmptyQuery(next)) setRecent(pushRecent(serializeQuery(next)))
  }

  function openSuggestions() {
    setRecent(loadRecent())
    setOpen(true)
  }

  function typeDraft(value: string) {
    setDraft(value)
    setActive(0)
    if (!open) openSuggestions()
    // Free text filters as you type; a key being typed waits for its value.
    onChange({ tokens: query.tokens, text: isKeyDraft(value) ? [] : parseQuery(value).text })
  }

  function pick(item: Suggestion) {
    const action = item.action
    if (action.kind === 'replace') {
      commit(action.query)
      setDraft(textOf(action.query))
      setOpen(false)
    } else if (action.kind === 'type') {
      setDraft(action.text)
      setActive(0)
      onChange({ tokens: query.tokens, text: [] })
      inputRef.current?.focus()
    } else if (action.kind === 'add') {
      commit(addValues({ tokens: query.tokens, text: [] }, action.key, [action.value], action.neg))
      setDraft('')
      setActive(0)
      inputRef.current?.focus()
    } else {
      // Free text: tokens typed in full ("env:mco checkout") become tokens too.
      const parsed = parseQuery(draft)
      let next: Query = { tokens: query.tokens, text: parsed.text }
      for (const t of parsed.tokens) next = addValues(next, t.key, t.values, t.neg)
      commit(next)
      setDraft(textOf(next))
      setOpen(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return openSuggestions()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setActive(Math.min(Math.max(activeIndex + delta, 0), Math.max(flat.length - 1, 0)))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = open ? flat[activeIndex] : undefined
      if (item) pick(item)
      else if (draft.trim()) pick({ id: 'text', label: '', mono: false, icon: 'search', action: { kind: 'text' } })
    } else if (e.key === 'Escape') {
      if (open) {
        e.stopPropagation()
        setOpen(false)
      } else {
        inputRef.current?.blur()
      }
    } else if (e.key === 'Backspace' && !draft && query.tokens.length) {
      e.preventDefault()
      onChange(removeToken(query, query.tokens.length - 1))
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const hasQuery = !isEmptyQuery(query) || !!draft.trim()
  let optionIndex = -1

  return (
    <div className={cn('relative min-w-0', className)}>
      <div
        role="group"
        aria-label="Filter"
        className={cn(
          'box-border flex min-h-control-md flex-wrap items-center gap-1.5 rounded-md border bg-surface px-2 py-1 text-muted',
          'focus-within:border-ink',
          'border-rule-strong',
        )}
      >
        <Icon name="filter" />
        {query.tokens.map((token, i) => {
          const values = token.values.join(', ')
          return (
            <span
              key={`${token.neg ? '-' : ''}${token.key}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-rule-strong bg-surface pr-[3px] pl-2.5 font-mono text-[12px] text-ink"
            >
              <span className="text-muted">{`${token.neg ? '-' : ''}${token.key}`}</span>
              <span>{token.neg ? `≠ ${values}` : values}</span>
              <button
                type="button"
                aria-label={`Remove filter ${token.neg ? 'not ' : ''}${token.key} ${token.values.join(' ')}`}
                onClick={() => onChange(removeToken(query, i))}
                className="inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-xs text-muted hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
              >
                <Icon name="close" size={12} />
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={open && flat.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && flat.length ? `${listId}-${activeIndex}` : undefined}
          data-page-filter=""
          value={draft}
          placeholder={query.tokens.length ? 'Add a filter or search…' : 'Filter by env, status, type, team, service — or type to search'}
          onChange={(e) => typeDraft(e.target.value)}
          onFocus={openSuggestions}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="h-7 min-w-[140px] flex-[1_1_160px] border-0 bg-transparent font-sans text-[14px] text-ink outline-0 placeholder:text-muted"
        />
        {hasQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(EMPTY_QUERY)
              setDraft('')
            }}
          >
            Clear
          </Button>
        )}
        <Kbd>/</Kbd>
      </div>

      {open && flat.length > 0 && (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 overflow-hidden rounded-lg border border-rule bg-overlay shadow-overlay">
          <div id={listId} role="listbox" aria-label="Suggestions" className="max-h-[360px] overflow-y-auto py-1.5">
            {groups.map((group) => (
              <div key={group.label} role="group" aria-label={group.label}>
                <div aria-hidden="true" className="px-space-4 pt-2.5 pb-1 font-mono text-[11px] leading-4 text-muted">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  optionIndex += 1
                  const index = optionIndex
                  const selected = index === activeIndex
                  return (
                    <div
                      key={item.id}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        pick(item)
                      }}
                      onMouseEnter={() => setActive(index)}
                      className={cn('flex cursor-pointer items-center gap-2.5 px-space-4 py-2 text-[14px] text-ink', selected && 'bg-signature-wash')}
                    >
                      {item.status ? (
                        <StatusMark status={item.status} label={false} />
                      ) : item.impact ? (
                        <ImpactMark compact />
                      ) : (
                        <Icon name={item.icon} className={selected ? 'text-ink' : 'text-muted'} />
                      )}
                      <span className={cn('min-w-0 flex-1 truncate', item.mono && 'font-mono')}>{item.label}</span>
                      {item.hint && <span className="whitespace-nowrap font-mono text-[11px] text-muted">{item.hint}</span>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="flex flex-wrap gap-space-4 border-t border-rule px-space-4 py-2.5 font-mono text-[11px] text-muted">
            <span>↵ add</span>
            <span>key:a,b</span>
            <span>-key:value excludes</span>
            <span>⌫ removes the last filter</span>
            <span>esc close</span>
          </div>
        </div>
      )}
    </div>
  )
}

export interface QueryEmptyStateProps {
  query: Query
  /** All the events of the period, unfiltered. */
  events: Event[]
  onChange: (query: Query) => void
  /** "No events match" by default. */
  what?: string
}

/** For an empty result: says what matched nothing and offers which filter to remove. */
export function QueryEmptyState({ query, events, onChange, what = 'No events match' }: QueryEmptyStateProps) {
  const options = relaxations(events, query)
  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-rule bg-surface p-space-4">
      <span className="text-body">
        {what} <span className="font-mono text-[12px]">{serializeQuery(query)}</span>.
      </span>
      <div className="flex flex-wrap items-center gap-space-2">
        {options.length > 0 && <span className="font-mono text-[11px] text-muted">try without</span>}
        {options.map((option) => (
          <Button key={option.label} variant="secondary" size="sm" onClick={() => onChange(option.query)}>
            {`${option.label} · ${option.count} ${option.count === 1 ? 'result' : 'results'}`}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_QUERY)}>
          Clear all
        </Button>
      </div>
    </div>
  )
}
