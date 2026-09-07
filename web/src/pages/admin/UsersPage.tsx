import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, UserPlus } from 'lucide-react'
import AdminPageShell from './AdminPageShell'
import { AdminTable, Cell, EmptyRow, QUERY_KEYS, Row } from '../../components/admin/adminUi'
import { UserFormDialog } from '../../components/admin/UserFormDialog'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import Toast from '../../components/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { authApi, getApiErrorMessage } from '../../lib/authApi'
import type { CreateUserInput, UpdateUserInput, User } from '../../types/auth'

const COLUMNS = ['Username', 'Display name', 'Email', 'Source', 'Teams', 'Status', 'Actions']

export default function UsersPage() {
  const { principal } = useAuth()
  const queryClient = useQueryClient()
  const usersQuery = useQuery({ queryKey: QUERY_KEYS.users, queryFn: authApi.listUsers })
  const teamsQuery = useQuery({ queryKey: QUERY_KEYS.teams, queryFn: authApi.listTeams })

  const [dialog, setDialog] = useState<{ open: boolean; user?: User }>({ open: false })
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const teamName = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of teamsQuery.data ?? []) map.set(t.id, t.name)
    return (id: string) => map.get(id) ?? id
  }, [teamsQuery.data])

  const closeDialog = useCallback(() => {
    setDialog({ open: false })
    setError(null)
  }, [])

  const onSuccess = (message: string) => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
    closeDialog()
    setToast(message)
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput) => authApi.createUser(input),
    onSuccess: () => onSuccess('User created'),
    onError: (err) => setError(getApiErrorMessage(err, 'Could not create the user')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => authApi.updateUser(id, input),
    onSuccess: () => onSuccess('User updated'),
    onError: (err) => setError(getApiErrorMessage(err, 'Could not update the user')),
  })

  const pending = createMutation.isPending || updateMutation.isPending
  const users = usersQuery.data ?? []

  return (
    <AdminPageShell
      title="Users"
      description="Local and identity provider accounts and their teams."
      actions={
        <Button size="sm" className="gap-2" onClick={() => setDialog({ open: true })}>
          <UserPlus className="w-4 h-4" />
          New user
        </Button>
      }
    >
      {usersQuery.isError && (
        <p role="alert" className="text-sm" style={{ color: 'rgb(var(--hud-error))' }}>
          {getApiErrorMessage(usersQuery.error, 'Could not load users')}
        </p>
      )}
      <AdminTable columns={COLUMNS}>
        {usersQuery.isPending && <EmptyRow colSpan={COLUMNS.length} message="Loading..." />}
        {usersQuery.isSuccess && users.length === 0 && <EmptyRow colSpan={COLUMNS.length} message="No user yet." />}
        {users.map((u) => (
          <Row key={u.id}>
            <Cell className="font-medium">
              {u.username} {u.id === principal.userId && <span className="text-xs text-hud-on-surface-var">(you)</span>}
            </Cell>
            <Cell>{u.displayName}</Cell>
            <Cell className="text-hud-on-surface-var">{u.email || '-'}</Cell>
            <Cell><Badge variant={u.source === 'local' ? 'secondary' : 'outline'}>{u.source}</Badge></Cell>
            <Cell className="text-hud-on-surface-var">{u.teamIds.length ? u.teamIds.map(teamName).join(', ') : '-'}</Cell>
            <Cell>
              <div className="flex flex-wrap items-center gap-1.5">
                {u.disabled ? <Badge variant="destructive">Disabled</Badge> : <Badge variant="success">Active</Badge>}
                {u.mustChangePassword && <Badge variant="warning">Password change required</Badge>}
              </div>
            </Cell>
            <Cell>
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setDialog({ open: true, user: u })}>
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
            </Cell>
          </Row>
        ))}
      </AdminTable>

      <UserFormDialog
        open={dialog.open}
        user={dialog.user}
        teams={teamsQuery.data ?? []}
        currentUserId={principal.userId}
        pending={pending}
        error={error}
        onCreate={(input) => createMutation.mutate(input)}
        onUpdate={(id, input) => updateMutation.mutate({ id, input })}
        onClose={closeDialog}
      />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </AdminPageShell>
  )
}
