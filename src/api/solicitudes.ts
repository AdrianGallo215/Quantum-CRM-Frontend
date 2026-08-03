import { get, post, patch } from './client'
import type { ApiResponse, CrearSolicitudInput, Solicitud, SolicitudesFiltros } from '@/types'

export const solicitudesApi = {
  listar: async (filtros?: SolicitudesFiltros): Promise<ApiResponse<Solicitud[]>> => {
    return get<Solicitud[]>('/solicitudes', filtros as Record<string, unknown>)
  },

  obtener: async (id: number): Promise<Solicitud> => {
    const res = await get<Solicitud>(`/solicitudes/${id}`)
    return res.data
  },

  crear: async (input: CrearSolicitudInput): Promise<Solicitud> => {
    const res = await post<Solicitud>('/solicitudes', input)
    return res.data
  },

  /** Aprueba y APLICA el cambio en la misma transacción (contrato §4.4). Body vacío. */
  aprobar: async (id: number): Promise<Solicitud> => {
    const res = await patch<Solicitud>(`/solicitudes/${id}/aprobar`, {})
    return res.data
  },

  /** Deniega; el motivo es obligatorio (contrato §4.5). */
  denegar: async (id: number, motivo: string): Promise<Solicitud> => {
    const res = await patch<Solicitud>(`/solicitudes/${id}/denegar`, { motivo })
    return res.data
  },
}
