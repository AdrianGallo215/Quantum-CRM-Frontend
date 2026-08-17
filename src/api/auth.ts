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
   * Cierra la sesión en el servidor: revoca el refresh token e invalida ambas
   * cookies httpOnly (contrato §6, `POST /auth/logout`).
   *
   * El endpoint es idempotente y responde `204` con o sin sesión válida — nunca
   * 401. Eso hace que un fallo aquí solo pueda ser de red, y que importe: si la
   * petición no llega, las cookies siguen vivas en el navegador y el usuario
   * cree haber cerrado sesión sin haberlo hecho. En una PC compartida eso es
   * exactamente el problema que este endpoint vino a resolver.
   *
   * Por eso el error se propaga en vez de tragarse: el llamador decide qué
   * decirle al usuario.
   */
  logout: async (): Promise<void> => {
    await post('/auth/logout')
  },

  me: async (): Promise<Empleado> => {
    const res = await get<Empleado>('/empleados/me')
    return res.data
  },
}
