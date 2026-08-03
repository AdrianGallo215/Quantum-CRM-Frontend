import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

/**
 * Restaura la sesión al montar la app: si la cookie httpOnly sigue viva,
 * GET /empleados/me devuelve el perfil; si no, quedamos deslogueados.
 */
export function useRestaurarSesion(): void {
  const setEmpleado = useAuthStore((s) => s.setEmpleado)
  const limpiar = useAuthStore((s) => s.limpiar)

  useEffect(() => {
    let activo = true
    authApi
      .me()
      .then((empleado) => {
        if (activo) setEmpleado(empleado)
      })
      .catch(() => {
        if (activo) limpiar()
      })
    return () => {
      activo = false
    }
  }, [setEmpleado, limpiar])
}

export function useLogout(): () => void {
  const queryClient = useQueryClient()
  const limpiar = useAuthStore((s) => s.limpiar)
  const navigate = useNavigate()

  return useCallback(() => {
    // El orden importa: primero se cierra localmente (la UI responde al
    // instante y nada vuelve a pedir datos con la sesión vieja) y en paralelo
    // se avisa al servidor para que invalide el refresh_token y borre las
    // cookies httpOnly. Sin esa segunda parte, recargar restauraba la sesión.
    queryClient.clear()
    limpiar()
    navigate('/login', { replace: true })
    void authApi.logout()
  }, [queryClient, limpiar, navigate])
}
