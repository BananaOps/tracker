import type { ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { Permission } from '../../types/auth'

interface CanProps {
  perm: Permission
  /** Rendered when the permission is missing. Defaults to nothing. */
  fallback?: ReactNode
  children: ReactNode
}

/** Renders its children only when the current principal holds `perm`. */
export function Can({ perm, fallback = null, children }: CanProps) {
  const { hasPermission } = useAuth()
  return <>{hasPermission(perm) ? children : fallback}</>
}
