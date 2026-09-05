import AdminPageShell from './AdminPageShell'

export default function ApiKeysPage() {
  return (
    <AdminPageShell title="API keys" description="Keys for automation, sent in the X-Api-Key header.">
      <p className="text-sm text-hud-on-surface-var">Loading...</p>
    </AdminPageShell>
  )
}
