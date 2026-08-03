import { post, get } from './client'
import type { Empleado, LoginResponse } from '@/types'

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await post<LoginResponse>('/auth/login', { email, password })
    return res.data
  },

  // El refresh_token viaja en cookie httpOnly; el body va vacío a propósito.
  refresh: async (): Promise<void> => {
    await post('/auth/refresh', {})
  },

  /**
   * Cierra la sesión en el servidor para que invalide el refresh_token y borre
   * las cookies httpOnly.
   *
   * ⚠️ IMPORTANTE: sin esta llamada, "cerrar sesión" solo limpiaba el estado
   * del cliente y la cookie seguía viva — bastaba recargar para volver a entrar
   * (GET /empleados/me responde con la cookie intacta). En PCs compartidas eso
   * es una sesión que no se cierra nunca.
   *
   * El endpoint aún no figura en contrato_api.md §6: si el backend responde 404
   * tragamos el error para no bloquear el cierre local, pero la cookie seguirá
   * viva hasta expirar. Solicitado al equipo de backend — al publicarse, esta
   * función ya queda conectada sin más cambios.
   */
  logout: async (): Promise<void> => {
    try {
      await post('/auth/logout', {})
    } catch {
      // El cierre local se hace igual: nunca dejar al usuario "dentro".
    }
  },

  me: async (): Promise<Empleado> => {
    const res = await get<Empleado>('/empleados/me')
    return res.data
  },
}
