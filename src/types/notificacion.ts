import type { EmpleadoResumen } from './empleado'

export type TipoNotificacion =
  | 'oportunidad_cambio_estado'
  | 'empresa_convertida'
  | 'evento_creado'
  | 'tarea_creada'
  | 'tarea_colaborador_agregado'
  | 'empresa_asignada'
  | 'oportunidad_traspasada'
  | 'tarea_recordatorio'
  | 'evento_recordatorio'
  | 'solicitud_creada'
  | 'solicitud_aprobada'
  | 'solicitud_denegada'
  | 'meta_propuesta'
  | 'meta_aprobada'
  | 'meta_rechazada'
  | 'meta_modificada'
  /**
   * Aviso 3 días antes de que una simulación huérfana se purgue a los 30 días
   * (contrato §26, changelog 2026-09-07, `reglas_simulaciones.md` §5).
   */
  | 'simulacion_por_expirar'

/** `entidad_notificacion_enum` del contrato §26. Es `meta_venta`, NO `meta`. */
export type EntidadNotificacion = 'oportunidad' | 'empresa' | 'solicitud' | 'meta_venta' | 'simulacion'

export interface Notificacion {
  id: number
  tipo: TipoNotificacion
  mensaje: string
  entidad_tipo: EntidadNotificacion
  entidad_id: number
  leida: boolean
  created_at: string
  actor: EmpleadoResumen | null
}
