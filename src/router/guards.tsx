import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { Rol } from '@/types'
import { Cargando } from '@/components/Estados'
import { RUTA_CAMBIO_CONTRASENA, RUTA_INICIO, RUTA_LOGIN } from './rutas'

/**
 * Guards de UX, no seguridad — la autorización real la impone el backend
 * en cada request. Esto solo evita navegar a pantallas que no corresponden.
 */

export function RequireAuth({ children }: { children: ReactNode }) {
  const empleado = useAuthStore((s) => s.empleado)
  const cargando = useAuthStore((s) => s.cargando)
  const location = useLocation()

  if (cargando) return <Cargando mensaje="Verificando sesión…" />
  // Sin `state={{ from }}`: nadie lo leía — tras el login siempre se va a "/".
  // Si algún día se implementa el retorno a la ruta original, hay que validar
  // que sea una ruta interna antes de navegar; si no, es un open redirect.
  if (!empleado) return <Navigate to={RUTA_LOGIN} replace />
  if (empleado.requiere_cambio_contrasena && location.pathname !== RUTA_CAMBIO_CONTRASENA) {
    return <Navigate to={RUTA_CAMBIO_CONTRASENA} replace />
  }
  return <>{children}</>
}

export function RequireRol({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const empleado = useAuthStore((s) => s.empleado)
  const cargando = useAuthStore((s) => s.cargando)

  if (cargando) return <Cargando mensaje="Verificando sesión…" />
  if (!empleado) return <Navigate to={RUTA_LOGIN} replace />
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
        <Button type="primary" onClick={() => navigate(RUTA_INICIO)}>
          Volver al inicio
        </Button>
      }
    />
  )
}
