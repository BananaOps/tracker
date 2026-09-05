import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import AdminPageShell from './AdminPageShell'
import { AdminTable, Cell, EmptyRow, QUERY_KEYS, Row } from '../../components/admin/adminUi'
import { ConfirmDialog } from '../../components/admin/ConfirmDialog'
import { TeamFormDialog } from '../../components/admin/TeamFormDialog'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import Toast from '../../components/Toast'
import { authApi, getApiErrorMessage } from '../../lib/authApi'
import type { Team, TeamInput } from '../../types/auth'

const COLUMNS = ['Name', 'Description', 'Permissions', 'Scope', 'OIDC groups', 'Members', 'Actions']

export default function TeamsPage() {
  const queryClient = useQueryClient()
  const teamsQuery = useQuery({ queryKey: QUERY_KEYS.teams, queryFn: authApi.listTeams })
  const usersQuery = useQuery({ queryKey: QUERY_KEYS.users, queryFn: authApi.listUsers })

  const [dialog, setDialog] = useState<{ open: boolean; team?: Team }>({ open: false })
  const [deleting, setDeleting] = useState<Team | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const membersOf = useMemo(() => {
    const users = usersQuery.data ?? []
    return (teamId: string) => users.filter((u) => u.teamIds.includes(teamId))
  }, [usersQuery.data])

  const closeDialog = useCallback(() => {
    setDialog({ open: false })
    setError(null)
  }, [])

  // A team rename or removal can also invalidate what users/apiKeys have
  // cached (team names shown inline, ids that stop resolving), so those two
  // callers pass their query keys along; a fresh team never appears there.
  const onSuccess = (message: string, alsoInvalidate: (readonly unknown[])[] = []) => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams })
    for (const queryKey of alsoInvalidate) void queryClient.invalidateQueries({ queryKey })
    closeDialog()
    setDeleting(null)
    setToast(message)
  }

  const createMutation = useMutation({
    mutationFn: (input: TeamInput) => authApi.createTeam(input),
    onSuccess: () => onSuccess('Team created'),
    onError: (err) => setError(getApiErrorMessage(err, 'Could not create the team')),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TeamInput }) => authApi.updateTeam(id, input),
    onSuccess: () => onSuccess('Team updated', [QUERY_KEYS.users, QUERY_KEYS.apiKeys]),
    onError: (err) => setError(getApiErrorMessage(err, 'Could not update the team')),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => authApi.deleteTeam(id),
    onSuccess: () => onSuccess('Team deleted', [QUERY_KEYS.users, QUERY_KEYS.apiKeys]),
    onError: (err) => {
      setDeleting(null)
      setToast(getApiErrorMessage(err, 'Could not delete the team'))
    },
  })

  const pending = createMutation.isPending || updateMutation.isPending
  const teams = teamsQuery.data ?? []

  const submit = (input: TeamInput) => {
    if (dialog.team) updateMutation.mutate({ id: dialog.team.id, input })
    else createMutation.mutate(input)
  }

  return (
    <AdminPageShell
      title="Teams"
      description="Teams grant permissions to their members and to their API keys."
      actions={
        <Button size="sm" className="gap-2" onClick={() => setDialog({ open: true })}>
          <Plus className="w-4 h-4" />
          New team
        </Button>
      }
    >
      {teamsQuery.isError && (
        <p role="alert" className="text-sm" style={{ color: 'rgb(var(--hud-error))' }}>
          {getApiErrorMessage(teamsQuery.error, 'Could not load teams')}
        </p>
      )}
      <AdminTable columns={COLUMNS}>
        {teamsQuery.isPending && <EmptyRow colSpan={COLUMNS.length} message="Loading..." />}
        {teamsQuery.isSuccess && teams.length === 0 && <EmptyRow colSpan={COLUMNS.length} message="No team yet." />}
        {teams.map((t) => (
          <Row key={t.id}>
            <Cell className="font-medium">
              <span className="inline-flex items-center gap-2">
                {t.name}
                {t.builtin && <Badge variant="secondary">builtin</Badge>}
              </span>
            </Cell>
            <Cell className="text-hud-on-surface-var">{t.description || '-'}</Cell>
            <Cell>
              <span title={t.permissions.join(', ')}>
                <Badge variant="outline">{t.permissions.length} permission{t.permissions.length === 1 ? '' : 's'}</Badge>
              </span>
            </Cell>
            <Cell className="text-hud-on-surface-var">{t.scopeAll ? 'All services' : `${t.scopeServices.length} services`}</Cell>
            <Cell>
              {t.oidcGroups.length === 0 ? (
                <span className="text-hud-on-surface-var">-</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {t.oidcGroups.map((g) => (
                    <span key={g} className="rounded-full px-2 py-0.5 text-xs bg-hud-surface-high text-hud-on-surface">{g}</span>
                  ))}
                </div>
              )}
            </Cell>
            <Cell>{membersOf(t.id).length}</Cell>
            <Cell>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setDialog({ open: true, team: t })}>
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
                {!t.builtin && (
                  <Button size="sm" variant="ghost" className="gap-1.5" style={{ color: 'rgb(var(--hud-error))' }} onClick={() => setDeleting(t)}>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            </Cell>
          </Row>
        ))}
      </AdminTable>

      <TeamFormDialog
        open={dialog.open}
        team={dialog.team}
        members={dialog.team ? membersOf(dialog.team.id) : []}
        pending={pending}
        error={error}
        onSubmit={submit}
        onClose={closeDialog}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete team"
        message={deleting ? `Delete team ${deleting.name}? Members lose its permissions and its API keys stop working.` : ''}
        confirmLabel="Delete team"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </AdminPageShell>
  )
}
