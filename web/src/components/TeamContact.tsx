import { ExternalLink, Mail, User } from 'lucide-react'
import { CommunicationType, type Catalog } from '../types/api'

// Owner and communication channels of a catalog entry, as shown on the
// overlaps page to reach the team of a conflicting event.
export default function TeamContact({ catalog }: { catalog: Pick<Catalog, 'owner' | 'communicationChannels'> }) {
  return (
    <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid rgb(var(--hud-outline-var) / 0.1)' }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>Team Contact</p>
      {catalog.owner && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
          <User className="w-3 h-3" />
          <span>{catalog.owner}</span>
        </div>
      )}
      {catalog.communicationChannels?.map((channel, i) => (
        <a
          key={`${channel.type}-${i}`}
          href={channel.url}
          target="_blank"
          rel="noopener noreferrer"
          title={channel.description || channel.name}
          className="flex items-center gap-2 text-xs transition-opacity hover:opacity-70"
          style={{ color: 'rgb(var(--hud-primary))' }}
        >
          {channel.type === CommunicationType.EMAIL ? <Mail className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
          <span>{channel.name}</span>
        </a>
      ))}
    </div>
  )
}
