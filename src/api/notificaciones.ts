import { get, patch } from './client'
import type { Notificacion } from '@/types'

export const notificacionesApi = {
  contarNoLeidas: async (): Promise<number> => {
    const res = await get<{ count: number }>('/notificaciones/no-leidas/count')
    return res.data.count
  },

  listar: async (): Promise<Notificacion[]> => {
    const res = await get<Notificacion[]>('/notificaciones')
    return res.data
  },

  marcarLeida: async (id: number): Promise<void> => {
    await patch(`/notificaciones/${id}/leida`, {})
  },

  marcarTodasLeidas: async (): Promise<void> => {
    await patch('/notificaciones/leidas', {})
  },
}
