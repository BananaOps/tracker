import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { loginPathFor } from '../../lib/authEvents'
import type { Permission } from '../../types/auth'
import AccessDenied from './AccessDenied'

interface RequirePermissionProps {
  /** Permission the route needs. Omit to only require a signed-in user. */
  perm?: Permission
  /** Require a signed-in user (session cookie), whatever the permissions. */
  user?: boolean
  children: ReactNode
}

/**
 * Route guard. Anonymous visitors lacking access are sent to /login with a
 * redirect back here; signed-in users lacking access see AccessDenied.
 */
export function RequirePermission({ perm, user = false, children }: RequirePermissionProps) {
  const { principal, hasPermission } = useAuth()
  const location = useLocation()

  const isUser = principal.kind === 'user'
  const allowed = (perm ? hasPermission(perm) : true) && (user ? isUser : true)

  if (allowed) return <>{children}</>
  if (!principal.authenticated) {
    return <Navigate to={loginPathFor(location)} replace />
  }
  return <AccessDenied />
}
