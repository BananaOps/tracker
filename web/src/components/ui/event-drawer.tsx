import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import type { DrawerEvent, EventLink } from '@/lib/event-drawer'
import { statusTone, toTypeIcon } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Icon } from './icon'
import type { IconName } from './icons'
import { Glyph, StatusMark } from './status-mark'

export type DrawerFilterKey = 'service' | 'env' | 'owner'

export interface EventDrawerProps {
  event: DrawerEvent
  onClose?: () => void
  /** Header chips filter the time views on their value. */
  onFilter?: (key: DrawerFilterKey, value: string) => void
  onLinkTicket?: () => void
  onLinkPullRequest?: () => void
  /** Footer: at most three actions, one primary. */
  actions?: ReactNode
  className?: string
  style?: CSSProperties
}

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'

function Chip({ icon, hint, onClick, children }: { icon: IconName; hint: string; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={hint}
      aria-label={hint}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 max-w-full cursor-pointer items-center gap-1.5 rounded-sm border border-rule-strong bg-surface px-2.5',
        'text-[13px] font-medium text-ink transition-colors duration-[120ms] ease-ds hover:border-ink',
        FOCUS,
      )}
    >
      <Icon name={icon} size={14} className="text-muted" />
      <span className="min-w-0 truncate">{children}</span>
    </button>
  )
}

function LinkButton({
  icon,
  link,
  prefix = '',
  emptyLabel,
  addLabel,
  onAdd,
}: {
  icon: IconName
  link: EventLink | null | undefined
  prefix?: string
  emptyLabel: string
  addLabel: string
  onAdd?: () => void
}) {
  const base = 'inline-flex h-[30px] max-w-full items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 font-mono text-[12px]'
  if (!link) {
    return (
      <span className={cn(base, 'border-dashed border-tag-line bg-transparent pr-0.5 font-normal text-muted')}>
        <Icon name={icon} size={14} />
        <span>{emptyLabel}</span>
        {onAdd && <Button variant="ghost" size="sm" icon="plus" aria-label={addLabel} onClick={onAdd} className="h-6 w-6" />}
      </span>
    )
  }
  const external = Boolean(link.href)
  return (
    <a
      href={link.href ?? '#'}
      title={link.title}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={cn(base, 'border-rule-strong bg-surface font-medium text-ink no-underline transition-colors duration-[120ms] ease-ds hover:border-ink', FOCUS)}
    >
      <Icon name={icon} size={14} />
      <span>
        {prefix}
        {link.label}
      </span>
      {external && (
        <span className="inline-flex text-muted">
          <Icon name="links" size={12} title="opens in a new tab" />
        </span>
      )}
    </a>
  )
}

function metaText(meta: DrawerEvent['meta']) {
  if (!meta) return ''
  return Array.isArray(meta) ? meta.filter(Boolean).join(' · ') : meta
}

/**
 * The detail of an event, in a drawer opened to the right of the list (drawer-w), without a
 * scrim so that the list stays readable. "Bandeau" layout: the facts people act on sit in the
 * header; user impact is its own full-width band. Esc closes it.
 */
export function EventDrawer({ event: ev, onClose, onFilter, onLinkTicket, onLinkPullRequest, actions, className, style }: EventDrawerProps) {
  const hasFacts = Boolean(ev.service || ev.environment || ev.owner)
  const hasLinks = ev.pullRequest !== undefined || ev.ticket !== undefined
  const filter = (key: DrawerFilterKey, value: string) => (onFilter ? () => onFilter(key, value) : undefined)
  const ownerHint = ev.stakeholders?.length
    ? `Owner ${ev.owner}, stakeholders: ${ev.stakeholders.join(', ')}`
    : `Filter by owner ${ev.owner}`
  const fields = ev.fields ?? []
  const history = ev.history ?? []

  function handleKey(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape' && onClose) {
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label={ev.title || 'Event detail'}
      onKeyDown={handleKey}
      style={style}
      className={cn(
        'box-border flex w-drawer-w max-w-full flex-col border-l border-rule bg-overlay text-ink shadow-overlay',
        'motion-safe:animate-drawer-in',
        className,
      )}
    >
      <header
        className={cn(
          'flex flex-col border-b border-rule px-space-6 pt-space-5 pb-space-4',
          hasFacts ? 'gap-space-3 bg-sunken' : 'gap-space-2',
        )}
      >
        <div className="flex items-center gap-space-3">
          {ev.type && (
            <span className="inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-[4px] border border-rule-strong bg-surface pr-2 pl-1.5 font-mono text-[11px] font-medium text-ink">
              <Icon name={toTypeIcon(ev.type)} size={12} />
              {String(ev.type).replace('_', ' ')}
            </span>
          )}
          <StatusMark status={ev.status} />
          <span className="font-mono text-[11px] leading-4 text-muted tabular-nums">{ev.time}</span>
          <Button variant="ghost" size="sm" icon="close" aria-label="Close detail" onClick={onClose} className="ml-auto" />
        </div>
        <h2 className="m-0 text-title">{ev.title}</h2>
        {hasFacts ? (
          <div className="flex flex-wrap gap-1.5">
            {ev.service && (
              <Chip icon="service" hint={`Filter by service ${ev.service}`} onClick={filter('service', ev.service)}>
                {ev.service}
              </Chip>
            )}
            {ev.environment && (
              <Chip icon="environment" hint={`Filter by environment ${ev.environment}`} onClick={filter('env', ev.environment)}>
                {ev.environment}
              </Chip>
            )}
            {ev.owner && (
              <Chip icon="owner" hint={ownerHint} onClick={filter('owner', ev.owner)}>
                {ev.owner}
              </Chip>
            )}
            {ev.priority && (
              <span title="Priority" className="inline-flex h-7 items-center rounded-sm border border-rule bg-transparent px-2.5 font-mono text-[12px] text-muted">
                {ev.priority}
              </span>
            )}
          </div>
        ) : (
          ev.meta && <span className="font-mono text-[11px] leading-4 text-muted">{metaText(ev.meta)}</span>
        )}
        {hasLinks && (
          <div className="flex flex-wrap gap-space-2">
            <LinkButton icon="pull-request" link={ev.pullRequest} prefix="PR " emptyLabel="no pull request" addLabel="Link a pull request" onAdd={onLinkPullRequest} />
            <LinkButton icon="ticket" link={ev.ticket} emptyLabel="no ticket" addLabel="Link a ticket" onAdd={onLinkTicket} />
          </div>
        )}
      </header>

      {ev.impact === true && (
        <div role="note" className="flex flex-wrap items-center gap-2.5 bg-impact px-space-6 py-3 text-on-impact">
          <Icon name="impact" size={16} />
          <span className="text-[14px] leading-5 font-semibold">Users impacted</span>
          {ev.impactNote && <span className="font-mono text-[11px] leading-4 opacity-85">{ev.impactNote}</span>}
        </div>
      )}
      {ev.impact === false && (
        <div className="flex items-center gap-2 border-b border-rule-soft px-space-6 py-2.5 text-[13px] text-muted">
          <Icon name="impact" size={14} />
          <span>No user impact declared</span>
        </div>
      )}

      <div className="flex flex-col gap-space-6 overflow-y-auto px-space-6 pt-space-4 pb-space-6">
        {ev.summary && <p className="m-0 text-body">{ev.summary}</p>}
        {fields.length > 0 && (
          <div>
            <h3 className="m-0 mb-space-2 font-mono text-[11px] font-normal text-muted">details</h3>
            <dl className="m-0 grid grid-cols-[112px_minmax(0,1fr)]">
              {fields.map(([label, value, href]) => (
                <div key={label} className="contents">
                  <dt className="border-t border-rule-soft py-1.5 font-mono text-[11px] leading-5 text-muted">{label}</dt>
                  <dd className="m-0 min-w-0 border-t border-rule-soft py-1.5 font-mono text-[12px] leading-5 wrap-anywhere text-ink">
                    {href ? (
                      <a href={href} className="text-ink underline-offset-[3px]">
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {history.length > 0 && (
          <div>
            <h3 className="m-0 mb-space-2 font-mono text-[11px] font-normal text-muted">history</h3>
            <ol className="m-0 flex list-none flex-col p-0">
              {history.map((item, i) => (
                <li key={i} className="grid grid-cols-[64px_12px_minmax(0,1fr)] items-center gap-x-space-3 py-1.5 text-[13px] leading-[19px]">
                  <time className="font-mono text-[11px] text-muted tabular-nums">{item.time}</time>
                  <span role="img" aria-label={item.status} className={cn('inline-flex', statusTone[item.status])}>
                    <Glyph status={item.status} size={12} />
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {actions && (
        <footer className="mt-auto flex flex-wrap justify-end gap-space-2 border-t border-rule px-space-6 py-space-4">{actions}</footer>
      )}
    </section>
  )
}
