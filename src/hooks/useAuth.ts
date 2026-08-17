import { useCallback, useEffect } from 'react'
import { App } from 'antd'
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
  const { message } = App.useApp()

  return useCallback(() => {
    // El orden importa: primero se cierra localmente (la UI responde al
    // instante y nada vuelve a pedir datos con la sesión vieja) y en paralelo
    // se avisa al servidor para que revoque el refresh_token y borre las
    // cookies httpOnly. Sin esa segunda parte, recargar restauraba la sesión.
    queryClient.clear()
    limpiar()
    navigate('/login', { replace: true })

    // El endpoint es idempotente y nunca responde 401, así que llegar aquí
    // significa que la petición no salió. Las cookies siguen vivas: el usuario
    // tiene que saberlo, sobre todo si está en un equipo compartido.
    authApi.logout().catch(() => {
      message.warning(
        'Cerramos la sesión en este equipo, pero no pudimos avisar al servidor. Si estás en una PC compartida, reintenta cuando vuelva la conexión.',
      )
    })
  }, [queryClient, limpiar, navigate, message])
}
