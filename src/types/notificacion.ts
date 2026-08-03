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

export type EntidadNotificacion = 'oportunidad' | 'empresa' | 'solicitud' | 'meta'

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
