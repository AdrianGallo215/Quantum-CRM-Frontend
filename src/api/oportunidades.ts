import { get, post, put, patch, del } from './client'
import type {
  ActualizarItemInput,
  ActualizarOportunidadInput,
  ApiResponse,
  CambioEstadoInput,
  CambioEstadoResponse,
  CrearOportunidadInput,
  Oportunidad,
  OportunidadDetalle,
  OportunidadItem,
  OportunidadLogEntry,
  OportunidadesFiltros,
} from '@/types'

export const oportunidadesApi = {
  listar: async (filtros?: OportunidadesFiltros): Promise<ApiResponse<Oportunidad[]>> => {
    return get<Oportunidad[]>('/oportunidades', filtros as Record<string, unknown>)
  },

  obtener: async (id: number): Promise<OportunidadDetalle> => {
    const res = await get<OportunidadDetalle>(`/oportunidades/${id}`)
    return res.data
  },

  crear: async (input: CrearOportunidadInput): Promise<OportunidadDetalle> => {
    // monto_total NUNCA se envía — lo calcula el backend.
    const res = await post<OportunidadDetalle>('/oportunidades', input)
    return res.data
  },

  /**
   * Solo garantía, financiamiento paralelo, ficha, notas y fecha estimada.
   * Los términos comerciales (modelo, cantidad, precio, descuento) se editan por
   * `actualizarItem` desde V42 — este endpoint los descarta en silencio.
   */
  actualizar: async (id: number, input: ActualizarOportunidadInput): Promise<OportunidadDetalle> => {
    const res = await put<OportunidadDetalle>(`/oportunidades/${id}`, input)
    return res.data
  },

  /**
   * Edita un ítem (un modelo vendido). `PUT /oportunidades/:id` ya NO acepta estos
   * campos: los ignora en silencio y el usuario cree que guardó (contrato §10).
   *
   * OJO: la respuesta trae `cuota_quantum` y `cuota_total` SIEMPRE en `null` —
   * este endpoint no las resuelve. Por eso quien llame debe invalidar y repedir
   * la oportunidad en vez de escribir esta respuesta en la cache.
   */
  actualizarItem: async (
    id: number,
    idItem: number,
    input: ActualizarItemInput,
  ): Promise<OportunidadItem> => {
    const res = await put<OportunidadItem>(`/oportunidades/${id}/items/${idItem}`, input)
    return res.data
  },

  cambiarEstado: async (id: number, input: CambioEstadoInput): Promise<CambioEstadoResponse> => {
    const res = await patch<CambioEstadoResponse>(`/oportunidades/${id}/estado`, input)
    return res.data
  },

  traspasar: async (id: number, id_vendedor: number): Promise<void> => {
    await patch(`/oportunidades/${id}/vendedor`, { id_vendedor })
  },

  log: async (id: number): Promise<OportunidadLogEntry[]> => {
    const res = await get<OportunidadLogEntry[]>(`/oportunidades/${id}/log`)
    return res.data
  },

  vincularContacto: async (
    id: number,
    input: { id_contacto: number; rol_en_oportunidad: string },
  ): Promise<void> => {
    await post(`/oportunidades/${id}/contactos`, input)
  },

  actualizarRolContacto: async (
    id: number,
    idContacto: number,
    rol_en_oportunidad: string,
  ): Promise<void> => {
    await put(`/oportunidades/${id}/contactos/${idContacto}`, { rol_en_oportunidad })
  },

  desvincularContacto: async (id: number, idContacto: number): Promise<void> => {
    await del(`/oportunidades/${id}/contactos/${idContacto}`)
  },

  eliminar: async (id: number): Promise<void> => {
    await del(`/oportunidades/${id}`)
  },
}
