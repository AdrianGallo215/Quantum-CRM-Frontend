import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { Rol } from '@/types'
import { Cargando } from '@/components/Estados'

/**
 * Guards de UX, no seguridad — la autorización real la impone el backend
 * en cada request. Esto solo evita navegar a pantallas que no corresponden.
 */

export function RequireAuth({ children }: { children: ReactNode }) {
  const empleado = useAuthStore((s) => s.empleado)
  const cargando = useAuthStore((s) => s.cargando)
  const location = useLocation()

  if (cargando) return <Cargando mensaje="Verificando sesión…" />
  if (!empleado) return <Navigate to="/login" state={{ from: location }} replace />
  if (empleado.requiere_cambio_contrasena && location.pathname !== '/cambiar-contrasena') {
    return <Navigate to="/cambiar-contrasena" replace />
  }
  return <>{children}</>
}

export function RequireRol({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const empleado = useAuthStore((s) => s.empleado)
  const cargando = useAuthStore((s) => s.cargando)

  if (cargando) return <Cargando mensaje="Verificando sesión…" />
  if (!empleado) return <Navigate to="/login" replace />
  if (!roles.includes(empleado.rol)) return <SinAcceso />
  return <>{children}</>
}

export function SinAcceso() {
  const navigate = useNavigate()
  return (
    <Result
      status="403"
      title="Sin acceso"
      subTitle="Tu rol no tiene permisos para ver esta sección."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
      }
    />
  )
}
