import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Empty, Spinner } from './ui'

export function RequireAuth({ children, staff = false }: { children: ReactNode; staff?: boolean }) {
  const { session, loading, profileLoading, isStaff } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) return <Spinner />
  if (!session) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (staff && !isStaff) {
    return <Empty>Esta sección es solo para profesores y administradores.</Empty>
  }
  return <>{children}</>
}
