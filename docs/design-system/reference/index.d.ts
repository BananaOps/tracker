// Tracker — component props (documentation). Global: window.Tracker
import * as React from 'react';

export type Status = 'failed' | 'warning' | 'running' | 'done' | 'open';
export type IconName = 'dashboard' | 'timeline' | 'streamline' | 'calendar' | 'overlaps' | 'insights' | 'catalog' | 'architecture' | 'compliance' | 'drifts' | 'rpa' | 'locks' | 'links' | 'docs' | 'deployment' | 'operation' | 'incident' | 'service' | 'now' | 'rows' | 'search' | 'filter' | 'plus' | 'close' | 'chevron-down' | 'arrow-right' | 'copy' | 'environment' | 'owner' | 'impact' | 'pull-request' | 'ticket';

export interface LogoProps { /** Symbol height in px. Default 24. */ size?: number; /** Show the "tracker" wordmark. Default true. */ word?: boolean; }
export interface IconProps { name: IconName; /** px, default 16 (drawn on a 16 px grid). */ size?: number; /** Accessible name; omit for decorative icons. */ title?: string; className?: string; }
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'md' | 'sm'; icon?: IconName; iconRight?: IconName; }
export interface KbdProps { children: React.ReactNode; }
export interface HighlightProps { children: React.ReactNode; /** Mono 11 px chip for data ("running", "now 15:31"). */ data?: boolean; }
export interface StatusMarkProps { status: Status; /** Override the label text. */ text?: string; /** false renders the glyph alone, coloured by tone, with the label as its accessible name. Default true (tag). */ label?: boolean; /** Glyph size in px when label is false. Default 14. */ size?: number; }
export interface ImpactMarkProps { /** Icon only, 22 × 22. Use in rows and dense places. */ compact?: boolean; /** Label, default "impact". */ text?: string; /** Tooltip and accessible name, default "Users impacted". */ title?: string; }
export interface EventRowProps { id?: string | number; time: string; status: Status; title: string; /** Shows a compact ImpactMark before the status tag. */ impact?: boolean; meta?: string | string[]; density?: 'comfortable' | 'compact'; selected?: boolean; onSelect?: () => void; }
export interface EventListProps { events: EventRowProps[]; density?: 'comfortable' | 'compact'; selectedId?: string | number; onSelect?: (event: EventRowProps) => void; label?: string; }
export interface Metric { label: string; value: string; sub?: string; tone?: 'failed' | 'warning' | 'impact'; /** Comparison with the previous period, e.g. "−3.2 pts vs prev." */ delta?: string; /** worse: amber with a warning glyph; better and flat stay neutral. */ trend?: 'better' | 'worse' | 'flat'; }
export interface MetricStripProps { items: Metric[]; label?: string; }
export interface SegmentedControlProps { options: string[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; label?: string; }
export interface Filter { key: string; value: string; }
export interface FilterBarProps { filters?: Filter[]; periods?: string[]; period?: string; scope?: string; onRemove?: (f: Filter, index: number) => void; onAdd?: () => void; onPeriodChange?: (p: string) => void; }
export interface NavItem { name: string; icon?: IconName; href?: string; count?: number | string; }
export interface SidebarProps { groups: { label: string; items: NavItem[] }[]; active?: string; logo?: boolean; homeHref?: string; /** Icon rail, 60 px wide: names become tooltips and accessible names, counts become badges. */ collapsed?: boolean; /** Shows a collapse / expand button at the bottom. */ onToggle?: () => void; }
export interface TimeRulerProps { /** First hour shown. Default 12. */ startHour?: number; /** Last hour. Default 18. */ endHour?: number; /** Alias of startHour (reserved on x-import: use start-hour). */ from?: number; /** Alias of endHour. */ to?: number; /** "HH:MM" */ now?: string; marks?: { at: string; status: Status }[]; width?: number; label?: string; }
export interface PaletteItem { label: string; icon?: IconName; hint?: string; kbd?: string; }
export interface CommandPaletteProps { groups: { label: string; items: PaletteItem[] }[]; defaultQuery?: string; placeholder?: string; autoFocus?: boolean; onSelect?: (item: PaletteItem) => void; onClose?: () => void; }
export type EventType = 'deployment' | 'operation' | 'drift' | 'incident' | 'rpa_usage';
export interface EventLink { /** "#1287", "PAY-342" */ label: string; href?: string; /** PR or ticket title, shown as tooltip */ title?: string; }
export interface DrawerEvent {
  status: Status; time: string; title: string;
  type?: EventType; priority?: string;
  /** Header chips; each one filters the time views on click (onFilter). */
  service?: string; environment?: string; owner?: string; stakeholders?: string[];
  /** true: full-width impact band in --impact; false: quiet "No user impact declared"; undefined: nothing. */
  impact?: boolean; impactNote?: string;
  /** null shows a dashed empty slot with a + button; undefined hides the link row. */
  pullRequest?: EventLink | null; ticket?: EventLink | null;
  /** Legacy meta line, shown only when service / environment / owner are absent. */
  meta?: string | string[];
  summary?: string; /** Secondary details: [label, value, href?] */ fields?: [string, string, string?][]; history?: { time: string; status: Status; text: string }[];
}
export interface EventDrawerProps { event: DrawerEvent; onClose?: () => void; /** key is 'service' | 'env' | 'owner' */ onFilter?: (key: string, value: string) => void; onLinkTicket?: () => void; onLinkPullRequest?: () => void; actions?: boolean; style?: React.CSSProperties; }

export declare const Logo: React.FC<LogoProps>;
export declare const Icon: React.FC<IconProps>;
export declare const Button: React.FC<ButtonProps>;
export declare const Kbd: React.FC<KbdProps>;
export declare const Highlight: React.FC<HighlightProps>;
export declare const ImpactMark: React.FC<ImpactMarkProps>;
export declare const StatusMark: React.FC<StatusMarkProps>;
export declare const EventRow: React.FC<EventRowProps>;
export declare const EventList: React.FC<EventListProps>;
export declare const MetricStrip: React.FC<MetricStripProps>;
export declare const SegmentedControl: React.FC<SegmentedControlProps>;
export declare const FilterBar: React.FC<FilterBarProps>;
export declare const Sidebar: React.FC<SidebarProps>;
export declare const TimeRuler: React.FC<TimeRulerProps>;
export declare const CommandPalette: React.FC<CommandPaletteProps>;
export declare const EventDrawer: React.FC<EventDrawerProps>;
export declare const icons: Record<IconName, (string | { d: string; dash?: string; cap?: string })[]>;
