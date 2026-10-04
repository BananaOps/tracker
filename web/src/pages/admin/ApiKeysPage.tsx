import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Plus } from 'lucide-react'
import AdminPageShell from './AdminPageShell'
import { AdminTable, Cell, EmptyRow, formatDate, QUERY_KEYS, Row } from '../../components/admin/adminUi'
import { ApiKeyCreateDialog } from '../../components/admin/ApiKeyCreateDialog'
import { ConfirmDialog } from '../../components/admin/ConfirmDialog'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import Toast from '../../components/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { authApi, getApiErrorMessage } from '../../lib/authApi'
import type { ApiKey, CreateApiKeyInput, CreateApiKeyResult } from '../../types/auth'

const COLUMNS = ['Prefix', 'Name', 'Team', 'Created by', 'Created', 'Last used', 'Expires', 'Status', 'Actions']

type KeyStatus = 'active' | 'revoked' | 'expired'

function keyStatus(key: ApiKey, now: number = Date.now()): KeyStatus {
  if (key.revokedAt) return 'revoked'
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= now) return 'expired'
  return 'active'
}

function StatusBadge({ status }: { status: KeyStatus }) {
  if (status === 'revoked') return <Badge variant="destructive">Revoked</Badge>
  if (status === 'expired') return <Badge variant="warning">Expired</Badge>
  return <Badge variant="success">Active</Badge>
}

export default function ApiKeysPage() {
  const { principal } = useAuth()
  const queryClient = useQueryClient()
  const keysQuery = useQuery({ queryKey: QUERY_KEYS.apiKeys, queryFn: authApi.listApiKeys })
  const teamsQuery = useQuery({ queryKey: QUERY_KEYS.teams, queryFn: authApi.listTeams })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [result, setResult] = useState<CreateApiKeyResult | null>(null)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const teamName = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of teamsQuery.data ?? []) map.set(t.id, t.name)
    return (id: string) => map.get(id) ?? id
  }, [teamsQuery.data])

  const createMutation = useMutation({
    mutationFn: (input: CreateApiKeyInput) => authApi.createApiKey(input),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apiKeys })
      setError(null)
      setResult(created)
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not create the API key')),
  })

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setResult(null)
    setError(null)
    createMutation.reset()
  }, [createMutation])

  const revokeMutation = useMutation({
    mutationFn: (id: string) => authApi.revokeApiKey(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apiKeys })
      setRevoking(null)
      setToast('API key revoked')
    },
    onError: (err) => {
      setRevoking(null)
      setToast(getApiErrorMessage(err, 'Could not revoke the API key'))
    },
  })

  const keys = keysQuery.data ?? []

  return (
    <AdminPageShell
      title="API keys"
      description="Keys for automation, sent in the X-Api-Key header. A key carries the permissions of its team; global keys act as administrators."
      actions={
        <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          New API key
        </Button>
      }
    >
      {keysQuery.isError && (
        <p role="alert" className="text-sm" style={{ color: 'rgb(var(--hud-error))' }}>
          {getApiErrorMessage(keysQuery.error, 'Could not load API keys')}
        </p>
      )}
      <AdminTable columns={COLUMNS}>
        {keysQuery.isPending && <EmptyRow colSpan={COLUMNS.length} message="Loading..." />}
        {keysQuery.isSuccess && keys.length === 0 && <EmptyRow colSpan={COLUMNS.length} message="No API key yet." />}
        {keys.map((k) => {
          const status = keyStatus(k)
          return (
            <Row key={k.id}>
              <Cell className="font-mono text-xs">{k.prefix}</Cell>
              <Cell className="font-medium">{k.name}</Cell>
              <Cell>{k.teamId ? teamName(k.teamId) : <Badge variant="default">Global</Badge>}</Cell>
              <Cell className="text-hud-on-surface-var">{k.createdBy || '-'}</Cell>
              <Cell className="text-hud-on-surface-var">{formatDate(k.createdAt)}</Cell>
              <Cell className="text-hud-on-surface-var">{formatDate(k.lastUsedAt)}</Cell>
              <Cell className="text-hud-on-surface-var">{formatDate(k.expiresAt)}</Cell>
              <Cell><StatusBadge status={status} /></Cell>
              <Cell>
                {status !== 'revoked' && (
                  <Button size="sm" variant="ghost" className="gap-1.5" style={{ color: 'rgb(var(--hud-error))' }} onClick={() => setRevoking(k)}>
                    <Ban className="w-3.5 h-3.5" />
                    Revoke
                  </Button>
                )}
              </Cell>
            </Row>
          )
        })}
      </AdminTable>

      <ApiKeyCreateDialog
        open={dialogOpen}
        teams={teamsQuery.data ?? []}
        canCreateGlobal={principal.isAdmin}
        pending={createMutation.isPending}
        error={error}
        result={result}
        onSubmit={(input) => createMutation.mutate(input)}
        onClose={closeDialog}
      />
      <ConfirmDialog
        open={revoking !== null}
        title="Revoke API key"
        message={revoking ? `Revoke key ${revoking.prefix} (${revoking.name})? Calls using it will be rejected immediately.` : ''}
        confirmLabel="Revoke key"
        destructive
        pending={revokeMutation.isPending}
        onConfirm={() => revoking && revokeMutation.mutate(revoking.id)}
        onClose={() => setRevoking(null)}
      />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </AdminPageShell>
  )
}
