import { get, post, patch, del } from './client'
import type {
  ActualizarSimulacionInput,
  ApiResponse,
  BifurcarSimulacionInput,
  CrearSimulacionInput,
  Cronograma,
  EventoHistorial,
  Simulacion,
  SimulacionesFiltros,
} from '@/types'

export const simulacionesApi = {
  crear: async (input: CrearSimulacionInput): Promise<Simulacion> => {
    const res = await post<Simulacion>('/simulaciones', input)
    return res.data
  },

  listar: async (filtros?: SimulacionesFiltros): Promise<ApiResponse<Simulacion[]>> => {
    return get<Simulacion[]>('/simulaciones', filtros as Record<string, unknown>)
  },

  obtener: async (id: number): Promise<Simulacion> => {
    const res = await get<Simulacion>(`/simulaciones/${id}`)
    return res.data
  },

  /** Cronograma completo, recalculado al vuelo — nunca se persiste (§23). */
  cronograma: async (id: number): Promise<Cronograma> => {
    const res = await get<Cronograma>(`/simulaciones/${id}/cronograma`)
    return res.data
  },

  /**
   * Solo toca los campos que vienen en el body. `modo` NO se incluye en el tipo
   * de input: un PATCH que intente cambiarlo responde `409 MODO_INMUTABLE` — la
   * única vía autorizada para cambiar de modo es `bifurcar`.
   */
  actualizar: async (id: number, input: ActualizarSimulacionInput): Promise<Simulacion> => {
    const res = await patch<Simulacion>(`/simulaciones/${id}`, input)
    return res.data
  },

  /** 204 sin body: elimina definitivamente (evento `eliminada` en la bitácora). */
  eliminar: async (id: number): Promise<void> => {
    await del(`/simulaciones/${id}`)
  },

  /**
   * Ventana de 7 días / 15 versiones, no la bitácora completa. `diff` vacío es
   * legítimo: primer evento de la simulación, o un PATCH que no tocó ninguno de
   * los 10 parámetros del snapshot (§23).
   */
  historial: async (id: number): Promise<EventoHistorial[]> => {
    const res = await get<EventoHistorial[]>(`/simulaciones/${id}/historial`)
    return res.data
  },

  /**
   * El 404 acá cubre CUATRO motivos (no existe, no es de esta simulación, fuera de
   * la ventana de 7 días/15 versiones, o tipo no restaurable) y el backend NO
   * distingue cuál falló, a propósito. El mensaje al usuario debe ser genérico:
   * "esa versión ya no se puede restaurar" (encargo §9).
   */
  restaurar: async (id: number, idEventoLog: number): Promise<Simulacion> => {
    const res = await post<Simulacion>(`/simulaciones/${id}/restaurar`, {
      id_evento_log: idEventoLog,
    })
    return res.data
  },

  /**
   * "Guardar como Nueva Simulación". ÚNICA vía autorizada para cambiar de `modo`:
   * acá sí se aplica y nunca responde 409 (§23). Crea una fila nueva; el origen
   * queda intacto y no recibe evento propio.
   * `nombre` NO se hereda del origen: dos simulaciones no pueden compartir título
   * autogenerado.
   */
  bifurcar: async (id: number, input: BifurcarSimulacionInput): Promise<Simulacion> => {
    const res = await post<Simulacion>(`/simulaciones/${id}/bifurcar`, input)
    return res.data
  },

  /**
   * Marca como principal de su ítem. Body VACÍO.
   * Sin ítem responde `400 VALIDACION` (no puede ser principal sin ítem).
   * Ya principal es un NO-OP EXITOSO, no un error (§23) — no lo trates como fallo.
   */
  marcarPrincipal: async (id: number): Promise<Simulacion> => {
    const res = await patch<Simulacion>(`/simulaciones/${id}/principal`)
    return res.data
  },
}
