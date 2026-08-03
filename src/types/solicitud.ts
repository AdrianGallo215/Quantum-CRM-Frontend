import type { EmpleadoResumen } from './empleado'
import type { PaginationParams } from './common'

export type TipoSolicitud = 'descuento' | 'reasignacion_cliente'
export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'denegada'
export type EntidadSolicitud = 'oportunidad' | 'empresa'
export type RolAprobador = 'jdv' | 'gerencia'

export interface Solicitud {
  id: number
  tipo: TipoSolicitud
  estado: EstadoSolicitud
  rol_aprobador: RolAprobador
  entidad_tipo: EntidadSolicitud
  entidad_id: number
  entidad_descripcion: string
  dcto_solicitado: string | null
  id_vendedor_nuevo: number | null
  vendedor_nuevo: EmpleadoResumen | null
  motivo: string
  solicitante: EmpleadoResumen
  resolutor: EmpleadoResumen | null
  motivo_resolucion: string | null
  resolved_at: string | null
  created_at: string
}

export interface CrearSolicitudDescuentoInput {
  tipo: 'descuento'
  entidad_tipo: 'oportunidad'
  entidad_id: number
  /** String con 2 decimales, igual que el resto de montos del contrato: "5.00" */
  dcto_solicitado: string
  motivo: string
}

export interface CrearSolicitudReasignacionInput {
  tipo: 'reasignacion_cliente'
  entidad_tipo: 'empresa'
  entidad_id: number
  id_vendedor_nuevo: number
  motivo: string
}

export type CrearSolicitudInput =
  | CrearSolicitudDescuentoInput
  | CrearSolicitudReasignacionInput

export interface SolicitudesFiltros extends PaginationParams {
  estado?: EstadoSolicitud
  tipo?: TipoSolicitud
  /** true fuerza "solo las que yo creé" (útil para jdv) */
  mias?: boolean
}
