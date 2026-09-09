import { get, post } from './client'
import type {
  Actividad,
  ActividadesFiltros,
  ApiResponse,
  CambioAuditoria,
  ComentarioActividad,
  CrearComentarioInput,
  TipoActividad,
} from '@/types'

/**
 * Módulo de actividades (informe `informe_frontend_historial_actividades.md`).
 *
 * `{tipo}` va SIEMPRE en minúscula y singular (`tarea` | `evento`); cualquier
 * otro valor devuelve 400 VALIDACION_ERROR. Por eso el parámetro está tipado
 * como `TipoActividad` y no como `string`: el compilador impide construir la URL
 * mal.
 */
export const actividadesApi = {
  /**
   * Historial unificado. Devuelve el ENVELOPE completo, no solo `data`: es el
   * único endpoint paginado del módulo y la pantalla necesita `meta.total` y
   * `meta.total_pages` para la paginación (informe §13.6).
   */
  listar: async (filtros: ActividadesFiltros): Promise<ApiResponse<Actividad[]>> => {
    return get<Actividad[]>('/actividades', filtros as unknown as Record<string, unknown>)
  },

  /** Todos los comentarios de una actividad, en orden cronológico ASC. Sin paginar. */
  comentarios: async (tipo: TipoActividad, id: number): Promise<ComentarioActividad[]> => {
    const res = await get<ComentarioActividad[]>(`/actividades/${tipo}/${id}/comentarios`)
    return res.data
  },

  /** Crea un comentario (201). El autor lo resuelve el backend desde el token. */
  crearComentario: async (
    tipo: TipoActividad,
    id: number,
    input: CrearComentarioInput,
  ): Promise<ComentarioActividad> => {
    const res = await post<ComentarioActividad>(`/actividades/${tipo}/${id}/comentarios`, input)
    return res.data
  },

  /** Cambios campo a campo, del más reciente al más antiguo. Sin paginar. */
  auditoria: async (tipo: TipoActividad, id: number): Promise<CambioAuditoria[]> => {
    const res = await get<CambioAuditoria[]>(`/actividades/${tipo}/${id}/auditoria`)
    return res.data
  },
}
