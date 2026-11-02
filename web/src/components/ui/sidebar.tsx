import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Icon } from './icon'
import type { IconName } from './icons'
import { Logo } from './logo'

export interface NavItem {
  name: string
  icon?: IconName
  to: string
  /** Only a number that calls for action (active locks, open drifts). */
  count?: number | string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export interface SidebarProps {
  groups: NavGroup[]
  /** Name of the active item, highlighted in signature. */
  active?: string
  logo?: boolean
  homeTo?: string
  /** Icon rail, 60 px wide: names become tooltips and accessible names, counts become badges. */
  collapsed?: boolean
  /** Shows a collapse / expand button at the bottom. */
  onToggle?: () => void
  /** Content at the bottom, above the toggle (theme, external links). */
  footer?: ReactNode
  className?: string
  style?: CSSProperties
}

/** The main navigation in four groups. The active page is the "you are here" of the brand. */
export function Sidebar({ groups, active, logo = true, homeTo = '/', collapsed = false, onToggle, footer, className, style }: SidebarProps) {
  return (
    <aside
      style={style}
      className={cn(
        'box-border flex flex-col border-r border-rule bg-surface',
        collapsed ? 'w-[60px] items-center gap-[18px] px-2.5 py-4' : 'w-sidebar-w gap-[22px] px-3.5 pt-[18px] pb-6',
        className,
      )}
    >
      {logo && (
        <Link
          to={homeTo}
          aria-label="Tracker home"
          className={cn(
            'inline-flex rounded-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
            collapsed ? 'p-0' : 'px-1.5 py-0.5',
          )}
        >
          <Logo size={collapsed ? 28 : 26} word={!collapsed} />
        </Link>
      )}
      <nav aria-label="Main" className={cn('-mx-1 flex min-h-0 flex-col overflow-y-auto px-1', collapsed ? 'items-center gap-2.5' : 'gap-[18px]')}>
        {groups.map((group) => (
          <div
            key={group.label}
            role={collapsed ? 'group' : undefined}
            aria-label={collapsed ? group.label : undefined}
            className={cn(
              'flex flex-col gap-0.5',
              collapsed && 'items-center not-first:border-t not-first:border-rule not-first:pt-2.5',
            )}
          >
            {!collapsed && <span className="px-2.5 pb-1.5 font-mono text-[11px] leading-4 text-muted">{group.label}</span>}
            {group.items.map((item) => {
              const current = item.name === active
              const hint = item.count != null ? `${item.name} (${item.count})` : item.name
              return (
                <Link
                  key={item.name}
                  to={item.to}
                  aria-current={current ? 'page' : undefined}
                  aria-label={collapsed || item.count != null ? hint : undefined}
                  title={collapsed ? hint : undefined}
                  className={cn(
                    'group/item flex items-center rounded-sm text-[14px] leading-5 no-underline',
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                    collapsed ? 'relative box-border h-9 w-10 justify-center p-0' : 'gap-2.5 px-2.5 py-[7px]',
                    current ? 'bg-signature font-semibold text-on-signature' : 'text-ink hover:bg-sunken',
                  )}
                >
                  {item.icon && (
                    <Icon
                      name={item.icon}
                      className={current ? 'text-on-signature' : 'text-muted group-hover/item:text-ink'}
                    />
                  )}
                  {!collapsed && <span>{item.name}</span>}
                  {item.count != null && (
                    <span
                      className={cn(
                        'font-mono',
                        collapsed
                          ? 'absolute top-[3px] right-[3px] box-border h-3.5 min-w-3.5 rounded-[7px] bg-ink px-[3px] text-center text-[9px] leading-[14px] text-on-ink'
                          : 'ml-auto text-[11px] opacity-75',
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      {(footer || onToggle) && (
        <div className={cn('mt-auto flex flex-col gap-2', collapsed && 'items-center')}>
          {footer}
          {onToggle && (
            <Button
              variant="ghost"
              size="sm"
              icon={collapsed ? 'arrow-right' : 'rows'}
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              onClick={onToggle}
            >
              {collapsed ? null : 'Collapse'}
            </Button>
          )}
        </div>
      )}
    </aside>
  )
}
